/**
 * RenderWorker – Phase 4.1 / 4.6 / 4.7
 *
 * BullMQ worker that processes render_queue jobs.
 * Concurrency = 1 (one render at a time, memory-safe).
 * Retries up to 2 times on failure, then marks job as skipped.
 */
import { Worker, Job } from "bullmq";
import { Config } from "../config";
import { ShortCreator } from "../short-creator/ShortCreator";
import { RenderJobStore } from "../db/RenderJobStore";
import { JobEventStore } from "../db/JobEventStore";
import { JobEventOutboxStore } from "../db/JobEventOutboxStore";
import { JobLifecycleEventService } from "../services/JobLifecycleEventService";
import { logger } from "../logger";
import { getRedisConnection, QUEUE_NAMES } from "./QueueManager";
import type { OrientationEnum, SceneInput, RenderConfig } from "../types/shorts";

export interface RenderJobPayload {
  tenantId: string;
  renderJobId: string;
  scriptPlanId: string;
  sceneInput: SceneInput[];
  config: RenderConfig;
  videoType: "short" | "long";
  subtitleLanguage?: string;
  orientation: OrientationEnum;
  category: string;
  namingKey: string;
}

export class RenderWorker {
  private worker: Worker;
  private renderJobStore: RenderJobStore;
  private lifecycleEvents: JobLifecycleEventService;

  constructor(
    private config: Config,
    private shortCreator: ShortCreator,
  ) {
    this.renderJobStore = new RenderJobStore(config.dataDirPath);
    this.lifecycleEvents = new JobLifecycleEventService(new JobEventStore(config.dataDirPath), new JobEventOutboxStore(config.dataDirPath));

    const renderConcurrency = Math.max(1, this.config.renderWorkerConcurrency || 1);
    // Phase 4.9: configurable worker scaling
    this.worker = new Worker(
      QUEUE_NAMES.RENDER,
      async (job: Job<RenderJobPayload>) => this.processJob(job),
      {
        connection: getRedisConnection(config),
        concurrency: renderConcurrency,
        stalledInterval: 30000,
      },
    );

    this.worker.on("completed", (job) => {
      this.lifecycleEvents.emit({ tenantId: job.data.tenantId, jobId: job.data.renderJobId, type: "completed", payload: { queueJobId: job.id } });
      logger.info({ jobId: job.id, renderJobId: job.data.renderJobId }, "Render job completed");
    });

    this.worker.on("failed", async (job, err) => {
      if (!job) return;
      const { renderJobId, tenantId } = job.data;
      const maxAttempts = 2;
      this.lifecycleEvents.emit({ tenantId, jobId: renderJobId, type: "failed", attempt: (job.attemptsMade ?? 0) + 1, payload: { error: err.message } });

      await this.renderJobStore.incrementAttemptForTenant(tenantId, renderJobId);
      const record = await this.renderJobStore.getForTenant(tenantId, renderJobId);
      const attempts = record?.attemptCount ?? 0;

      if (attempts >= maxAttempts) {
        // Phase 4.5: push hard failures into dead-letter queue for visibility
        const { createQueue } = await import("./QueueManager.js");
        const deadletter = createQueue(QUEUE_NAMES.DEADLETTER, this.config);
        await deadletter.add("render-deadletter", {
          type: "render",
          jobId: renderJobId,
          originalQueue: QUEUE_NAMES.RENDER,
          failReason: err.message,
          attemptsMade: attempts,
          originalJobData: job.data,
        });

        // Mark as skipped after max retries – do NOT block queue
        await this.renderJobStore.updateStatusForTenant(tenantId, renderJobId, "skipped", {
          error: `Max retries (${maxAttempts}) exceeded: ${err.message}`,
        });
        logger.warn(
          { jobId: job.id, renderJobId, attempts },
          "Render job skipped after max retries",
        );
      } else {
        await this.renderJobStore.updateStatusForTenant(tenantId, renderJobId, "failed", {
          error: err.message,
          attemptCount: attempts,
        });
        logger.error(
          { jobId: job.id, renderJobId, attempts, err: err.message },
          "Render job failed, will retry",
        );
      }
    });

    logger.info("RenderWorker started (concurrency=1)");
  }

  private async processJob(job: Job<RenderJobPayload>): Promise<void> {
    const {
      tenantId,
      renderJobId,
      sceneInput,
      config,
      videoType,
      subtitleLanguage,
      category,
      namingKey,
    } = job.data;

    logger.info(
      { jobId: job.id, renderJobId, videoType, namingKey },
      "RenderWorker processing job",
    );

    this.lifecycleEvents.emit({ tenantId, jobId: renderJobId, type: "processing", attempt: job.attemptsMade ?? 0 });
    await this.renderJobStore.updateStatusForTenant(tenantId, renderJobId, "processing");

    // Update job progress
    await job.updateProgress(5);

    const renderConfig: RenderConfig = {
      ...config,
      category: category || config?.category || "News",
    };

    const videoId = this.shortCreator.addToQueue(
      sceneInput,
      renderConfig,
      videoType,
      subtitleLanguage,
      tenantId,
    );

    // Poll until the short creator finishes this video
    await new Promise<void>((resolve, reject) => {
      const interval = setInterval(async () => {
        const status = this.shortCreator.status(videoId);
        if (status === "ready") {
          clearInterval(interval);
          resolve();
        } else if (status === "failed") {
          clearInterval(interval);
          reject(new Error(`ShortCreator reported failed for videoId ${videoId}`));
        }
      }, 3000);
    });

    const outputPath = this.shortCreator.getVideoPath(videoId);

    await this.renderJobStore.updateStatusForTenant(tenantId, renderJobId, "ready", {
      outputPath,
    });

    await this.renderJobStore.updateStatusForTenant(tenantId, renderJobId, "rendered", {
      outputPath,
    });

    await job.updateProgress(100);
    logger.info({ renderJobId, outputPath }, "Render job finished");
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
