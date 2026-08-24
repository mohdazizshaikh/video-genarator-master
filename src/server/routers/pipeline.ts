/* eslint-disable @typescript-eslint/no-explicit-any */

import { Router } from "express";
import express from "express";
import type { Request, Response } from "express";
import { PipelineOrchestrator } from "../../services/PipelineOrchestrator";
import { PipelineStore } from "../../db/PipelineStore";
import { logger } from "../../logger";
import type { Config } from "../../config";
import { getAuthenticatedTenantId } from "../auth";

export class PipelineRouter {
  public router: Router;
  private orchestrator: PipelineOrchestrator;
  private store: PipelineStore;

  constructor(config: Config) {
    this.router = Router();
    this.router.use(express.json());
    this.orchestrator = new PipelineOrchestrator(config.dataDirPath);
    this.store = this.orchestrator.getStore();
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.post("/run", (req: Request, res: Response) => this.run(req, res));
    this.router.post("/compare", (req: Request, res: Response) => this.compare(req, res));
    this.router.get("/comparisons", (req: Request, res: Response) => this.listComparisons(req, res));
    this.router.get("/comparisons/:id", (req: Request, res: Response) => this.getComparison(req, res));
    this.router.get("/jobs", (req: Request, res: Response) => this.listJobs(req, res));
    this.router.get("/jobs/:id", (req: Request, res: Response) => this.getJob(req, res));
    this.router.get("/stats", (req: Request, res: Response) => this.getStats(req, res));
  }

  private async run(req: Request, res: Response): Promise<void> {
    const { topic, platform, tone, bulkCount, autoSchedule } = req.body;

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      res.status(400).json({ error: "topic is required" });
      return;
    }

    const validPlatforms = ["tiktok", "instagram", "youtube", "youtube_shorts", "linkedin"];
    const validTones = ["excited", "calm", "urgent", "informative", "humorous"];

    if (platform && !validPlatforms.includes(platform)) {
      res.status(400).json({ error: `platform must be one of: ${validPlatforms.join(", ")}` });
      return;
    }
    if (tone && !validTones.includes(tone)) {
      res.status(400).json({ error: `tone must be one of: ${validTones.join(", ")}` });
      return;
    }

    try {
      logger.info({ topic, platform, tone, bulkCount }, "POST /pipeline/run");
      const result = await this.orchestrator.run({
        tenantId: getAuthenticatedTenantId(req) ?? "",
        topic: topic.trim(),
        platform: platform || "tiktok",
        tone: tone || "excited",
        bulkCount: bulkCount ? Math.min(parseInt(String(bulkCount)), 30) : 1,
        autoSchedule: autoSchedule === true,
      });

      res.status(201).json({
        status: "ok",
        job: result.job,
        topVariations: result.topVariations,
        allVariations: result.allVariations,
      });
    } catch (err) {
      logger.error({ err }, "Pipeline run failed");
      res.status(500).json({ error: err instanceof Error ? err.message : "Pipeline failed" });
    }
  }

  private async compare(req: Request, res: Response): Promise<void> {
    const { topic, tone, platforms } = req.body;

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      res.status(400).json({ error: "topic is required" });
      return;
    }
    if (!Array.isArray(platforms) || platforms.length < 2) {
      res.status(400).json({ error: "platforms must be an array of at least 2 platform names" });
      return;
    }

    const validPlatforms = ["tiktok", "instagram", "youtube", "youtube_shorts", "linkedin"];
    const validTones = ["excited", "calm", "urgent", "informative", "humorous"];
    const invalidPlatform = platforms.find((p) => !validPlatforms.includes(p));
    if (invalidPlatform) {
      res.status(400).json({ error: `Invalid platform: ${invalidPlatform}. Valid: ${validPlatforms.join(", ")}` });
      return;
    }
    if (tone && !validTones.includes(tone)) {
      res.status(400).json({ error: `tone must be one of: ${validTones.join(", ")}` });
      return;
    }

    try {
      const run = await this.store.createComparison({
        tenantId: getAuthenticatedTenantId(req) ?? "",
        topic: topic.trim(),
        tone: tone || "excited",
        platforms,
      });

      logger.info({ runId: run.id, topic, platforms }, "POST /pipeline/compare started");

      // Run all platforms in parallel — each updates the comparison entry as it completes
      const runPlatform = async (platform: string) => {
        const start = Date.now();
        try {
          await this.store.updateComparisonEntryForTenant(getAuthenticatedTenantId(req) ?? "", run.id, platform, { status: "running" });

            const result = await this.orchestrator.run({
              tenantId: getAuthenticatedTenantId(req) ?? "",
              topic: topic.trim(),
            platform: platform as any,
            tone: tone || "excited",
            bulkCount: 3,
            autoSchedule: false,
          });

          const best = result.topVariations[0];
          const topJob = result.job;

          await this.store.updateComparisonEntryForTenant(getAuthenticatedTenantId(req) ?? "", run.id, platform, {
            status: "done",
            jobId: topJob.id,
            bestScore: best?.aiScores.overallScore,
            scores: best?.aiScores,
            bestHook: best?.hook,
            bestCaption: best?.caption,
            bestHashtags: best?.hashtags,
            emotionalTone: (best?.emotionalDirectives as any)?.primaryEmotion,
            musicGenre: (best?.emotionalDirectives as any)?.musicGenre,
            colorPalette: (best?.emotionalDirectives as any)?.colorPalette,
            pacing: (best?.emotionalDirectives as any)?.pacing,
            estimatedViralScore: best?.aiScores.engagementScore,
            durationMs: Date.now() - start,
          });
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          logger.error({ err, platform, runId: run.id }, "Platform comparison failed");
          await this.store.updateComparisonEntryForTenant(getAuthenticatedTenantId(req) ?? "", run.id, platform, { status: "failed", error });
        }
      };

      // Fire all in parallel, don't await — let the client poll
      Promise.all(platforms.map(runPlatform)).then(async () => {
        const finalRun = await this.store.getComparisonForTenant(getAuthenticatedTenantId(req) ?? "", run.id);
        logger.info({ runId: run.id, winner: finalRun?.winner }, "Comparison complete");
      }).catch((err) => {
        logger.error({ err, runId: run.id }, "Comparison batch error");
      });

      // Return immediately with the run ID so the client can poll
      res.status(202).json({ status: "running", run });
    } catch (err) {
      logger.error({ err }, "Compare endpoint failed");
      res.status(500).json({ error: err instanceof Error ? err.message : "Comparison failed" });
    }
  }

  private async listComparisons(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(parseInt(String(req.query.limit || "20")), 100);
      const data = await this.store.listComparisonsForTenant(getAuthenticatedTenantId(req) ?? "", limit);
      res.json({ status: "ok", data, total: data.length });
    } catch (err) {
      logger.error({ err }, "GET /pipeline/comparisons failed");
      res.status(500).json({ error: "Failed to list comparisons" });
    }
  }

  private async getComparison(req: Request, res: Response): Promise<void> {
    try {
      const run = await this.store.getComparisonForTenant(getAuthenticatedTenantId(req) ?? "", req.params.id);
      if (!run) {
        res.status(404).json({ error: "Comparison not found" });
        return;
      }
      res.json({ status: "ok", run });
    } catch (err) {
      logger.error({ err }, "GET /pipeline/comparisons/:id failed");
      res.status(500).json({ error: "Failed to fetch comparison" });
    }
  }

  private async listJobs(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(parseInt(String(req.query.limit || "50")), 200);
      const jobs = await this.store.listJobsForTenant(getAuthenticatedTenantId(req) ?? "", limit);
      res.json({ status: "ok", data: jobs, total: jobs.length });
    } catch (err) {
      logger.error({ err }, "GET /pipeline/jobs failed");
      res.status(500).json({ error: "Failed to list pipeline jobs" });
    }
  }

  private async getJob(req: Request, res: Response): Promise<void> {
    try {
      const job = await this.store.getJobForTenant(getAuthenticatedTenantId(req) ?? "", req.params.id);
      if (!job) {
        res.status(404).json({ error: "Pipeline job not found" });
        return;
      }
      const variations = await this.store.getVariationsForJobForTenant(getAuthenticatedTenantId(req) ?? "", req.params.id);
      res.json({ status: "ok", job, variations });
    } catch (err) {
      logger.error({ err }, "GET /pipeline/jobs/:id failed");
      res.status(500).json({ error: "Failed to fetch pipeline job" });
    }
  }

  private async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.store.getStatsForTenant(getAuthenticatedTenantId(req) ?? "");
      res.json({ status: "ok", stats });
    } catch (err) {
      logger.error({ err }, "GET /pipeline/stats failed");
      res.status(500).json({ error: "Failed to fetch pipeline stats" });
    }
  }
}
