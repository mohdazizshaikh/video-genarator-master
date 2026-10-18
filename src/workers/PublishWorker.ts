/**
 * PublishWorker – Phase 4.1 / 5.1
 *
 * BullMQ worker that processes publish_queue jobs.
 * Concurrency = 3 (different platforms can run in parallel).
 * Retries up to 2 times with exponential backoff, then deadletter.
 */
import { Worker, Job, DelayedError } from "bullmq";
import { Config } from "../config";
import { PublishJobStore } from "../db/PublishJobStore";
import { ReleaseStore } from "../db/ReleaseStore";
import { ConnectorStore } from "../db/ConnectorStore";
import { ConnectorSecretStore } from "../db/ConnectorSecretStore";
import { JobEventStore } from "../db/JobEventStore";
import { JobEventOutboxStore } from "../db/JobEventOutboxStore";
import { JobLifecycleEventService } from "../services/JobLifecycleEventService";
import { logger } from "../logger";
import { getRedisConnection, QUEUE_NAMES } from "./QueueManager";
import { isTerminalAttempt } from "./attemptBudget";
import type { PlatformType } from "../types/shorts";
import { enforcePlatformMetadataLimits, validatePublishPayload } from "../publishers/PlatformLimits";
import {
  CONFIG_SECRET_FIELDS,
  PublishFailureError,
  classifyFailure,
  collectSecretValues,
  sanitizeProviderMessage,
  toPublishFailureError,
} from "../publishers/failureClassification";

export interface PublishJobPayload {
  /** Auth-derived tenant owner; legacy jobs without this field cannot access accounts. */
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
  /** Optional profile account id. Legacy compatibility path only. */
  accountId?: string;
  /** Target identity for the approved workspace-owned release path. */
  releaseTargetId?: string;
  connectorId?: string;
  destinationId?: string;
  /** Bounded count of provider rate-limit deferrals already used (P1-03). */
  rateLimitDefers?: number;
}

// Retry terminality follows the shared contract in `attemptBudget.ts`.

/**
 * How many times a provider rate-limit (429 + retry-after) may defer a job
 * instead of consuming its BullMQ attempt budget. Bounded so a provider that
 * keeps rate-limiting cannot postpone a job indefinitely.
 */
const MAX_RATE_LIMIT_DEFERS = 2;

export class PublishWorker {
  private worker: Worker;
  private publishJobStore: PublishJobStore;
  private lifecycleEvents: JobLifecycleEventService;
  private releaseStore: ReleaseStore;
  private connectorStore: ConnectorStore;
  private connectorSecrets?: ConnectorSecretStore;
  /** Provider secrets from global config; used to redact operator-facing failure messages. */
  private readonly configSecretValues: string[];

  constructor(private config: Config) {
    this.publishJobStore = new PublishJobStore(config.dataDirPath);
    this.releaseStore = new ReleaseStore(config.dataDirPath);
    this.connectorStore = new ConnectorStore(config.dataDirPath);
    this.configSecretValues = collectSecretValues(config as unknown as Record<string, unknown>, CONFIG_SECRET_FIELDS);
    const connectorSecret = process.env.TENANT_KEYS_SECRET || "";
    if (connectorSecret.trim()) this.connectorSecrets = new ConnectorSecretStore(config.dataDirPath, connectorSecret);
    this.lifecycleEvents = new JobLifecycleEventService(new JobEventStore(config.dataDirPath), new JobEventOutboxStore(config.dataDirPath));

    const publishConcurrency = Math.max(1, this.config.publishWorkerConcurrency || 3);
    // Phase 4.9: configurable worker scaling
    this.worker = new Worker(
      QUEUE_NAMES.PUBLISH,
      async (job: Job<PublishJobPayload>, token?: string) => this.processJob(job, token),
      {
        connection: getRedisConnection(config),
        concurrency: publishConcurrency,
        stalledInterval: 30000,
      },
    );

    this.worker.on("completed", (job) => {
      const target = job.data.releaseTargetId && job.data.tenantId
        ? this.releaseStore.getTarget(job.data.tenantId, job.data.releaseTargetId)
        : undefined;
      this.lifecycleEvents.emit({ tenantId: job.data.tenantId, jobId: job.data.publishJobId, type: "completed", attempt: target?.attempts ?? (job.attemptsMade ?? 0), payload: { queueJobId: job.id, platform: job.data.platform } });
      logger.info(
        { jobId: job.id, publishJobId: job.data.publishJobId, platform: job.data.platform },
        "Publish job completed",
      );
    });

    this.worker.on("failed", async (job, err) => {
      if (!job) return;
      const { publishJobId } = job.data;
      const attemptsMade = job.attemptsMade ?? 0;
      // Terminal when the BullMQ attempt budget is exhausted OR the failure is
      // classified as non-retryable (invalid credentials, lost permissions,
      // rejected payload) — the latter is discarded in `processJob` so no
      // further attempts are scheduled.
      const failure = toPublishFailureError(err, this.configSecretValues);
      const budgetExhausted = isTerminalAttempt(attemptsMade, job.opts.attempts);
      const terminal = budgetExhausted || !failure.retryable;
      const failedTarget = job.data.releaseTargetId && job.data.tenantId
        ? this.releaseStore.getTarget(job.data.tenantId, job.data.releaseTargetId)
        : undefined;
      this.lifecycleEvents.emit({ tenantId: job.data.tenantId, jobId: publishJobId, type: "failed", attempt: failedTarget?.attempts ?? attemptsMade, payload: { error: failure.message, code: failure.code, terminal } });

      await this.publishJobStore.incrementAttemptForTenant(job.data.tenantId ?? "", publishJobId);
      const record = await this.publishJobStore.getJobForTenant(job.data.tenantId ?? "", publishJobId);
      const attempts = record?.attemptCount ?? 0;

      if (terminal) {
        const { createQueue } = await import("./QueueManager.js");
        const deadletter = createQueue(QUEUE_NAMES.DEADLETTER, this.config);
        await deadletter.add("publish-deadletter", {
          type: "publish",
          jobId: publishJobId,
          originalQueue: QUEUE_NAMES.PUBLISH,
          failReason: failure.message,
          failureCode: failure.code,
          attemptsMade: attemptsMade,
          originalJobData: job.data,
        });

        await this.publishJobStore.updateJobStatusForTenant(job.data.tenantId ?? "", publishJobId, "failed", {
          error: budgetExhausted ? `Max retries exceeded: ${failure.message}` : `Terminal failure (${failure.code}): ${failure.message}`,
          attemptCount: attempts,
        });
        if (job.data.releaseTargetId && job.data.tenantId) {
          await this.releaseStore.updateTarget(job.data.tenantId, job.data.releaseTargetId, {
            status: "failed",
            lastErrorCode: failure.code,
          });
        }
        logger.error(
          { publishJobId, platform: job.data.platform, attempts, failureCode: failure.code, failFast: !failure.retryable && !budgetExhausted, err: failure.message },
          "Publish job moved to dead-letter",
        );
      } else {
        await this.publishJobStore.updateJobStatusForTenant(job.data.tenantId ?? "", publishJobId, "failed", {
          error: failure.message,
          attemptCount: attempts,
        });
        logger.warn(
          { publishJobId, platform: job.data.platform, attemptsMade, maxAttempts: job.opts.attempts ?? 1, failureCode: failure.code, err: failure.message },
          "Publish job failed; BullMQ retry scheduled",
        );
      }
    });

    logger.info("PublishWorker started (concurrency=3)");
  }

  private async processJob(job: Job<PublishJobPayload>, token?: string): Promise<void> {
    const { publishJobId, platform, channelId } = job.data;
    const tenantId = job.data.tenantId;
    if (!tenantId) throw new Error("Publish job requires an authenticated workspace");
    let jobSecrets = this.configSecretValues;

    let releaseTarget;
    let executionAttempt: number | undefined;
    if (job.data.releaseTargetId) {
      releaseTarget = this.releaseStore.getTarget(tenantId, job.data.releaseTargetId);
      if (!releaseTarget) throw new Error("Release target not found for workspace");
      if (releaseTarget.status === "published") {
        logger.info({ publishJobId, releaseTargetId: releaseTarget.id }, "Release target already published; skipping duplicate worker execution");
        return;
      }
      // The target's publish-start counter is the stable execution number: each
      // worker execution — including a stalled re-delivery after a crash — gets
      // a new value, so lifecycle events are not deduped away by the event
      // store's jobId:type:attempt idempotency key.
      releaseTarget = this.releaseStore.updateTarget(tenantId, releaseTarget.id, { status: "publishing" }) ?? releaseTarget;
      executionAttempt = releaseTarget.attempts;
    }

    logger.info({ jobId: job.id, publishJobId, platform, channelId }, "PublishWorker processing job");

    this.lifecycleEvents.emit({ tenantId: job.data.tenantId, jobId: publishJobId, type: "publishing", attempt: executionAttempt ?? (job.attemptsMade ?? 0) });
    await this.publishJobStore.updateJobStatusForTenant(tenantId, publishJobId, "publishing");
    await job.updateProgress(10);

    // Dynamic import of the right publisher based on platform
    try {
      const { createPublisher } = await import("../publishers/PublisherFactory.js");

      let publisher;
      if (job.data.connectorId) {
        if (!job.data.destinationId) throw new Error("Connector publishing requires a destination");
        const connector = this.connectorStore.getConnector(tenantId, job.data.connectorId);
        if (!connector || connector.platform !== platform || connector.status !== "connected") {
          throw new Error("Connected workspace connector not found or provider mismatch");
        }
        const destination = this.connectorStore.listDestinations(tenantId, connector.id).find((candidate) => candidate.id === job.data.destinationId);
        if (!destination || destination.status !== "verified") throw new Error("Verified workspace destination not found");
        if (!this.connectorSecrets) throw new Error("Workspace connector secret storage is not configured");
        const credentials = this.connectorSecrets.get(tenantId, connector.id);
        if (!credentials || Object.keys(credentials).length === 0) throw new Error("Workspace connector credentials are unavailable");
        jobSecrets = [...this.configSecretValues, ...collectSecretValues(credentials as Record<string, unknown>)];
        const connectorCredentials = {
          ...credentials,
          ...(platform === "telegram" ? { channelId: destination.externalDestinationId } : {}),
        };
        const { createPublisherForAccount } = await import("../publishers/PublisherFactory.js");
        publisher = createPublisherForAccount(platform, this.config, connectorCredentials);
      } else if (job.data.accountId) {
        const { ProfileService } = await import("../services/ProfileService.js");
        const service = new ProfileService(
          this.config.dataDirPath,
          process.env.TENANT_KEYS_SECRET || "",
        );
        const credentials = await service.getAccountCredentials(job.data.tenantId ?? "", job.data.accountId);
        const account = await service.getAccount(job.data.tenantId ?? "", job.data.accountId);
        if (!account || account.provider !== platform) {
          throw new Error(`Account ${job.data.accountId} not found or provider mismatch`);
        }
        if (!credentials || Object.keys(credentials).length === 0) {
          throw new Error(`Account ${job.data.accountId} has no stored credentials`);
        }
        jobSecrets = [...this.configSecretValues, ...collectSecretValues(credentials as Record<string, unknown>)];
        const { createPublisherForAccount } = await import("../publishers/PublisherFactory.js");
        publisher = createPublisherForAccount(platform, this.config, credentials);
      } else {
        publisher = createPublisher(platform, this.config);
      }

      const credentialsValid = await publisher.validateCredentials();
      if (!credentialsValid) {
        // Retrying cannot repair invalid credentials; fail fast to dead-letter
        // so the operator sees the target failed and can rotate the secret.
        throw new PublishFailureError({
          code: "credentials_invalid",
          retryable: false,
          message: sanitizeProviderMessage(`Publisher credentials invalid for platform: ${platform}`, jobSecrets),
        });
      }

      const rawParams = {
        videoFilePath: job.data.renderOutputPath,
        title: job.data.title,
        description: job.data.description,
        tags: job.data.tags,
        category: job.data.category,
        language: job.data.language,
        thumbnailPath: job.data.thumbnailPath,
        scheduleAt: job.data.scheduleAt ? new Date(job.data.scheduleAt) : undefined,
      };

      const payloadValidation = validatePublishPayload(platform, rawParams);
      if (!payloadValidation.valid) {
        throw new PublishFailureError({
          code: "payload_rejected",
          retryable: false,
          message: sanitizeProviderMessage(`Platform limit validation failed: ${payloadValidation.errors.join("; ")}`, jobSecrets),
        });
      }

      const publishParams = enforcePlatformMetadataLimits(platform, rawParams);

      await job.updateProgress(30);

      const result = job.data.scheduleAt
        ? await publisher.scheduleVideo(publishParams, new Date(job.data.scheduleAt))
        : await publisher.uploadVideo(publishParams);

      if (!result.success) {
        const message = sanitizeProviderMessage(result.error ?? "Unknown publish error", jobSecrets);
        throw new PublishFailureError(classifyFailure({ code: result.errorCode, message, retryAfterSeconds: result.retryAfterSeconds }));
      }

      await this.publishJobStore.updateJobStatusForTenant(tenantId, publishJobId, "published", {
        externalId: result.externalId,
        publishedUrl: result.publishedUrl,
      });
      if (releaseTarget) {
        await this.releaseStore.updateTarget(tenantId, releaseTarget.id, {
          status: "published",
          externalId: result.externalId,
          publishedUrl: result.publishedUrl,
        });
      }

      await this.publishJobStore.addAttempt({
        publishJobId,
        attemptNumber: (job.attemptsMade ?? 0) + 1,
        status: "success",
        responseBody: result.externalId,
      });

      await job.updateProgress(100);
      logger.info({ publishJobId, platform, externalId: result.externalId }, "Published successfully");

    } catch (err) {
      const failure = toPublishFailureError(err, jobSecrets);
      if (releaseTarget) {
        if (failure.retryable) {
          await this.releaseStore.updateTarget(tenantId, releaseTarget.id, { status: "retryable", lastErrorCode: failure.code });
        }
        // Terminal failures keep the target in "publishing" until the failed
        // handler records the dead-letter and flips it to "failed".
      }
      await this.publishJobStore.addAttempt({
        publishJobId,
        attemptNumber: (job.attemptsMade ?? 0) + 1,
        status: "failed",
        responseBody: `${failure.code}: ${failure.message}`,
      });

      if (!failure.retryable) {
        // Discard so BullMQ does not schedule a pointless retry for a failure
        // that retrying cannot repair.
        try {
          job.discard();
        } catch (discardError) {
          logger.warn({ publishJobId, err: String(discardError) }, "Failed to discard terminal publish job; a retry may still be scheduled");
        }
        throw failure;
      }

      if (failure.code === "rate_limited" && failure.retryAfterMs && token) {
        const defers = job.data.rateLimitDefers ?? 0;
        if (defers < MAX_RATE_LIMIT_DEFERS && !isTerminalAttempt(job.attemptsMade ?? 0, job.opts.attempts)) {
          await job.updateData({ ...job.data, rateLimitDefers: defers + 1 });
          await job.moveToDelayed(Date.now() + failure.retryAfterMs, token);
          logger.warn(
            { publishJobId, retryAfterMs: failure.retryAfterMs, defers: defers + 1 },
            "Provider rate limit; deferring next attempt until provider retry-after",
          );
          throw new DelayedError();
        }
      }

      throw failure; // Let BullMQ handle the bounded retry
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
