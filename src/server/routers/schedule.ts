/**
 * ScheduleRouter – Full schedule persistence with cron-like runner
 *
 * GET    /api/schedule              – list schedules
 * POST   /api/schedule              – create schedule
 * GET    /api/schedule/stats        – schedule statistics
 * GET    /api/schedule/due          – get schedules due now
 * GET    /api/schedule/upcoming     – upcoming schedules (next 24h) with best-time metadata
 * GET    /api/schedule/best-times   – best posting times per platform (BestTimeLearningEngine)
 * GET    /api/schedule/:id          – get single schedule
 * PATCH  /api/schedule/:id          – update schedule
 * PATCH  /api/schedule/:id/status   – pause/resume/complete
 * DELETE /api/schedule/:id          – delete schedule
 * POST   /api/schedule/:id/run      – trigger immediate run
 */
import { Router } from "express";
import type { Request, Response } from "express";
import express from "express";
import type { Config } from "../../config";
import { ScheduleStore, type ScheduleRecord } from "../../db/ScheduleStore";
import { logger } from "../../logger";
import { ImageEngine } from "../../services/ImageEngine";
import { ContentFreshnessEngine } from "../../services/ContentFreshnessEngine";
import { BestTimeLearningEngine } from "../../services/BestTimeLearningEngine";
import type { ShortCreator } from "../../short-creator/ShortCreator";
import { getAuthenticatedTenantId, requireAuth } from "../auth";
import { LanguageEnum, VideoTypeEnum, VoiceEnum, MusicVolumeEnum, TextModeEnum, OrientationEnum, MusicMoodEnum, CaptionPositionEnum } from "../../types/shorts";

export class ScheduleRouter {
  public router: Router;
  private store: ScheduleStore;
  private runnerInterval: NodeJS.Timeout | null = null;
  private imageEngine: ImageEngine;
  private freshnessEngine: ContentFreshnessEngine;
  private bestTimeEngine: BestTimeLearningEngine;
  private shortCreator: ShortCreator | null = null;

  constructor(config: Config) {
    this.router = Router();
    this.store = new ScheduleStore(config.dataDirPath);
    this.imageEngine = new ImageEngine();
    this.freshnessEngine = new ContentFreshnessEngine(config.dataDirPath);
    this.bestTimeEngine = new BestTimeLearningEngine(config.dataDirPath);
    this.router.use(express.json());
    this.registerRoutes();
    this.startRunner();
  }

  /** Called by server.ts once ShortCreator finishes initializing */
  public setShortCreator(sc: ShortCreator): void {
    this.shortCreator = sc;
    logger.info("ScheduleRouter: ShortCreator injected — video schedules now fully supported");
  }

  private registerRoutes(): void {
    this.router.use(requireAuth);

    this.router.get("/stats", (req: Request, res: Response) => this.getStats(req, res));
    this.router.get("/due", (req: Request, res: Response) => this.getDue(req, res));
    this.router.get("/upcoming", (req: Request, res: Response) => this.getUpcoming(req, res));
    this.router.get("/best-times", (req: Request, res: Response) => this.getBestTimes(req, res));
    this.router.get("/", (req: Request, res: Response) => this.listSchedules(req, res));
    this.router.post("/", (req: Request, res: Response) => this.createSchedule(req, res));
    this.router.get("/:id", (req: Request, res: Response) => this.getSchedule(req, res));
    this.router.patch("/:id/status", (req: Request, res: Response) => this.updateStatus(req, res));
    this.router.post("/:id/run", (req: Request, res: Response) => this.triggerRun(req, res));
    this.router.patch("/:id", (req: Request, res: Response) => this.updateSchedule(req, res));
    this.router.delete("/:id", (req: Request, res: Response) => this.deleteSchedule(req, res));
  }

  /** Background runner: checks due schedules every minute */
  private startRunner(): void {
    this.runnerInterval = setInterval(async () => {
      try {
        const due = (await this.store.getDueSchedules()).filter((schedule) => Boolean(schedule.tenantId));
        for (const sched of due) {
          logger.info({ scheduleId: sched.id, name: sched.name }, "Schedule triggered");
          await this.executeSchedule(sched.id, sched.tenantId);
        }
      } catch (err) {
        logger.error(err, "Schedule runner error");
      }
    }, 60_000);
  }

  private deterministicRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  private async executeSchedule(scheduleId: string, tenantId?: string): Promise<boolean> {
    if (!tenantId) return false;
    const sched = await this.store.getForTenant(tenantId, scheduleId);
    if (!sched || sched.status !== "active") return false;

    try {
      const meta = sched.metadata as { contentType?: string; alsoGenerate?: Record<string, boolean> };
      const contentType: string = meta?.contentType || "video";
      const alsoGenerate: Record<string, boolean> = meta?.alsoGenerate || {};
      const category = sched.categories?.[0] || "General";
      const platform = sched.platforms?.[0] || "youtube";
      const language = (sched.languages?.[0] || "en") as LanguageEnum;

      // ── Freshness check ──────────────────────────────────────────
      const freshnessResult = this.freshnessEngine.check(sched.name, category);
      if (!freshnessResult.allowed) {
        logger.warn(
          { scheduleId, reason: freshnessResult.reason, waitMs: freshnessResult.waitMs },
          "Schedule: content not fresh — skipping this run",
        );
        await this.store.recordRunForTenant(tenantId, scheduleId, false);
        return false;
      }

      // ── Human Mimicry: random ±45 min timing variation ───────────
      if (sched.engines?.enableHumanMimicry) {
        const variationMs = Math.floor((this.deterministicRandom(Date.now()) * 2 - 1) * 45 * 60 * 1000);
        if (variationMs > 3 * 60 * 1000) {
          logger.info({ scheduleId, variationMinutes: Math.round(variationMs / 60000) }, "Human mimicry: delaying schedule execution");
          setTimeout(() => void this.executeSchedule(scheduleId, tenantId), Math.abs(variationMs));
          return true;
        }
      }

      logger.info({ scheduleId, name: sched.name, contentType, platform }, "Executing schedule");

      // ── Content generation by type ───────────────────────────────
      if (contentType === "image") {
        const result = this.imageEngine.generateQuoteCard({
          quote: sched.name,
          author: category,
        });
        logger.info({ scheduleId, contentType, success: result.success }, "Schedule: quote card generated");

      } else if (contentType === "carousel") {
        const result = this.imageEngine.generateCarousel({
          topic: sched.name,
          slides: [{ slideNumber: 1, title: sched.name, body: `${category} content` }],
        });
        logger.info({ scheduleId, contentType, success: result.success }, "Schedule: carousel generated");

      } else if (contentType === "banner") {
        const result = this.imageEngine.generateBanner({
          title: sched.name,
          tagline: category,
          width: platform === "youtube" ? 2560 : 1080,
          height: platform === "youtube" ? 1440 : 1080,
          platform,
        });
        logger.info({ scheduleId, contentType, success: result.success }, "Schedule: banner generated");

      } else {
        // contentType === "video" (default)
        if (this.shortCreator) {
          const scene = {
            text: `${sched.name}. Auto-generated ${category} content for ${platform}.`,
            searchTerms: [category.toLowerCase(), sched.name.toLowerCase().split(" ")[0] || "video"],
            keywords: [category.toLowerCase()],
            language,
            sourceLanguage: language,
          };
          const videoId = this.shortCreator.addToQueue(
            [scene],
            {
              videoType: VideoTypeEnum.short,
              durationLimit: 60,
              voice: VoiceEnum.af_heart,
              scriptLanguage: language,
              audioLanguage: language,
              overlayLanguage: language,
              captionLanguage: language,
              subtitleLanguage: language,
              music: MusicMoodEnum.chill,
              captionPosition: CaptionPositionEnum.center,
              captionBackgroundColor: "blue",
              textMode: TextModeEnum.hybrid,
              orientation: OrientationEnum.portrait,
              musicVolume: MusicVolumeEnum.high,
              subtitleLineCount: 2,
              subtitleFontScale: 1,
              paddingBack: 1500,
              useAiImages: false,
              category,
            },
            VideoTypeEnum.short,
            language,
          );
          logger.info({ scheduleId, videoId }, "Schedule: video job queued via ShortCreator");
        } else {
          logger.info({ scheduleId }, "Schedule: video type — ShortCreator not yet ready, will retry next cycle");
        }
      }

      // ── alsoGenerate: optional supplementary assets ──────────────
      if (alsoGenerate.quoteCard) {
        this.imageEngine.generateQuoteCard({ quote: sched.name, author: category });
        logger.debug({ scheduleId }, "alsoGenerate: quote card done");
      }
      if (alsoGenerate.thumbnail) {
        this.imageEngine.generatePoster({ headline: sched.name, category });
        logger.debug({ scheduleId }, "alsoGenerate: thumbnail/poster done");
      }

      // ── Record freshness so this topic isn't repeated too soon ───
      this.freshnessEngine.record(sched.name, category);

      await this.store.recordRunForTenant(tenantId, scheduleId, true);
      return true;
    } catch (err) {
      logger.error(err, "Schedule execution failed");
      await this.store.recordRunForTenant(tenantId, scheduleId, false);
      return false;
    }
  }

  private async listSchedules(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(parseInt(String(req.query["limit"] || "50")), 200);
      const offset = parseInt(String(req.query["offset"] || "0"));
      const tenantId = getAuthenticatedTenantId(req) ?? "";
      const activeOnly = req.query["active"] === "true";
      if (activeOnly) {
        const schedules = await this.store.listActiveForTenant(tenantId, limit, offset);
        res.json({ status: "ok", schedules, total: schedules.length });
        return;
      }
      const result = await this.store.listForTenant(tenantId, limit, offset);
      res.json({ status: "ok", ...result });
    } catch (err) {
      logger.error(err, "Schedule: list failed");
      res.status(500).json({ status: "error", error: "Failed to list schedules" });
    }
  }

  private async createSchedule(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        videoId = "",
        platforms = [],
        categories = [],
        languages = ["en"],
        engines = {},
        quality = {},
        cronExpression = "0 9 * * *",
        publishAt,
        metadata = {},
        contentType = "video",
        alsoGenerate = {},
        smartSchedule = false,
      } = req.body as {
        name?: string;
        videoId?: string;
        platforms?: string[];
        categories?: string[];
        languages?: string[];
        engines?: {
          enableTranslation?: boolean;
          enableCommentCTA?: boolean;
          enablePlatformPsych?: boolean;
          enableSeries?: boolean;
          enableHumanMimicry?: boolean;
          enableHashtagOptimization?: boolean;
          enableEngagementOptimization?: boolean;
        };
        quality?: {
          targetLUFS?: number;
          sharpnessLevel?: number;
          visualQualityTier?: "draft" | "standard" | "premium";
        };
        cronExpression?: string;
        publishAt?: string;
        metadata?: Record<string, unknown>;
        contentType?: string;
        alsoGenerate?: Record<string, boolean>;
        smartSchedule?: boolean;
      };

      if (!name || typeof name !== "string") {
        res.status(400).json({ error: "name is required" });
        return;
      }
      if (!publishAt) {
        res.status(400).json({ error: "publishAt is required (ISO date string)" });
        return;
      }

      // Smart schedule: adjust publish time using BestTimeLearningEngine
      let resolvedPublishAt = new Date(publishAt).toISOString();
      if (smartSchedule && Array.isArray(platforms) && platforms.length > 0) {
        const bestTime = this.bestTimeEngine.getBestTimes(platforms[0], categories[0] || "General");
        const bestHour = bestTime?.bestHours?.[0]?.hour;
        if (bestHour !== undefined) {
          const base = new Date(publishAt);
          base.setHours(bestHour, 0, 0, 0);
          resolvedPublishAt = base.toISOString();
          logger.info({ platform: platforms[0], bestHour }, "Smart schedule: adjusted publish time");
        }
      }

      const record = await this.store.createForTenant(getAuthenticatedTenantId(req) ?? "", {
        name,
        videoId,
        platforms: Array.isArray(platforms) ? platforms : [],
        categories: Array.isArray(categories) ? categories : [],
        languages: Array.isArray(languages) ? languages : ["en"],
        engines: {
          enableTranslation: engines.enableTranslation ?? false,
          enableCommentCTA: engines.enableCommentCTA ?? false,
          enablePlatformPsych: engines.enablePlatformPsych ?? false,
          enableSeries: engines.enableSeries ?? false,
          enableHumanMimicry: engines.enableHumanMimicry ?? false,
          enableHashtagOptimization: engines.enableHashtagOptimization ?? true,
          enableEngagementOptimization: engines.enableEngagementOptimization ?? true,
        },
        quality: {
          targetLUFS: quality.targetLUFS ?? -14,
          sharpnessLevel: quality.sharpnessLevel ?? 5,
          visualQualityTier: quality.visualQualityTier ?? "standard",
        },
        cronExpression,
        publishAt: resolvedPublishAt,
        status: "active",
        nextRun: resolvedPublishAt,
        metadata: {
          ...metadata,
          contentType,
          alsoGenerate,
        },
      });

      res.status(201).json({ status: "ok", schedule: record });
    } catch (err) {
      logger.error(err, "Schedule: create failed");
      res.status(500).json({ status: "error", error: "Failed to create schedule" });
    }
  }

  private async getSchedule(req: Request, res: Response): Promise<void> {
    try {
      const sched = await this.store.getForTenant(getAuthenticatedTenantId(req) ?? "", req.params.id);
      if (!sched) {
        res.status(404).json({ error: "Schedule not found" });
        return;
      }
      res.json({ status: "ok", schedule: sched });
    } catch (err) {
      logger.error(err, "Schedule: get failed");
      res.status(500).json({ status: "error", error: "Failed to get schedule" });
    }
  }

  private async updateSchedule(req: Request, res: Response): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { tenantId: _tenantId, ...data } = req.body as Record<string, unknown>;
      const updated = await this.store.updateForTenant(getAuthenticatedTenantId(req) ?? "", req.params.id, data);
      if (!updated) {
        res.status(404).json({ error: "Schedule not found" });
        return;
      }
      res.json({ status: "ok", schedule: updated });
    } catch (err) {
      logger.error(err, "Schedule: update failed");
      res.status(500).json({ status: "error", error: "Failed to update schedule" });
    }
  }

  private async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.body as { status: string };
      const allowed = ["active", "paused", "completed", "failed"] as const;
      if (!status || !allowed.includes(status as ScheduleRecord["status"])) {
        res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
        return;
      }
      const updated = await this.store.updateStatusForTenant(getAuthenticatedTenantId(req) ?? "", req.params.id, status as ScheduleRecord["status"]);
      if (!updated) {
        res.status(404).json({ error: "Schedule not found" });
        return;
      }
      res.json({ status: "ok", schedule: updated });
    } catch (err) {
      logger.error(err, "Schedule: updateStatus failed");
      res.status(500).json({ status: "error", error: "Failed to update status" });
    }
  }

  private async triggerRun(req: Request, res: Response): Promise<void> {
    try {
      const sched = await this.store.getForTenant(getAuthenticatedTenantId(req) ?? "", req.params.id);
      if (!sched) {
        res.status(404).json({ error: "Schedule not found" });
        return;
      }
      const success = await this.executeSchedule(req.params.id, getAuthenticatedTenantId(req) ?? "");
      res.json({ status: "ok", triggered: true, success, scheduleId: req.params.id });
    } catch (err) {
      logger.error(err, "Schedule: triggerRun failed");
      res.status(500).json({ status: "error", error: "Failed to trigger run" });
    }
  }

  private async deleteSchedule(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await this.store.deleteForTenant(getAuthenticatedTenantId(req) ?? "", req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Schedule not found" });
        return;
      }
      res.json({ status: "ok", message: "Schedule deleted successfully" });
    } catch (err) {
      logger.error(err, "Schedule: delete failed");
      res.status(500).json({ status: "error", error: "Failed to delete schedule" });
    }
  }

  private async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.store.getStatsForTenant(getAuthenticatedTenantId(req) ?? "");
      res.json({ status: "ok", stats });
    } catch (err) {
      logger.error(err, "Schedule: stats failed");
      res.status(500).json({ status: "error", error: "Failed to get stats" });
    }
  }

  private async getDue(req: Request, res: Response): Promise<void> {
    try {
      const schedules = await this.store.getDueSchedulesForTenant(getAuthenticatedTenantId(req) ?? "");
      res.json({ status: "ok", schedules, count: schedules.length });
    } catch (err) {
      logger.error(err, "Schedule: getDue failed");
      res.status(500).json({ status: "error", error: "Failed to get due schedules" });
    }
  }

  /** GET /api/schedule/upcoming – active schedules in the next N hours with best-time metadata */
  private async getUpcoming(req: Request, res: Response): Promise<void> {
    try {
      const hoursAhead = Math.min(parseInt(String(req.query["hours"] || "24")), 168);
      const cutoff = new Date(Date.now() + hoursAhead * 3600 * 1000).toISOString();
      const { schedules: all } = await this.store.listForTenant(getAuthenticatedTenantId(req) ?? "", 200, 0);
      const upcoming = all
        .filter((s) => s.status === "active" && s.nextRun && s.nextRun <= cutoff)
        .sort((a, b) => (a.nextRun ?? "").localeCompare(b.nextRun ?? ""));

      const enriched = upcoming.map((s) => {
        const platform = s.platforms?.[0] || "youtube";
        const category = s.categories?.[0] || "General";
        const bestTime = this.bestTimeEngine.getBestTimes(platform, category);
        const meta = s.metadata as { contentType?: string };
        return {
          ...s,
          bestTimeRecommendation: {
            hour: bestTime?.bestHours?.[0]?.hour,
            dayName: bestTime?.bestHours?.[0]?.dayName,
            confidence: bestTime?.confidence,
          },
          contentType: meta?.contentType || "video",
        };
      });

      res.json({ status: "ok", schedules: enriched, count: enriched.length, hoursAhead });
    } catch (err) {
      logger.error(err, "Schedule: getUpcoming failed");
      res.status(500).json({ status: "error", error: "Failed to get upcoming schedules" });
    }
  }

  /** GET /api/schedule/best-times?platform=youtube&category=General */
  private async getBestTimes(req: Request, res: Response): Promise<void> {
    try {
      const platform = String(req.query["platform"] || "youtube");
      const category = String(req.query["category"] || "General");
      const allPlatforms = ["youtube", "tiktok", "instagram", "linkedin", "facebook", "telegram", "twitter"];
      const results: Record<string, unknown> = {};
      const targetPlatforms = platform === "all" ? allPlatforms : [platform];
      for (const p of targetPlatforms) {
        const rec = this.bestTimeEngine.getBestTimes(p, category);
        results[p] = {
          platform: p,
          category,
          bestHours: rec?.bestHours || [],
          confidence: rec?.confidence || "low",
          timezone: rec?.timezone || "UTC",
          hour: rec?.bestHours?.[0]?.hour,
        };
      }
      res.json({
        status: "ok",
        platform,
        category,
        bestTimes: platform === "all" ? results : results[platform],
      });
    } catch (err) {
      logger.error(err, "Schedule: getBestTimes failed");
      res.status(500).json({ status: "error", error: "Failed to get best times" });
    }
  }
}
