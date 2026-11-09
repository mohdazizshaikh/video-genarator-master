import { observeWorker } from "./WorkerHealth";
import { WorkerTaskDrain } from "./WorkerTaskDrain";
/**
 * RenderWorker – Phase 4.1 / 4.6 / 4.7
 *
 * BullMQ worker that processes render_queue jobs.
 * Concurrency = 1 (one render at a time, memory-safe).
 * Re-deliveries reuse a persisted video binding. Uncertain outcomes are held
 * for reconciliation; transient preflight failures follow the queue budget.
 */
import { Worker, Job, UnrecoverableError } from "bullmq";
import { Config } from "../config";
import { ShortCreator } from "../short-creator/ShortCreator";
import { RenderJobStore } from "../db/RenderJobStore";
import { JobEventStore } from "../db/JobEventStore";
import { JobEventOutboxStore } from "../db/JobEventOutboxStore";
import { JobLifecycleEventService } from "../services/JobLifecycleEventService";
import { logger } from "../logger";
import { getRedisConnection, QUEUE_NAMES } from "./QueueManager";
import { RenderExecutionService, RenderReconciliationError } from "../services/RenderExecutionService";
import { RenderExecutionStore } from "../db/RenderExecutionStore";
import { isTerminalAttempt } from "./attemptBudget";
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
  private health: ReturnType<typeof observeWorker>;
  private eventTasks = new WorkerTaskDrain("render");
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

    this.health = observeWorker(this.worker, "render", "Render Worker", QUEUE_NAMES.RENDER, Math.max(1, config.renderWorkerConcurrency || 1), () => getRedisConnection(config).status === "ready");
    this.worker.on("completed", (job) => this.eventTasks.track(async () => {
      this.lifecycleEvents.emit({ tenantId: job.data.tenantId, jobId: job.data.renderJobId, type: "completed", payload: { queueJobId: job.id } });
      logger.info({ jobId: job.id, renderJobId: job.data.renderJobId }, "Render job completed");
    }));

    this.worker.on("failed", (job, err) => this.eventTasks.track(async () => {
      if (!job) return;
      const { renderJobId, tenantId } = job.data;
      if (!tenantId || !(await this.renderJobStore.getForTenant(tenantId, renderJobId))) { logger.warn({ renderJobId }, "Ignoring unowned render failure"); return; }
      if ((await this.renderJobStore.getForTenant(tenantId, renderJobId))?.status === "reconciling" || new RenderExecutionStore(this.config.dataDirPath).get(tenantId, renderJobId)?.state === "reconciling") {
        this.lifecycleEvents.emit({ tenantId, jobId: renderJobId, type: "reconciling", attempt: job.attemptsMade ?? 0, payload: { error: "Render outcome requires reconciliation" } });
        return;
      }
      const confirmed = new RenderExecutionStore(this.config.dataDirPath).get(tenantId, renderJobId);
      if (confirmed?.state === "completed") {
        await this.renderJobStore.updateStatusForTenant(tenantId, renderJobId, "rendered", { outputPath: confirmed.outputPath, executionId: confirmed.id, videoId: confirmed.videoId, artifactId: confirmed.artifactId, contentVersionId: confirmed.contentVersionId, error: null });
        return;
      }
      const maxAttempts = Math.max(1, job.opts.attempts ?? 1);
      this.lifecycleEvents.emit({ tenantId, jobId: renderJobId, type: "failed", attempt: job.attemptsMade ?? 0, payload: { error: err.message } });

      await this.renderJobStore.incrementAttemptForTenant(tenantId, renderJobId);
      const record = await this.renderJobStore.getForTenant(tenantId, renderJobId);
      const attempts = record?.attemptCount ?? 0;

      if (err instanceof UnrecoverableError || isTerminalAttempt(job.attemptsMade ?? 0, job.opts.attempts)) {
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
    }));

    logger.info("RenderWorker started (concurrency=1)");
  }

  private async processJob(job: Job<RenderJobPayload>): Promise<void> {
    const { tenantId, renderJobId } = job.data;
    if (!tenantId || !(await this.renderJobStore.getForTenant(tenantId, renderJobId))) throw new UnrecoverableError("Owned render job is required");
    this.lifecycleEvents.emit({ tenantId, jobId: renderJobId, type: "processing", attempt: job.attemptsMade ?? 0 });
    await job.updateProgress(5);
    try {
      const execution = await new RenderExecutionService(this.config.dataDirPath, this.shortCreator, this.config.renderJobTimeoutMs).run(job.data);
      await job.updateProgress(100).catch(() => logger.warn({ renderJobId }, "Render completed but progress telemetry failed"));
      logger.info({ renderJobId, executionId: execution.id, videoId: execution.videoId, artifactId: execution.artifactId, contentVersionId: execution.contentVersionId }, "Render execution confirmed");
    } catch (error) {
      if (error instanceof RenderReconciliationError) throw new UnrecoverableError(error.message);
      throw error;
    }
  }

  async pause(): Promise<void> { this.health.pause(); await this.worker.pause(true); }

  async close(): Promise<void> {
    this.health.stop();
    await this.worker.close();
    await this.eventTasks.drain();
  }
}
