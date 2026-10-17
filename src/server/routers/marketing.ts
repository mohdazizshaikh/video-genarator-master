import { Router } from "express";
import type { Request, Response } from "express";
import type { Config } from "../../config";
import { AudienceStore } from "../../db/AudienceStore";
import { ABVariantStore } from "../../db/ABVariantStore";
import { AnalyticsStore } from "../../db/AnalyticsStore";
import { SeoOptimizerService } from "../../services/SeoOptimizerService";
import { ViralStrategyService } from "../../services/ViralStrategyService";
import { getAuthenticatedTenantId, requireAuth } from "../auth";

export class MarketingRouter {
  public router: Router;
  private audienceStore: AudienceStore;
  private abVariantStore: ABVariantStore;
  private analyticsStore: AnalyticsStore;
  private seoService: SeoOptimizerService;
  private viralService: ViralStrategyService;

  constructor(config: Config) {
    this.router = Router();
    this.audienceStore = new AudienceStore(config.dataDirPath);
    this.abVariantStore = new ABVariantStore(config.dataDirPath);
    this.analyticsStore = new AnalyticsStore(config.dataDirPath);
    this.seoService = new SeoOptimizerService();
    this.viralService = new ViralStrategyService();
    this.router.use(expressJsonMiddleware());
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.use(requireAuth);

    this.router.post("/audience", (req, res) => this.createAudienceTarget(req, res));
    this.router.get("/audience", (req, res) => this.listAudienceTargets(req, res));

    this.router.post("/seo/optimize", (req, res) => this.optimizeSeo(req, res));

    this.router.post("/ab/variants", (req, res) => this.createVariant(req, res));
    this.router.get("/ab/variants/:videoId", (req, res) => this.listVariants(req, res));
    this.router.post("/ab/assign/:videoId", (req, res) => this.assignVariant(req, res));

    this.router.post("/analytics", (req, res) => this.upsertAnalytics(req, res));
    this.router.get("/analytics/:videoId", (req, res) => this.getAnalyticsByVideo(req, res));

    this.router.get("/dashboard", (req, res) => this.getDashboard(req, res));
  }

  private async createAudienceTarget(req: Request, res: Response): Promise<void> {
    const { category, location, ageGroup, interests = [], score = 0 } = req.body;
    const tenantId = getAuthenticatedTenantId(req) ?? "";
    if (!category || !location || !ageGroup) {
      res.status(400).json({ error: "category, location, ageGroup are required" });
      return;
    }
    const record = await this.audienceStore.add({ tenantId, category, location, ageGroup, interests, score });
    res.status(201).json(record);
  }

  private async listAudienceTargets(req: Request, res: Response): Promise<void> {
    res.json(await this.audienceStore.listForTenant(getAuthenticatedTenantId(req) ?? ""));
  }

  private optimizeSeo(req: Request, res: Response): void {
    const { title = "", description = "", keywords = [], category } = req.body;
    res.json(this.seoService.optimize({ title, description, keywords, category }));
  }

  private async createVariant(req: Request, res: Response): Promise<void> {
    const { videoId, variantKey, title, thumbnail } = req.body;
    if (!videoId || !variantKey || !title) {
      res.status(400).json({ error: "videoId, variantKey, title are required" });
      return;
    }
    const record = await this.abVariantStore.create({ videoId, variantKey, title, thumbnail });
    res.status(201).json(record);
  }

  private async listVariants(req: Request, res: Response): Promise<void> {
    res.json(await this.abVariantStore.list(req.params.videoId));
  }

  private async assignVariant(req: Request, res: Response): Promise<void> {
    const assigned = await this.abVariantStore.assign(req.params.videoId);
    if (!assigned) {
      res.status(404).json({ error: "No variants for this video" });
      return;
    }
    res.json(assigned);
  }

  private async upsertAnalytics(req: Request, res: Response): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tenantId: _tenantId, ...analytics } = req.body;
    const saved = await this.analyticsStore.upsertForTenant(getAuthenticatedTenantId(req) ?? "", analytics);
    res.status(201).json(saved);
  }

  private async getAnalyticsByVideo(req: Request, res: Response): Promise<void> {
    const records = await this.analyticsStore.getByVideoForTenant(getAuthenticatedTenantId(req) ?? "", req.params.videoId);
    const totals = records.reduce(
      (acc, r) => {
        acc.views += r.views;
        acc.likes += r.likes;
        acc.shares += r.shares;
        acc.comments += r.comments;
        return acc;
      },
      { views: 0, likes: 0, shares: 0, comments: 0 },
    );
    res.json({ records, totals, viral: this.viralService.score(totals) });
  }

  private async getDashboard(req: Request, res: Response): Promise<void> {
    const tenantId = getAuthenticatedTenantId(req) ?? "";
    const analytics = await this.analyticsStore.listForTenant(tenantId);
    const audience = await this.audienceStore.listForTenant(tenantId);
    const totalViews = analytics.reduce((sum, a) => sum + a.views, 0);
    const totalLikes = analytics.reduce((sum, a) => sum + a.likes, 0);

    res.json({
      kpis: {
        totalViews,
        totalLikes,
        audienceTargets: audience.length,
        publishedVideos: new Set(analytics.map((a) => a.renderOutputId)).size,
      },
      topAudience: audience.slice(0, 5),
      recentAnalytics: analytics.slice(0, 10),
    });
  }
}

function expressJsonMiddleware() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const express = require("express") as typeof import("express");
  return express.json();
}
