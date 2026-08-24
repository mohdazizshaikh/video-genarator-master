/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * SchedulerService – Phase 6.1
 *
 * node-cron job that periodically:
 *   1. Fetches new RSS reports
 *   2. Creates ScriptPlan entries
 *   3. Enqueues RenderJobs on the BullMQ render_queue
 *
 * When Redis is disabled, jobs are dispatched directly via ShortCreator.addToQueue()
 * to preserve backward-compatibility.
 */
import cron from "node-cron";
import cuid from "cuid";
import type { Config } from "../config";
import type { ShortCreator } from "../short-creator/ShortCreator";
import { RenderJobStore } from "../db/RenderJobStore";
import { createRenderQueue } from "../workers/QueueManager";
import { logger } from "../logger";
import type { RenderJobPayload } from "../workers/RenderWorker";

export class SchedulerService {
  private task: ReturnType<typeof cron.schedule> | null = null;
  private renderJobStore: RenderJobStore;
  private running = false;
  private inFlightCategorySlot = new Set<string>();

  constructor(
    private config: Config,
    private shortCreator: ShortCreator,
  ) {
    this.renderJobStore = new RenderJobStore(config.dataDirPath);
  }

  start(): void {
    if (!cron.validate(this.config.cronInterval)) {
      logger.error({ cronInterval: this.config.cronInterval }, "Invalid cron expression – SchedulerService NOT started");
      return;
    }

    this.task = cron.schedule(this.config.cronInterval, () => {
      if (this.running) {
        logger.warn("Scheduler tick skipped – previous run still in progress");
        return;
      }
      this.tick().catch((err: any) =>
        logger.error({ err: err.message }, "SchedulerService tick error"),
      );
    });

    logger.info({ cronInterval: this.config.cronInterval }, "SchedulerService started");
  }

  stop(): void {
    this.task?.stop();
    logger.info("SchedulerService stopped");
  }

  private async tick(): Promise<void> {
    this.running = true;
    try {
      logger.info("Scheduler tick: checking for new content to render");

      // Future: call RssFetcher → AiLlmGenerator → build SceneInput[] per category
      // For now we emit a lifecycle log so the scheduler is observable
      logger.info("Scheduler tick: no new content rules configured yet – idle");

    } finally {
      this.running = false;
    }
  }

  /**
   * Manually enqueue a render job (called by REST API or future automation).
   */
  async enqueueRenderJob(params: {
    tenantId: string;
    sceneInput: unknown;
    orientation: string;
    category: string;
    videoType?: "short" | "long";
    subtitleLanguage?: string;
    namingKey?: string;
  }): Promise<string> {
    // Phase 6.4: guard duplicate category-slot in-flight work
    const slotKey = `${params.category}:${params.orientation}:${params.videoType ?? "short"}`;
    if (this.inFlightCategorySlot.has(slotKey)) {
      throw new Error(`Duplicate in-flight category slot: ${slotKey}`);
    }
    this.inFlightCategorySlot.add(slotKey);

    try {
    const namingKey = params.namingKey ?? cuid();

    const record = await this.renderJobStore.create({
      tenantId: params.tenantId,
      scriptPlanId: "",
      videoType: params.videoType ?? "short",
      language: "en",
      subtitleLanguage: params.subtitleLanguage ?? "",
      orientation: params.orientation as any,
      category: params.category,
      namingKey,
    });
    const jobId = record.id;

    if (this.config.redisEnabled) {
      const renderQueue = createRenderQueue(this.config);
      const payload: RenderJobPayload = {
        tenantId: params.tenantId,
        renderJobId: jobId,
        scriptPlanId: "",
        sceneInput: params.sceneInput as any,
        config: {} as any,
        videoType: params.videoType ?? "short",
        subtitleLanguage: params.subtitleLanguage,
        orientation: params.orientation as any,
        category: params.category,
        namingKey,
      };
      await renderQueue.add("render", payload, { jobId: jobId });
      logger.info({ renderJobId: jobId }, "Render job enqueued via BullMQ");
    } else {
      logger.warn({ renderJobId: jobId }, "Redis disabled – render job saved to DB only (will not auto-process)");
    }

    return jobId;
    } finally {
      this.inFlightCategorySlot.delete(slotKey);
    }
  }
}
