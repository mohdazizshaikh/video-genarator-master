/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Source automation creates workspace-owned content drafts for review.
 * Manual render enqueue uses BullMQ when enabled. Without Redis, render jobs
 * are stored for visibility and require an execution path; this is not an
 * automatic in-memory render fallback.
 */
import cron from "node-cron";
import cuid from "cuid";
import crypto from "node:crypto";
import type { Config } from "../config";
import type { ShortCreator } from "../short-creator/ShortCreator";
import { RenderJobStore } from "../db/RenderJobStore";
import { ContentAutomationRuleStore, type ContentAutomationRule } from "../db/ContentAutomationRuleStore";
import { ContentVersionStore } from "../db/ContentVersionStore";
import { ApprovalEngine } from "./ApprovalEngine";
import { ContentIntelligenceEngine } from "./ContentIntelligenceEngine";
import { RssFetcher } from "../news-fetcher/RssFetcher";
import { AiLlmGenerator } from "../script-generator/AiLlmGenerator";
import { createRenderQueue } from "../workers/QueueManager";
import { logger } from "../logger";
import type { RenderJobPayload } from "../workers/RenderWorker";
import type { RenderConfig } from "../types/shorts";

export class SchedulerService {
  private task: ReturnType<typeof cron.schedule> | null = null;
  private renderJobStore: RenderJobStore;
  private automationRules: ContentAutomationRuleStore;
  private contentVersions: ContentVersionStore;
  private approval: ApprovalEngine;
  private intelligence: ContentIntelligenceEngine;
  private aiLlm: AiLlmGenerator;
  private running = false;
  private stopping = false;
  private drainWaiters = new Set<() => void>();
  private inFlightCategorySlot = new Set<string>();

  constructor(
    private config: Config,
    private shortCreator: ShortCreator,
  ) {
    this.renderJobStore = new RenderJobStore(config.dataDirPath);
    this.automationRules = new ContentAutomationRuleStore(config.dataDirPath);
    this.contentVersions = new ContentVersionStore(config.dataDirPath);
    this.approval = new ApprovalEngine(config.dataDirPath);
    this.intelligence = new ContentIntelligenceEngine(config.dataDirPath);
    this.aiLlm = new AiLlmGenerator(config.aiLlmUrl, config.aiLlmModel);
  }

  start(): void {
    this.stopping = false;
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
    this.stopping = true;
    this.task?.stop();
    logger.info("SchedulerService stopped");
  }

  async runOnce(): Promise<{ rules: number; drafts: number; skipped: number }> {
    if (this.running || this.stopping) return { rules: 0, drafts: 0, skipped: 0 };
    this.running = true;
    let drafts = 0;
    let skipped = 0;
    try {
      const rules = this.automationRules.listEnabled();
      for (const rule of rules) {
        if (this.stopping) break;
        const result = await this.processRule(rule);
        drafts += result.drafts;
        skipped += result.skipped;
      }
      logger.info({ rules: rules.length, drafts, skipped }, "Scheduler source tick complete; all outputs remain review-gated");
      return { rules: rules.length, drafts, skipped };
    } finally {
      this.running = false;
      for (const resolve of this.drainWaiters) resolve();
      this.drainWaiters.clear();
    }
  }

  close(): Promise<void> {
    this.stop();
    if (!this.running) return Promise.resolve();
    return new Promise<void>((resolve) => this.drainWaiters.add(resolve));
  }

  private async tick(): Promise<void> {
    await this.runOnce();
  }

  private async processRule(rule: ContentAutomationRule): Promise<{ drafts: number; skipped: number }> {
    const fetcher = new RssFetcher(this.config.dataDirPath, rule.tenantId);
    const stories = await fetcher.fetchStoriesFromSources(rule.sourceIds);
    let drafts = 0;
    let skipped = 0;
    for (const story of stories.slice(0, rule.maxDraftsPerTick)) {
      if (this.stopping) break;
      const sourceKey = story.link || `${story.sourceId || "source"}:${story.title}`;
      const signature = crypto.createHash("sha256").update(`${rule.tenantId}:${sourceKey}`.toLowerCase()).digest("hex");
      try {
        const brief = await this.intelligence.buildBrief({
          tenantId: rule.tenantId,
          category: rule.category,
          platform: rule.platform,
          niche: rule.niche,
          topic: story.title,
        });
        const scenes = await this.aiLlm.generateScript([story], {
          category: rule.category,
          topic: story.title,
          style: brief.suggestedFormat === "Viral" ? "Viral" : "Explainer",
          hook: brief.hookDirection,
          videoType: rule.videoType,
        });
        const version = this.contentVersions.create({
          workspaceId: rule.tenantId,
          title: story.title,
          script: scenes.map((scene) => scene.text).join("\\n\\n"),
          scenes,
          metadata: { automationRuleId: rule.id, intelligenceBrief: brief, source: story.sourceName || story.sourceId },
          sourceUrls: story.link ? [story.link] : [],
          contentSignature: signature,
          createdBy: "scheduler",
        });
        const approvalPriority = brief.priority === "critical" || brief.priority === "high" ? "high" : brief.priority === "medium" ? "medium" : "low";
        this.approval.submit(rule.tenantId, version.id, "script", version.title, "scheduler", approvalPriority);
        drafts += 1;
      } catch (error) {
        if (error instanceof Error && error.message.includes("Duplicate content signature")) {
          skipped += 1;
          continue;
        }
        logger.warn({ err: error, tenantId: rule.tenantId, ruleId: rule.id, story: story.title }, "Scheduler source item skipped");
        skipped += 1;
      }
    }
    return { drafts, skipped };
  }

  /**
   * Manually enqueue a render job (called by REST API or future automation).
   */
  async enqueueRenderJob(params: {
    tenantId: string;
    sceneInput: unknown;
    config: RenderConfig;
    orientation: string;
    category: string;
    videoType?: "short" | "long";
    subtitleLanguage?: string;
    namingKey?: string;
  }): Promise<string> {
    // Phase 6.4: guard duplicate category-slot in-flight work
    if (this.stopping) throw new Error("Scheduler is shutting down");
    if (!params.tenantId?.trim()) throw new Error("Render job workspace is required");
    const slotKey = `${params.tenantId}:${params.category}:${params.orientation}:${params.videoType ?? "short"}`;
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
        config: params.config,
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
