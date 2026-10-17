import { Router, json } from "express";
import type { Request, Response } from "express";
import { ContentBucketEngine } from "../../services/ContentBucketEngine";
import type { Config } from "../../config";
import { requireAuth } from "../auth";



export class ContentBucketsRouter {
  public router: Router;
  private engine: ContentBucketEngine;

  constructor(config: Config) {
    this.router = Router();
    this.router.use(json());
    this.engine = new ContentBucketEngine(config.dataDirPath);
    this.register();
  }

  private register() {
    this.router.use(requireAuth);

    this.router.get("/stats", (_req: Request, res: Response) => {
      res.json({ status: "ok", data: this.engine.getStats() });
    });

    this.router.get("/next", (_req: Request, res: Response) => {
      res.json({ status: "ok", data: { bucket: this.engine.getNextRecommendedBucket() } });
    });

    this.router.post("/add", (req: Request, res: Response) => {
      const { videoId, title, category, bucketOverride } = req.body;
      if (!videoId || !title) { res.status(400).json({ error: "videoId and title required" }); return; }
      res.status(201).json({ status: "ok", data: this.engine.addContent(videoId, title, category || "General", bucketOverride) });
    });

    this.router.post("/detect", (req: Request, res: Response) => {
      const { title, category } = req.body;
      if (!title) { res.status(400).json({ error: "title required" }); return; }
      res.json({ status: "ok", data: { bucket: this.engine.detectBucket(title, category || "General") } });
    });
  }
}
