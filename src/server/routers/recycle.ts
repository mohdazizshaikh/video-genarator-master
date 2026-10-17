import express from "express";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { ContentRecycleEngine } from "../../services/ContentRecycleEngine";
import { ContentFreshnessEngine } from "../../services/ContentFreshnessEngine";
import { AntiDuplicationEngine } from "../../services/AntiDuplicationEngine";
import { Config } from "../../config";
import { requireAuth } from "../auth";



export class RecycleRouter {
  public router: express.Router;
  private recycleEngine: ContentRecycleEngine;
  private freshnessEngine: ContentFreshnessEngine;
  private dedupeEngine: AntiDuplicationEngine;

  constructor(config: Config) {
    this.router = express.Router();
    this.recycleEngine = new ContentRecycleEngine(config.dataDirPath);
    this.freshnessEngine = new ContentFreshnessEngine(config.dataDirPath);
    this.dedupeEngine = new AntiDuplicationEngine(config.dataDirPath);
    this.router.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes() {
    this.router.use(requireAuth);

    this.router.get("/candidates", (_req: ExpressRequest, res: ExpressResponse) => {
      res.json({ status: "ok", data: this.recycleEngine.getCandidates() });
    });

    this.router.get("/stats", (_req: ExpressRequest, res: ExpressResponse) => {
      res.json({ status: "ok", data: this.recycleEngine.getStats() });
    });

    this.router.post("/register", (req: ExpressRequest, res: ExpressResponse) => {
      const { videoId, title, category, isEvergreen } = req.body;
      if (!videoId || !title || !category) return res.status(400).json({ error: "videoId, title, category required" });
      this.recycleEngine.register(videoId, title, category, isEvergreen);
      res.json({ status: "ok" });
    });

    this.router.patch("/:videoId/metrics", (req: ExpressRequest, res: ExpressResponse) => {
      const { viewCount, engagementScore } = req.body;
      this.recycleEngine.updateMetrics(req.params.videoId, viewCount || 0, engagementScore || 0);
      res.json({ status: "ok" });
    });

    this.router.post("/:videoId/recycle", (req: ExpressRequest, res: ExpressResponse) => {
      this.recycleEngine.markRecycled(req.params.videoId);
      res.json({ status: "ok", message: "Marked as recycled" });
    });

    this.router.post("/freshness/check", (req: ExpressRequest, res: ExpressResponse) => {
      const { keyword, category } = req.body;
      if (!keyword || !category) return res.status(400).json({ error: "keyword and category required" });
      const result = this.freshnessEngine.check(keyword, category);
      res.json({ status: "ok", data: result });
    });

    this.router.post("/freshness/record", (req: ExpressRequest, res: ExpressResponse) => {
      const { keyword, category } = req.body;
      if (!keyword || !category) return res.status(400).json({ error: "keyword and category required" });
      this.freshnessEngine.record(keyword, category);
      res.json({ status: "ok" });
    });

    this.router.post("/dedupe/check", (req: ExpressRequest, res: ExpressResponse) => {
      const { title, keywords, category } = req.body;
      if (!title || !category) return res.status(400).json({ error: "title and category required" });
      const result = this.dedupeEngine.check(title, keywords || [], category);
      res.json({ status: "ok", data: result });
    });

    this.router.get("/dedupe/stats", (_req: ExpressRequest, res: ExpressResponse) => {
      res.json({ status: "ok", data: this.dedupeEngine.getStats() });
    });
  }
}
