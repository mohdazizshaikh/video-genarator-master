/* eslint-disable @typescript-eslint/no-explicit-any */

import express from "express";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { PlatformPsychologyEngine } from "../../services/PlatformPsychologyEngine";
import { ContentBucketEngine } from "../../services/ContentBucketEngine";
import { SeriesBuilderEngine } from "../../services/SeriesBuilderEngine";
import { CommentCtaEngine } from "../../services/CommentCtaEngine";
import { Config } from "../../config";
import { getAuthenticatedTenantId } from "../auth";

export class StrategyRouter {
  public router: express.Router;
  private psychology: PlatformPsychologyEngine;
  private buckets: ContentBucketEngine;
  private series: SeriesBuilderEngine;
  private cta: CommentCtaEngine;

  constructor(config: Config) {
    this.router = express.Router();
    this.psychology = new PlatformPsychologyEngine();
    this.buckets = new ContentBucketEngine(config.dataDirPath);
    this.series = new SeriesBuilderEngine(config.dataDirPath);
    this.cta = new CommentCtaEngine();
    this.router.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes() {
    // Platform psychology
    this.router.get("/platform/:platform", (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const profile = this.psychology.getProfile(req.params.platform as any);
        res.json({ status: "ok", data: profile });
      } catch { res.status(404).json({ error: "Platform not found" }); }
    });

    this.router.get("/platforms", (_req: ExpressRequest, res: ExpressResponse) => {
      res.json({ status: "ok", data: this.psychology.getAllProfiles() });
    });

    this.router.post("/platform/optimal", (req: ExpressRequest, res: ExpressResponse) => {
      const result = this.psychology.getOptimalPlatformsForContent(req.body);
      res.json({ status: "ok", data: result });
    });

    // Content buckets
    this.router.get("/buckets", (_req: ExpressRequest, res: ExpressResponse) => {
      res.json({ status: "ok", data: this.buckets.getStats() });
    });

    this.router.get("/buckets/next", (_req: ExpressRequest, res: ExpressResponse) => {
      res.json({ status: "ok", data: { recommended: this.buckets.getNextRecommendedBucket() } });
    });

    this.router.post("/buckets/add", (req: ExpressRequest, res: ExpressResponse) => {
      const { videoId, title, category, bucketOverride } = req.body;
      if (!videoId || !title || !category) return res.status(400).json({ error: "videoId, title, category required" });
      const record = this.buckets.addContent(videoId, title, category, bucketOverride);
      res.json({ status: "ok", data: record });
    });

    // Series builder
    this.router.get("/series", (req: ExpressRequest, res: ExpressResponse) => {
      const tenantId = getAuthenticatedTenantId(req);
      if (!tenantId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      res.json({ status: "ok", data: this.series.getAllSeriesForTenant(tenantId) });
    });

    this.router.post("/series", (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const tenantId = getAuthenticatedTenantId(req);
        if (!tenantId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
        const s = this.series.createSeriesForTenant(tenantId, req.body);
        res.status(201).json({ status: "ok", data: s });
      } catch (err) {
        res.status(400).json({ error: (err as Error).message });
      }
    });

    this.router.get("/series/:id", (req: ExpressRequest, res: ExpressResponse) => {
      const tenantId = getAuthenticatedTenantId(req);
      if (!tenantId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      const s = this.series.getSeriesForTenant(tenantId, req.params.id);
      if (!s) return res.status(404).json({ error: "Series not found" });
      res.json({ status: "ok", data: s });
    });

    this.router.get("/series/:id/next-episode", (req: ExpressRequest, res: ExpressResponse) => {
      const tenantId = getAuthenticatedTenantId(req);
      if (!tenantId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      const ep = this.series.getNextEpisodeForTenant(tenantId, req.params.id);
      res.json({ status: "ok", data: ep });
    });

    this.router.get("/series/:id/cliffhanger/:episode", (req: ExpressRequest, res: ExpressResponse) => {
      const tenantId = getAuthenticatedTenantId(req);
      if (!tenantId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      const text = this.series.generateCliffhangerForTenant(tenantId, req.params.id, parseInt(req.params.episode));
      res.json({ status: "ok", data: { cliffhanger: text } });
    });

    this.router.patch("/series/:id/episode/:ep", (req: ExpressRequest, res: ExpressResponse) => {
      const tenantId = getAuthenticatedTenantId(req);
      if (!tenantId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      const ok = this.series.updateEpisodeForTenant(tenantId, req.params.id, parseInt(req.params.ep), req.body);
      if (!ok) return res.status(404).json({ error: "Series or episode not found" });
      res.json({ status: "ok" });
    });

    this.router.delete("/series/:id", (req: ExpressRequest, res: ExpressResponse) => {
      const tenantId = getAuthenticatedTenantId(req);
      if (!tenantId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      const ok = this.series.deleteSeriesForTenant(tenantId, req.params.id);
      if (!ok) return res.status(404).json({ error: "Series not found" });
      res.json({ status: "ok" });
    });

    // Comment CTA
    this.router.get("/cta", (req: ExpressRequest, res: ExpressResponse) => {
      const { platform, placement, language, category, limit } = req.query;
      const ctas = this.cta.getBest({
        platform: platform as any,
        placement: placement as any,
        language: language as any,
        category: category as string,
        limit: limit ? parseInt(String(limit)) : 3,
      });
      res.json({ status: "ok", data: ctas });
    });

    this.router.post("/cta/generate", (req: ExpressRequest, res: ExpressResponse) => {
      const { platform, category, language } = req.body;
      if (!platform || !category) return res.status(400).json({ error: "platform and category required" });
      const ctas = this.cta.generate(platform, category, language || "en");
      res.json({ status: "ok", data: ctas });
    });
  }
}
