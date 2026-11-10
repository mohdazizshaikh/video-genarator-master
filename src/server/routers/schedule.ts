import { completeScheduledVideo } from "../../services/ScheduleVideoCompletion";
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
 * GET    /api/schedule/:id/outputs/:artifactId – download owned persisted bytes
 * POST   /api/schedule/:id/confirm-assets – confirm a complete bound asset checkpoint
 */
import { Router } from "express";
import fs from "fs-extra";
import path from "node:path";
import crypto from "node:crypto";
import { ScheduleAssetReconciliation } from "../../services/ScheduleAssetReconciliation";
import { ArtifactManifestStore } from "../../db/ArtifactManifestStore";
import type { Request, Response } from "express";
import express from "express";
import type { Config } from "../../config";
import { ScheduleStore, ScheduleConflictError, scheduleConfigurationDigest, type ScheduleRecord, type ScheduleOutput } from "../../db/ScheduleStore";
import { ScheduleValidationError, validateRecurrence } from "../../services/ScheduleRecurrence";
import { TenantEngineScope, tenantEngineAt } from "../../services/TenantEngineScope";
import { logger } from "../../logger";
import { ImageEngine, type ImageRenderResult } from "../../services/ImageEngine";
import { ContentFreshnessEngine } from "../../services/ContentFreshnessEngine";
import { BestTimeLearningEngine } from "../../services/BestTimeLearningEngine";
import type { ShortCreator } from "../../short-creator/ShortCreator";
import { getAuthenticatedTenantId, requireWorkspace, type AuthClaims } from "../auth";
import { LanguageEnum, VideoTypeEnum, VoiceEnum, MusicVolumeEnum, TextModeEnum, OrientationEnum, MusicMoodEnum, CaptionPositionEnum } from "../../types/shorts";

export class ScheduleRouter {
  public router: Router;
  private store: ScheduleStore;
  private runnerBusy = false;
  private runnerInterval: NodeJS.Timeout | null = null;
  private imageEngine: ImageEngine;
  private artifacts: ArtifactManifestStore;
  private dataDirectory: string;
  private videosDirectory: string;
  private freshnessEngine: TenantEngineScope<ContentFreshnessEngine>;
  private bestTimeEngine: TenantEngineScope<BestTimeLearningEngine>;
  private executing = new Set<string>();
  private shortCreator: ShortCreator | null = null;

  constructor(config: Config) {
    this.router = Router();
    this.dataDirectory = config.dataDirPath;
    this.videosDirectory = config.videosDirPath;
    this.artifacts = new ArtifactManifestStore(config.dataDirPath);
    this.store = new ScheduleStore(config.dataDirPath);
    this.imageEngine = new ImageEngine();
    this.freshnessEngine = new TenantEngineScope(config.dataDirPath, (directory) => tenantEngineAt(directory, ContentFreshnessEngine));
    this.bestTimeEngine = new TenantEngineScope(config.dataDirPath, (directory) => tenantEngineAt(directory, BestTimeLearningEngine));
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
    this.router.use(requireWorkspace);

    this.router.get("/stats", (req: Request, res: Response) => this.getStats(req, res));
    this.router.get("/due", (req: Request, res: Response) => this.getDue(req, res));
    this.router.get("/upcoming", (req: Request, res: Response) => this.getUpcoming(req, res));
    this.router.get("/best-times", (req: Request, res: Response) => this.getBestTimes(req, res));
    this.router.get("/", (req: Request, res: Response) => this.listSchedules(req, res));
    this.router.post("/", (req: Request, res: Response) => this.createSchedule(req, res));
    this.router.get("/:id/outputs/:artifactId", (req: Request, res: Response) => this.downloadOutput(req, res));
    this.router.get("/:id", (req: Request, res: Response) => this.getSchedule(req, res));
    this.router.patch("/:id/status", (req: Request, res: Response) => this.updateStatus(req, res));
    this.router.post("/:id/confirm-assets", (req: Request, res: Response) => this.confirmAssets(req, res));
    this.router.post("/:id/run", (req: Request, res: Response) => this.triggerRun(req, res));
    this.router.patch("/:id", (req: Request, res: Response) => this.updateSchedule(req, res));
    this.router.delete("/:id", (req: Request, res: Response) => this.deleteSchedule(req, res));
  }

  /** Background runner: checks due schedules every minute */
  private startRunner(): void {
    this.runnerInterval = setInterval(async () => {
      if (this.runnerBusy) return;
      this.runnerBusy = true;
      try {
        for (const schedule of await this.store.pendingVideos()) {
          if (!this.runnerInterval) break;
          try {
            const tenant = schedule.tenantId!;
            if (await completeScheduledVideo(this.dataDirectory, this.videosDirectory, tenant, schedule.id)) {
              const configuration = schedule.execution?.configuration ?? schedule;
              this.recordCompletedFreshness(tenant, configuration.name, configuration.categories?.[0] || "General", schedule.id);
            }
          }
          catch { logger.warn({ scheduleId: schedule.id }, "Scheduled video completion could not be verified"); }
        }
        const due = (await this.store.getDueSchedules()).filter((schedule) => Boolean(schedule.tenantId));
        for (const sched of due) {
          if (!this.runnerInterval) break;
          logger.info({ scheduleId: sched.id, name: sched.name }, "Schedule triggered");
          try { await this.executeSchedule(sched.id, sched.tenantId); }
          catch (err) { logger.error({ err, scheduleId: sched.id }, "Schedule execution could not be recorded"); }
        }
      } catch (err) {
        logger.error(err, "Schedule runner error");
      } finally { this.runnerBusy = false; }
    }, 60_000);
    this.runnerInterval.unref();
  }

  public stop(): void {
    if (this.runnerInterval) clearInterval(this.runnerInterval);
    this.runnerInterval = null;
  }

  private deterministicRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  private async persistAsset(tenantId: string, result: ImageRenderResult): Promise<ScheduleOutput["artifacts"][number]> {
    if (!result.success || !result.svgMarkup?.trim()) throw new Error("Scheduled asset producer returned no bytes");
    const owner = crypto.createHash("sha256").update(tenantId).digest("hex");
    const location = path.join(this.dataDirectory, "artifacts", "schedules", owner, `${crypto.randomUUID()}.svg`);
    fs.ensureDirSync(path.dirname(location));
    fs.writeFileSync(location, result.svgMarkup, { flag: "wx", mode: 0o600 });
    const artifact = await this.artifacts.register({ tenantId, kind: "generated-image", localPath: location, mimeType: "image/svg+xml", lifecycle: "active" });
    return { id: artifact.id, mimeType: artifact.mimeType, checksumSha256: artifact.checksumSha256, sizeBytes: artifact.sizeBytes };
  }

  private recordCompletedFreshness(tenant: string, name: string, category: string, scheduleId: string): void {
    try { this.freshnessEngine.forTenant(tenant).record(name, category); }
    catch { logger.warn({ scheduleId }, "Completed schedule freshness could not be recorded"); }
  }

  private async executeSchedule(scheduleId: string, tenantId?: string, manual = false): Promise<boolean> {
    if (!tenantId) return false;
    const executionKey = `${tenantId}:${scheduleId}`;
    if (this.executing.has(executionKey)) return false;
    this.executing.add(executionKey);
    try {
    const sched = await this.store.getForTenant(tenantId, scheduleId);
    if (!sched || sched.status !== "active") return false;
    validateRecurrence(sched);
    const dueAt = sched.nextRun ?? (sched.runCount === 0 ? sched.publishAt : undefined);
    if (!manual && (!dueAt || new Date(dueAt).getTime() > Date.now())) return false;
    if (sched.execution && sched.execution.state !== "completed") return false;
    const freshness = this.freshnessEngine.forTenant(tenantId);
    let executionId: string | undefined;
    let producerMayHaveEffects = false;
    let output: ScheduleOutput | undefined;

    try {
      output = { recordedAt: new Date().toISOString(), state: "assets-persisted", artifacts: [] };
      if ([sched.platforms, sched.categories, sched.languages].some((values) => values.length > 1)) throw new Error("Multi-platform/category/language generation is not supported by this runner");
      const meta = sched.metadata as { contentType?: string; alsoGenerate?: Record<string, boolean> };
      const contentType: string = meta?.contentType || "video";
      if (!["video", "image", "carousel", "banner"].includes(contentType)) throw new Error("Unsupported scheduled content type");
      if (contentType === "video" && !this.shortCreator) return false; // Leave the due occurrence available for the next tick.
      const saveAsset = async (result: ImageRenderResult) => {
        if (!result.success || !result.svgMarkup?.trim()) throw new Error("Scheduled producer returned no bytes");
        producerMayHaveEffects = true;
        const artifact = await this.persistAsset(tenantId, result);
        output!.artifacts.push(artifact);
        await this.store.checkpointOutputForTenant(tenantId, scheduleId, executionId!, output!);
        return artifact;
      };
      const alsoGenerate: Record<string, boolean> = meta?.alsoGenerate || {};
      const category = sched.categories?.[0] || "General";
      const platform = sched.platforms?.[0] || "youtube";
      const language = (sched.languages?.[0] || "en") as LanguageEnum;

      // ── Freshness check ──────────────────────────────────────────
      const freshnessResult = freshness.check(sched.name, category);
      if (!freshnessResult.allowed) {
        logger.warn(
          { scheduleId, reason: freshnessResult.reason, waitMs: freshnessResult.waitMs },
          "Schedule: content not fresh — skipping this run",
        );
        await this.store.recordRunForTenant(tenantId, scheduleId, false);
        return false;
      }

      // ── Human Mimicry: random ±45 min timing variation ───────────
      if (!manual && sched.engines?.enableHumanMimicry && !sched.timingVariationApplied) {
        const variationMs = Math.floor((this.deterministicRandom(Date.now()) * 2 - 1) * 45 * 60 * 1000);
        if (variationMs > 3 * 60 * 1000) {
          logger.info({ scheduleId, variationMinutes: Math.round(variationMs / 60000) }, "Human mimicry: delaying schedule execution");
          await this.store.updateForTenant(tenantId, scheduleId, { nextRun: new Date(Date.now() + variationMs).toISOString(), timingVariationApplied: true });
          return true;
        }
      }

      const claim = await this.store.claimForTenant(tenantId, scheduleId, sched.runCount, dueAt ?? sched.publishAt, { expectedAssets: (contentType === "video" ? 0 : 1) + (alsoGenerate.quoteCard ? 1 : 0) + (alsoGenerate.thumbnail ? 1 : 0), expectsVideo: contentType === "video" }, scheduleConfigurationDigest(sched));
      if (!claim) return false;
      executionId = claim.id;
      logger.info({ scheduleId, name: sched.name, contentType, platform }, "Executing schedule");

      // ── Content generation by type ───────────────────────────────
      if (contentType === "image") {
        const result = this.imageEngine.generateQuoteCard({
          quote: sched.name,
          author: category,
        });
        await saveAsset(result);
        logger.info({ scheduleId, contentType, success: result.success }, "Schedule: quote card generated");

      } else if (contentType === "carousel") {
        const result = this.imageEngine.generateCarousel({
          topic: sched.name,
          slides: [{ slideNumber: 1, title: sched.name, body: `${category} content` }],
        });
        await saveAsset(result);
        logger.info({ scheduleId, contentType, success: result.success }, "Schedule: carousel generated");

      } else if (contentType === "banner") {
        const result = this.imageEngine.generateBanner({
          title: sched.name,
          tagline: category,
          width: platform === "youtube" ? 2560 : 1080,
          height: platform === "youtube" ? 1440 : 1080,
          platform,
        });
        await saveAsset(result);
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
          producerMayHaveEffects = true;
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
            tenantId,
          );
          output.state = "video-queued"; output.videoId = videoId;
          await this.store.checkpointOutputForTenant(tenantId, scheduleId, executionId!, output);
          logger.info({ scheduleId, videoId }, "Schedule: video job queued via ShortCreator");
        } else {
          throw new Error("Video renderer is not ready");
        }
      }

      // ── alsoGenerate: optional supplementary assets ──────────────
      if (alsoGenerate.quoteCard) {
        await saveAsset(this.imageEngine.generateQuoteCard({ quote: sched.name, author: category }));
        logger.debug({ scheduleId }, "alsoGenerate: quote card done");
      }
      if (alsoGenerate.thumbnail) {
        await saveAsset(this.imageEngine.generatePoster({ headline: sched.name, category }));
        logger.debug({ scheduleId }, "alsoGenerate: thumbnail/poster done");
      }

      if (output.state === "video-queued") return true; // Accepted, still awaiting verified render output.
      const recorded = await this.store.recordRunForTenant(tenantId, scheduleId, true, output, executionId);
      if (!recorded) throw new Error("Schedule disappeared before output binding");
      this.recordCompletedFreshness(tenantId, sched.name, category, scheduleId);
      return true;
    } catch (err) {
      logger.error(err, "Schedule execution failed");
      if (executionId && producerMayHaveEffects) await this.store.holdExecutionForTenant(tenantId, scheduleId, executionId, output);
      else await this.store.recordRunForTenant(tenantId, scheduleId, false, undefined, executionId);
      return false;
    }
    } finally { this.executing.delete(executionKey); }
  }

  private async confirmAssets(req: Request, res: Response): Promise<void> {
    const claims = (req as Request & { auth?: AuthClaims }).auth;
    if (!claims?.permissions?.some((permission) => ["schedule:reconcile", "workspace:admin", "admin"].includes(permission))) { res.status(403).json({ error: "Schedule reconciliation permission required" }); return; }
    const tenantId = getAuthenticatedTenantId(req) ?? "";
    try {
      const schedule = await this.store.getForTenant(tenantId, req.params.id);
      if (!schedule) { res.status(404).json({ error: "Schedule not found" }); return; }
      const { executionId, evidenceReference, verifiedOutcome } = req.body || {};
      if (verifiedOutcome !== true || typeof executionId !== "string" || typeof evidenceReference !== "string" || !evidenceReference.trim() || evidenceReference.length > 500 || Array.from(evidenceReference).some((character) => character.charCodeAt(0) < 32)) { res.status(400).json({ error: "Verify the output and supply its execution ID and evidence reference" }); return; }
      const confirmed = await new ScheduleAssetReconciliation(this.dataDirectory).confirm(tenantId, schedule.id, executionId, evidenceReference.trim(), claims.name || tenantId);
      res.json({ schedule: confirmed });
    } catch { res.status(409).json({ error: "Bound scheduled assets could not be confirmed" }); }
  }

  private async downloadOutput(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = getAuthenticatedTenantId(req) ?? "";
      const schedule = await this.store.getForTenant(tenantId, req.params.id);
      const output = schedule?.lastOutput?.artifacts.find((item) => item.id === req.params.artifactId) ?? schedule?.execution?.pendingOutput?.artifacts.find((item) => item.id === req.params.artifactId);
      const artifact = output && this.artifacts.findForTenant(tenantId, output.id);
      if (!output || !artifact) { res.status(404).json({ error: "Scheduled output not found" }); return; }
      const root = fs.realpathSync(this.dataDirectory), location = fs.realpathSync(artifact.localPath);
      const prefix = path.join(root, "artifacts", "schedules", crypto.createHash("sha256").update(tenantId).digest("hex"));
      if (!location.startsWith(`${prefix}${path.sep}`) || artifact.mimeType !== "image/svg+xml" || artifact.kind !== "generated-image") throw new Error("Invalid scheduled artifact binding");
      const descriptor = fs.openSync(location, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
      let bytes: Buffer;
      try {
        const stat = fs.fstatSync(descriptor);
        if (!stat.isFile() || stat.size > 32 * 1024 * 1024 || stat.size !== artifact.sizeBytes || stat.size !== output.sizeBytes) throw new Error("Invalid scheduled artifact size");
        bytes = fs.readFileSync(descriptor);
      } finally { fs.closeSync(descriptor); }
      const checksum = crypto.createHash("sha256").update(bytes).digest("hex");
      if (checksum !== output.checksumSha256 || checksum !== artifact.checksumSha256) throw new Error("Scheduled artifact changed");
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Content-Disposition", 'attachment; filename="scheduled-output.svg"');
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
      res.send(bytes);
    } catch { res.status(409).json({ error: "Scheduled output unavailable" }); }
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
        timezone = "UTC",
        recurrence = "cron",
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
        timezone?: string;
        recurrence?: "cron" | "once";
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
      if (!publishAt || !Number.isFinite(new Date(publishAt).getTime())) {
        res.status(400).json({ error: "publishAt is required (ISO date string)" });
        return;
      }

      // Smart schedule: adjust publish time using BestTimeLearningEngine
      let resolvedPublishAt = new Date(publishAt).toISOString();
      if (smartSchedule && Array.isArray(platforms) && platforms.length > 0) {
        const bestTime = this.bestTimeEngine.forRequest(req).getBestTimes(platforms[0], categories[0] || "General");
        const bestHour = bestTime?.bestHours?.[0]?.hour;
        if (bestHour !== undefined) {
          const base = new Date(publishAt);
          base.setUTCHours(bestHour, 0, 0, 0);
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
        timezone,
        recurrence,
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
      if (err instanceof ScheduleValidationError) { res.status(400).json({ error: err.message }); return; }
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
      const body = req.body as Record<string, unknown>;
      const allowed = ["name", "videoId", "platforms", "categories", "languages", "engines", "quality", "cronExpression", "timezone", "recurrence", "publishAt", "metadata"];
      const data = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
      const updated = await this.store.updateForTenant(getAuthenticatedTenantId(req) ?? "", req.params.id, data);
      if (!updated) {
        res.status(404).json({ error: "Schedule not found" });
        return;
      }
      res.json({ status: "ok", schedule: updated });
    } catch (err) {
      if (err instanceof ScheduleValidationError) { res.status(400).json({ error: err.message }); return; }
      if (err instanceof ScheduleConflictError) { res.status(409).json({ error: err.message }); return; }
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
      if (err instanceof ScheduleValidationError) { res.status(400).json({ error: err.message }); return; }
      if (err instanceof ScheduleConflictError) { res.status(409).json({ error: err.message }); return; }
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
      const success = await this.executeSchedule(req.params.id, getAuthenticatedTenantId(req) ?? "", true);
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
      if (err instanceof ScheduleConflictError) { res.status(409).json({ error: err.message }); return; }
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
        const bestTime = this.bestTimeEngine.forRequest(req).getBestTimes(platform, category);
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
        const rec = this.bestTimeEngine.forRequest(req).getBestTimes(p, category);
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
