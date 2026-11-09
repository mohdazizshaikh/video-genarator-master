import { observeWorker } from "./WorkerHealth";
import { Worker, Job, DelayedError, UnrecoverableError } from "bullmq";
import type { Config } from "../config";
import { PublishJobStore } from "../db/PublishJobStore";
import { PublishExecutionStore, type PublishBinding } from "../db/PublishExecutionStore";
import { ReleaseStore } from "../db/ReleaseStore";
import { ConnectorStore } from "../db/ConnectorStore";
import { ConnectorSecretStore } from "../db/ConnectorSecretStore";
import { JobEventStore } from "../db/JobEventStore";
import { JobEventOutboxStore } from "../db/JobEventOutboxStore";
import { JobLifecycleEventService } from "../services/JobLifecycleEventService";
import { ReleaseAuthorization } from "../services/ReleaseAuthorization";
import { PublishDeliveryService, PublicationReconciliationError } from "../services/PublishDeliveryService";
import { WorkerTaskDrain } from "./WorkerTaskDrain";
import { logger } from "../logger";
import { getRedisConnection, QUEUE_NAMES } from "./QueueManager";
import { isTerminalAttempt } from "./attemptBudget";
import type { PlatformType } from "../types/shorts";
import { enforcePlatformMetadataLimits, validatePublishPayload } from "../publishers/PlatformLimits";
import { CONFIG_SECRET_FIELDS, PublishFailureError, collectSecretValues, sanitizeProviderMessage, toPublishFailureError } from "../publishers/failureClassification";

export interface PublishJobPayload {
  tenantId?: string;
  publishJobId: string;
  renderOutputPath: string;
  platform: PlatformType;
  channelId: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  language: string;
  thumbnailPath?: string;
  scheduleAt?: string;
  accountId?: string;
  releaseTargetId?: string;
  connectorId?: string;
  destinationId?: string;
  rateLimitDefers?: number;
}
const MAX_RATE_LIMIT_DEFERS = 2;

export class PublishWorker {
  private worker: Worker;
  private health: ReturnType<typeof observeWorker>;
  private eventTasks = new WorkerTaskDrain("publish");
  private publishJobStore: PublishJobStore;
  private lifecycleEvents: JobLifecycleEventService;
  private releaseStore: ReleaseStore;
  private connectorStore: ConnectorStore;
  private connectorSecrets?: ConnectorSecretStore;
  private configSecretValues: string[];
  private delivery: PublishDeliveryService;
  private executions: PublishExecutionStore;

  constructor(private config: Config) {
    this.publishJobStore = new PublishJobStore(config.dataDirPath);
    this.releaseStore = new ReleaseStore(config.dataDirPath);
    this.connectorStore = new ConnectorStore(config.dataDirPath);
    this.delivery = new PublishDeliveryService(config.dataDirPath);
    this.executions = this.delivery.executions;
    this.configSecretValues = collectSecretValues(config as unknown as Record<string, unknown>, CONFIG_SECRET_FIELDS);
    if (process.env.TENANT_KEYS_SECRET?.trim()) this.connectorSecrets = new ConnectorSecretStore(config.dataDirPath, process.env.TENANT_KEYS_SECRET);
    this.lifecycleEvents = new JobLifecycleEventService(new JobEventStore(config.dataDirPath), new JobEventOutboxStore(config.dataDirPath));
    const concurrency = Math.max(1, config.publishWorkerConcurrency || 3);
    this.worker = new Worker(QUEUE_NAMES.PUBLISH, (job: Job<PublishJobPayload>, token?: string) => this.processJob(job, token), { connection: getRedisConnection(config), concurrency, stalledInterval: 30000 });
    this.health = observeWorker(this.worker, "publish", "Publish Worker", QUEUE_NAMES.PUBLISH, Math.max(1, config.publishWorkerConcurrency || 3), () => getRedisConnection(config).status === "ready");
    this.worker.on("completed", (job) => this.eventTasks.track(() => {
      if (!job.data.tenantId) return;
      const target = job.data.releaseTargetId ? this.releaseStore.getTarget(job.data.tenantId, job.data.releaseTargetId) : undefined;
      this.lifecycleEvents.emit({ tenantId: job.data.tenantId, jobId: job.data.publishJobId, type: "completed", attempt: target?.attempts ?? job.attemptsMade ?? 0, payload: { queueJobId: job.id, platform: job.data.platform } });
    }));
    this.worker.on("failed", (job, error) => this.eventTasks.track(() => this.failed(job, error)));
    logger.info({ concurrency }, "PublishWorker started");
  }

  private binding(data: PublishJobPayload): PublishBinding {
    if (!data.tenantId || !data.releaseTargetId || !data.connectorId || !data.destinationId) throw new UnrecoverableError("Approved workspace release target is required");
    const target = this.releaseStore.getTarget(data.tenantId, data.releaseTargetId);
    if (!target || target.connectorId !== data.connectorId || target.destinationId !== data.destinationId) throw new UnrecoverableError("Release target identity mismatch");
    const release = this.releaseStore.getRelease(data.tenantId, target.releaseId);
    if (!release?.approvedContent) throw new UnrecoverableError("Bound release approval is required");
    return { tenantId: data.tenantId, targetId: target.id, releaseId: target.releaseId, connectorId: target.connectorId, destinationId: target.destinationId, platform: data.platform, contentDigest: release.approvedContent.contentDigest };
  }

  private async deferUntilDue(job: Job<PublishJobPayload>, token: string | undefined, scheduleAt: string | null | undefined): Promise<void> {
    if (!scheduleAt) return;
    const due = Date.parse(scheduleAt);
    if (!Number.isFinite(due)) {
      job.discard();
      throw new PublishFailureError({ code: "payload_rejected", retryable: false, message: "Invalid publish due time" });
    }
    if (due > Date.now()) {
      if (!token) throw new Error("Scheduled publishing requires a queue execution token");
      await job.moveToDelayed(due, token);
      throw new DelayedError();
    }
  }

  private async processJob(job: Job<PublishJobPayload>, token?: string): Promise<void> {
    await this.deferUntilDue(job, token, job.data.scheduleAt);
    const { tenantId, publishJobId, platform } = job.data;
    if (!tenantId) throw new UnrecoverableError("Publish job requires an authenticated workspace");
    const stored = await this.publishJobStore.getJobForTenant(tenantId, publishJobId);
    if (!stored || stored.releaseTargetId !== job.data.releaseTargetId || stored.connectorId !== job.data.connectorId || stored.destinationId !== job.data.destinationId || stored.platform !== platform) throw new UnrecoverableError("Owned publish job binding is required");
    await this.deferUntilDue(job, token, stored.scheduleAt);
    const binding = this.binding(job.data);
    let secrets = this.configSecretValues;
    try {
      // Receipt replay precedes artifact/credential checks: an already accepted
      // publication remains a fact even if a token expires or media is removed.
      if (await this.delivery.recover(binding, publishJobId)) return;
      new ReleaseAuthorization(this.config.dataDirPath).authorizeDestination(tenantId, binding.releaseId, binding.connectorId, binding.destinationId);
      const authorized = new ReleaseAuthorization(this.config.dataDirPath).authorize(tenantId, binding.releaseId);
      const connector = this.connectorStore.getConnector(tenantId, binding.connectorId);
      const connectorPlatform = connector?.platform === "twitter" ? "x" : connector?.platform;
      if (!connector || connectorPlatform !== platform || connector.status !== "connected") throw new PublishFailureError({ code: "permission_denied", retryable: false, message: "Connected workspace connector is unavailable" });
      const destination = this.connectorStore.listDestinations(tenantId, connector.id).find((row) => row.id === binding.destinationId && row.status === "verified");
      if (!destination) throw new PublishFailureError({ code: "permission_denied", retryable: false, message: "Verified workspace destination is unavailable" });
      const credentials = this.connectorSecrets?.get(tenantId, connector.id);
      if (!credentials || !Object.keys(credentials).length) throw new PublishFailureError({ code: "credentials_invalid", retryable: false, message: "Workspace connector credentials are unavailable" });
      secrets = [...secrets, ...collectSecretValues(credentials)];
      const { createPublisherForAccount } = await import("../publishers/PublisherFactory.js");
      const publisher = createPublisherForAccount(platform, this.config, { ...credentials, ...(platform === "telegram" ? { channelId: destination.externalDestinationId } : {}) });
      if (!await publisher.validateCredentials()) throw new PublishFailureError({ code: "credentials_invalid", retryable: false, message: "Publisher credentials are invalid" });
      const raw = { videoFilePath: authorized.localPath, title: authorized.snapshot.title, description: authorized.snapshot.description, tags: authorized.snapshot.tags, category: authorized.snapshot.category, language: authorized.snapshot.language, scheduleAt: undefined };
      const validation = validatePublishPayload(platform, raw);
      if (!validation.valid) throw new PublishFailureError({ code: "payload_rejected", retryable: false, message: "Approved content exceeds platform publishing limits" });
      const params = enforcePlatformMetadataLimits(platform, raw);
      await job.updateProgress(30);
      // Credential verification/progress are asynchronous; recheck approval
      // immediately before claiming a provider request.
      new ReleaseAuthorization(this.config.dataDirPath).authorizeDestination(tenantId, binding.releaseId, binding.connectorId, binding.destinationId);
      const receipt = await this.delivery.deliver(binding, publishJobId, () => {
        const execution = this.executions.get(tenantId, binding.targetId)!;
        this.lifecycleEvents.emit({ tenantId, jobId: publishJobId, type: "publishing", attempt: execution.attempt, payload: { providerRequestId: execution.requestId } });
        return publisher.uploadVideo(params);
      }, secrets);
      await job.updateProgress(100).catch(() => logger.warn({ publishJobId }, "Publication confirmed but progress telemetry failed"));
      logger.info({ publishJobId, platform, externalId: receipt.externalId }, "Publication receipt confirmed");
    } catch (error) {
      const checkpoint = this.executions.get(tenantId, binding.targetId);
      if (checkpoint?.state === "accepted") throw error; // Repairable projection failure; never upload again.
      if (error instanceof PublicationReconciliationError || checkpoint?.state === "dispatching" || checkpoint?.state === "reconciling") {
        job.discard();
        throw new UnrecoverableError("Publication outcome requires reconciliation; automatic upload retry is blocked");
      }
      const classified = toPublishFailureError(error, secrets);
      const failure = new PublishFailureError({ code: classified.code, retryable: classified.retryable, retryAfterMs: classified.retryAfterMs, message: sanitizeProviderMessage(classified.message, secrets) });
      const target = this.releaseStore.getTarget(tenantId, binding.targetId);
      if (failure.retryable && target?.status !== "published") this.releaseStore.updateTarget(tenantId, binding.targetId, { status: "retryable", lastErrorCode: failure.code });
      await this.publishJobStore.addAttempt({ publishJobId, attemptNumber: checkpoint?.attempt ?? (job.attemptsMade ?? 0) + 1, status: "failed", responseBody: `${failure.code}: ${failure.message}` });
      if (!failure.retryable) { job.discard(); throw failure; }
      const defers = job.data.rateLimitDefers ?? 0;
      if (failure.code === "rate_limited" && failure.retryAfterMs && token && defers < MAX_RATE_LIMIT_DEFERS && !isTerminalAttempt(job.attemptsMade ?? 0, job.opts.attempts)) {
        const due = Date.now() + failure.retryAfterMs;
        const scheduleAt = new Date(due).toISOString();
        await this.publishJobStore.updateJobStatusForTenant(tenantId, publishJobId, "scheduled", { scheduleAt, error: failure.message });
        await job.updateData({ ...job.data, rateLimitDefers: defers + 1, scheduleAt });
        await job.moveToDelayed(due, token);
        throw new DelayedError();
      }
      throw failure;
    }
  }

  private async failed(job: Job<PublishJobPayload> | undefined, error: Error): Promise<void> {
    if (!job?.data.tenantId) return;
    const { tenantId, publishJobId } = job.data;
    const stored = await this.publishJobStore.getJobForTenant(tenantId, publishJobId);
    if (!stored || !stored.releaseTargetId || stored.releaseTargetId !== job.data.releaseTargetId || stored.connectorId !== job.data.connectorId || stored.destinationId !== job.data.destinationId || stored.platform !== job.data.platform) return;
    const binding = this.binding(job.data);
    const checkpoint = this.executions.get(tenantId, binding.targetId);
    if (checkpoint?.state === "accepted" || checkpoint?.state === "dispatching" || checkpoint?.state === "reconciling" || this.releaseStore.getTarget(tenantId, binding.targetId)?.status === "reconciling") {
      try { await this.delivery.recover(binding, publishJobId); }
      catch (failure) { if (!(failure instanceof PublicationReconciliationError)) throw failure; }
      this.lifecycleEvents.emit({ tenantId, jobId: publishJobId, type: checkpoint?.state === "accepted" ? "completed" : "reconciling", attempt: checkpoint?.attempt ?? job.attemptsMade ?? 0 });
      return;
    }
    const target = this.releaseStore.getTarget(tenantId, binding.targetId);
    if (target?.status === "cancelled") {
      await this.publishJobStore.updateJobStatusForTenant(tenantId, publishJobId, "skipped", { error: "Release target was cancelled" });
      return;
    }
    if (target?.status === "published") return;
    const failure = toPublishFailureError(error, this.configSecretValues);
    const terminal = error instanceof UnrecoverableError || !failure.retryable || isTerminalAttempt(job.attemptsMade ?? 0, job.opts.attempts);
    await this.publishJobStore.incrementAttemptForTenant(tenantId, publishJobId);
    this.lifecycleEvents.emit({ tenantId, jobId: publishJobId, type: "failed", attempt: checkpoint?.attempt ?? job.attemptsMade ?? 0, payload: { code: failure.code, terminal } });
    if (terminal) {
      const { createQueue } = await import("./QueueManager.js");
      await createQueue(QUEUE_NAMES.DEADLETTER, this.config).add("publish-deadletter", { type: "publish", jobId: publishJobId, originalQueue: QUEUE_NAMES.PUBLISH, failReason: failure.message, failureCode: failure.code, attemptsMade: job.attemptsMade ?? 0, originalJobData: job.data });
      this.releaseStore.updateTarget(tenantId, binding.targetId, { status: "failed", lastErrorCode: failure.code, retryDisposition: checkpoint?.state === "rejected" ? "not_accepted" : "not_dispatched" });
    }
    await this.publishJobStore.updateJobStatusForTenant(tenantId, publishJobId, "failed", { error: failure.message });
  }

  async pause(): Promise<void> { this.health.pause(); await this.worker.pause(true); }
  async close(): Promise<void> { await this.worker.close(); await this.eventTasks.drain(); }
}
