/**
 * DeadLetterWorker – Phase 4.7
 *
 * Listens on deadletter_queue.
 * Logs permanently failed jobs and marks them in the DB.
 */
import { Worker, Job } from "bullmq";
import { Config } from "../config";
import { PublishJobStore } from "../db/PublishJobStore";
import { RenderJobStore } from "../db/RenderJobStore";
import { JobEventStore } from "../db/JobEventStore";
import { JobEventOutboxStore } from "../db/JobEventOutboxStore";
import { JobLifecycleEventService } from "../services/JobLifecycleEventService";
import { logger } from "../logger";
import { AlertingService } from "../services/AlertingService";
import { getRedisConnection, QUEUE_NAMES } from "./QueueManager";

export interface DeadLetterPayload {
  type: "render" | "publish";
  jobId: string;
  originalQueue: string;
  failReason: string;
  /** Normalized publish failure classification (P1-03), when available. */
  failureCode?: string;
  attemptsMade: number;
  originalJobData: Record<string, unknown>;
}

export class DeadLetterWorker {
  private worker: Worker;
  private publishJobStore: PublishJobStore;
  private renderJobStore: RenderJobStore;
  private alertingService: AlertingService;
  private lifecycleEvents: JobLifecycleEventService;

  constructor(private config: Config) {
    this.publishJobStore = new PublishJobStore(config.dataDirPath);
    this.renderJobStore = new RenderJobStore(config.dataDirPath);
    this.alertingService = new AlertingService(config);
    this.lifecycleEvents = new JobLifecycleEventService(new JobEventStore(config.dataDirPath), new JobEventOutboxStore(config.dataDirPath));

    this.worker = new Worker(
      QUEUE_NAMES.DEADLETTER,
      async (job: Job<DeadLetterPayload>) => this.processJob(job),
      {
        connection: getRedisConnection(config),
        concurrency: 1,
        stalledInterval: 60000,
      },
    );

    this.worker.on("completed", (job) => {
      logger.warn(
        { deadLetterJobId: job.id, type: job.data.type, originalJobId: job.data.jobId },
        "Dead-letter job processed (permanently failed)",
      );
    });

    logger.info("DeadLetterWorker started");
  }

  private async processJob(job: Job<DeadLetterPayload>): Promise<void> {
    const { type, jobId, failReason, failureCode, attemptsMade, originalJobData } = job.data;
    const tenantId = typeof originalJobData.tenantId === "string" ? originalJobData.tenantId : undefined;
    if (!tenantId) {
      logger.error({ deadLetterJobId: job.id, jobId }, "Rejecting unowned dead-letter job");
      return;
    }
    this.lifecycleEvents.emit({ tenantId, jobId, type: "dead_letter", attempt: attemptsMade, payload: { originalQueue: job.data.originalQueue, reason: failReason, code: failureCode } });

    logger.error(
      { type, jobId, failReason, failureCode, attemptsMade, originalJobData },
      "DEAD LETTER: Job permanently failed",
    );

    if (type === "render") {
      await this.renderJobStore.updateStatusForTenant(tenantId, jobId, "skipped", {
        error: `DEAD LETTER after ${attemptsMade} attempts: ${failReason}`,
        attemptCount: attemptsMade,
      });
    } else if (type === "publish") {
      await this.publishJobStore.updateJobStatusForTenant(tenantId, jobId, "failed", {
        error: `DEAD LETTER after ${attemptsMade} attempts: ${failReason}`,
        attemptCount: attemptsMade,
      });
    }

    await this.alertingService.notify({
      summary: `Dead-letter job detected: ${type} ${jobId}`,
      severity: "critical",
      details: { type, jobId, failReason, failureCode, attemptsMade, originalJobData },
    });
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
