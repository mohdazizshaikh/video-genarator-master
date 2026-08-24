import express from "express";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { ShadowbanDetectionEngine } from "../../services/ShadowbanDetectionEngine";
import { BestTimeLearningEngine } from "../../services/BestTimeLearningEngine";
import { HashtagLearningEngine } from "../../services/HashtagLearningEngine";
import { SkipAnalysisEngine } from "../../services/SkipAnalysisEngine";
import { HumanMimicryEngine } from "../../services/HumanMimicryEngine";
import { Config } from "../../config";
import { getAuthenticatedTenantId } from "../auth";

export class ShadowbanRouter {
  public router: express.Router;
  private shadowban: ShadowbanDetectionEngine;
  private bestTime: BestTimeLearningEngine;
  private hashtag: HashtagLearningEngine;
  private skipAnalysis: SkipAnalysisEngine;
  private humanMimicry: HumanMimicryEngine;

  constructor(config: Config) {
    this.router = express.Router();
    this.shadowban = new ShadowbanDetectionEngine(config.dataDirPath);
    this.bestTime = new BestTimeLearningEngine(config.dataDirPath);
    this.hashtag = new HashtagLearningEngine(config.dataDirPath);
    this.skipAnalysis = new SkipAnalysisEngine(config.dataDirPath);
    this.humanMimicry = new HumanMimicryEngine();
    this.router.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes() {
    // Shadowban
    this.router.get("/", (_req: ExpressRequest, res: ExpressResponse) => {
      res.json({ status: "ok", data: this.shadowban.getAllStatuses() });
    });

    this.router.post("/metrics", (req: ExpressRequest, res: ExpressResponse) => {
      const m = req.body;
      this.shadowban.recordMetrics(m);
      res.json({ status: "ok" });
    });

    this.router.get("/analyze/:platform/:accountId", (req: ExpressRequest, res: ExpressResponse) => {
      const result = this.shadowban.analyze(req.params.platform, req.params.accountId);
      res.json({ status: "ok", data: result });
    });

    // Best time
    this.router.get("/best-time/:platform", (req: ExpressRequest, res: ExpressResponse) => {
      const result = this.bestTime.getBestTimes(req.params.platform, req.query.category as string);
      const nextTime = this.bestTime.getNextBestTime(req.params.platform);
      res.json({ status: "ok", data: { ...result, nextBestTime: nextTime } });
    });

    this.router.post("/best-time/record", (req: ExpressRequest, res: ExpressResponse) => {
      const { platform, category, publishedAt, engagement, views, likes } = req.body;
      this.bestTime.recordPerformance(platform, category, new Date(publishedAt), engagement, views, likes);
      res.json({ status: "ok" });
    });

    // Hashtag learning
    this.router.get("/hashtags/:platform", (req: ExpressRequest, res: ExpressResponse) => {
      const reco = this.hashtag.recommend(req.params.platform, req.query.category as string || "General");
      res.json({ status: "ok", data: reco });
    });

    this.router.get("/hashtags/:platform/trending", (req: ExpressRequest, res: ExpressResponse) => {
      res.json({ status: "ok", data: this.hashtag.getTrending(req.params.platform) });
    });

    this.router.post("/hashtags/record", (req: ExpressRequest, res: ExpressResponse) => {
      const { hashtag, platform, category, impressions, reach, engagement } = req.body;
      this.hashtag.recordPerformance(hashtag, platform, category, impressions, reach, engagement);
      res.json({ status: "ok" });
    });

    // Skip analysis
    this.router.get("/skip/:platform/:category", (req: ExpressRequest, res: ExpressResponse) => {
      const tenantId = getAuthenticatedTenantId(req);
      if (!tenantId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      res.json({ status: "ok", data: this.skipAnalysis.analyzeForTenant(tenantId, req.params.category, req.params.platform) });
    });

    this.router.post("/skip/record", (req: ExpressRequest, res: ExpressResponse) => {
      const tenantId = getAuthenticatedTenantId(req);
      if (!tenantId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      const { videoId, category, platform, at3sec, at10sec, at30sec, avgWatchPercent } = req.body;
      if (!videoId || !category || !platform) return res.status(400).json({ error: "videoId, category, and platform required" });
      this.skipAnalysis.recordForTenant(tenantId, videoId, category, platform, { at3sec, at10sec, at30sec, avgWatchPercent });
      res.json({ status: "ok" });
    });

    // Human mimicry
    this.router.post("/humanize-schedule", (req: ExpressRequest, res: ExpressResponse) => {
      const { scheduledTime, hashtags } = req.body;
      const result = this.humanMimicry.humanizeSchedule(new Date(scheduledTime), hashtags || []);
      res.json({ status: "ok", data: result });
    });
  }
}
