/**
 * PublishWorker – Phase 4.1 / 5.1
 *
 * BullMQ worker that processes publish_queue jobs.
 * Concurrency = 3 (different platforms can run in parallel).
 * Retries up to 2 times with exponential backoff, then deadletter.
 */
import { Worker, Job } from "bullmq";
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
import type { PlatformType } from "../types/shorts";
import { enforcePlatformMetadataLimits, validatePublishPayload } from "../publishers/PlatformLimits";

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
}

export class PublishWorker {
  private worker: Worker;
  private publishJobStore: PublishJobStore;
  private lifecycleEvents: JobLifecycleEventService;
  private releaseStore: ReleaseStore;
  private connectorStore: ConnectorStore;
  private connectorSecrets?: ConnectorSecretStore;

  constructor(private config: Config) {
    this.publishJobStore = new PublishJobStore(config.dataDirPath);
    this.releaseStore = new ReleaseStore(config.dataDirPath);
    this.connectorStore = new ConnectorStore(config.dataDirPath);
    const connectorSecret = process.env.TENANT_KEYS_SECRET || "";
    if (connectorSecret.trim()) this.connectorSecrets = new ConnectorSecretStore(config.dataDirPath, connectorSecret);
    this.lifecycleEvents = new JobLifecycleEventService(new JobEventStore(config.dataDirPath), new JobEventOutboxStore(config.dataDirPath));

    const publishConcurrency = Math.max(1, this.config.publishWorkerConcurrency || 3);
    // Phase 4.9: configurable worker scaling
    this.worker = new Worker(
      QUEUE_NAMES.PUBLISH,
      async (job: Job<PublishJobPayload>) => this.processJob(job),
      {
        connection: getRedisConnection(config),
        concurrency: publishConcurrency,
        stalledInterval: 30000,
      },
    );

    this.worker.on("completed", (job) => {
      this.lifecycleEvents.emit({ tenantId: job.data.tenantId, jobId: job.data.publishJobId, type: "completed", payload: { queueJobId: job.id, platform: job.data.platform } });
      logger.info(
        { jobId: job.id, publishJobId: job.data.publishJobId, platform: job.data.platform },
        "Publish job completed",
      );
    });

    this.worker.on("failed", async (job, err) => {
      if (!job) return;
      const { publishJobId } = job.data;
      this.lifecycleEvents.emit({ tenantId: job.data.tenantId, jobId: publishJobId, type: "failed", attempt: (job.attemptsMade ?? 0) + 1, payload: { error: err.message } });

      await this.publishJobStore.incrementAttemptForTenant(job.data.tenantId ?? "", publishJobId);
      const record = await this.publishJobStore.getJobForTenant(job.data.tenantId ?? "", publishJobId);
      const attempts = record?.attemptCount ?? 0;

      if (attempts >= 2) {
        const { createQueue } = await import("./QueueManager.js");
        const deadletter = createQueue(QUEUE_NAMES.DEADLETTER, this.config);
        await deadletter.add("publish-deadletter", {
          type: "publish",
          jobId: publishJobId,
          originalQueue: QUEUE_NAMES.PUBLISH,
          failReason: err.message,
          attemptsMade: attempts,
          originalJobData: job.data,
        });

        await this.publishJobStore.updateJobStatusForTenant(job.data.tenantId ?? "", publishJobId, "failed", {
          error: `Max retries exceeded: ${err.message}`,
          attemptCount: attempts,
        });
        logger.error(
          { publishJobId, platform: job.data.platform, attempts, err: err.message },
          "Publish job moved to dead-letter after max retries",
        );
      } else {
        await this.publishJobStore.updateJobStatusForTenant(job.data.tenantId ?? "", publishJobId, "failed", {
          error: err.message,
          attemptCount: attempts,
        });
      }
    });

    logger.info("PublishWorker started (concurrency=3)");
  }

  private async processJob(job: Job<PublishJobPayload>): Promise<void> {
    const { publishJobId, platform, channelId } = job.data;
    const tenantId = job.data.tenantId;
    if (!tenantId) throw new Error("Publish job requires an authenticated workspace");

    let releaseTarget;
    if (job.data.releaseTargetId) {
      releaseTarget = this.releaseStore.getTarget(tenantId, job.data.releaseTargetId);
      if (!releaseTarget) throw new Error("Release target not found for workspace");
      if (releaseTarget.status === "published") {
        logger.info({ publishJobId, releaseTargetId: releaseTarget.id }, "Release target already published; skipping duplicate worker execution");
        return;
      }
      await this.releaseStore.updateTarget(tenantId, releaseTarget.id, { status: "publishing" });
    }

    logger.info({ jobId: job.id, publishJobId, platform, channelId }, "PublishWorker processing job");

    this.lifecycleEvents.emit({ tenantId: job.data.tenantId, jobId: publishJobId, type: "publishing", attempt: job.attemptsMade ?? 0 });
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
        const { createPublisherForAccount } = await import("../publishers/PublisherFactory.js");
        publisher = createPublisherForAccount(platform, this.config, credentials);
      } else {
        publisher = createPublisher(platform, this.config);
      }

      const credentialsValid = await publisher.validateCredentials();
      if (!credentialsValid) {
        throw new Error(`Publisher credentials invalid for platform: ${platform}`);
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
        throw new Error(`Platform limit validation failed: ${payloadValidation.errors.join("; ")}`);
      }

      const publishParams = enforcePlatformMetadataLimits(platform, rawParams);

      await job.updateProgress(30);

      const result = job.data.scheduleAt
        ? await publisher.scheduleVideo(publishParams, new Date(job.data.scheduleAt))
        : await publisher.uploadVideo(publishParams);

      if (!result.success) {
        throw new Error(result.error ?? "Unknown publish error");
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
      const message = err instanceof Error ? err.message : String(err);
      if (releaseTarget) {
        await this.releaseStore.updateTarget(tenantId, releaseTarget.id, { status: "retryable", lastErrorCode: message.slice(0, 160) });
      }
      await this.publishJobStore.addAttempt({
        publishJobId,
        attemptNumber: (job.attemptsMade ?? 0) + 1,
        status: "failed",
        responseBody: message,
      });
      throw err; // Let BullMQ handle retry
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
