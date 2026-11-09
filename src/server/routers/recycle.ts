import {
  TenantEngineScope,
  tenantEngineAt,
} from "../../services/TenantEngineScope";
import express from "express";
import type { Request as ExpressRequest, Response as ExpressResponse,
} from "express";
import { ContentRecycleEngine } from "../../services/ContentRecycleEngine";
import { ContentFreshnessEngine } from "../../services/ContentFreshnessEngine";
import { AntiDuplicationEngine } from "../../services/AntiDuplicationEngine";
import { Config } from "../../config";
import { requireAuth, requireWorkspace } from "../auth";



export class RecycleRouter {
  public router: express.Router;
  private scoped: TenantEngineScope<{
    recycleEngine: ContentRecycleEngine;
    freshnessEngine: ContentFreshnessEngine;
    dedupeEngine: AntiDuplicationEngine;
  }>;

  constructor(config: Config) {
    this.router = express.Router();
    this.scoped = new TenantEngineScope(config.dataDirPath, (directory) => ({
      recycleEngine: tenantEngineAt(directory, ContentRecycleEngine),
      freshnessEngine: tenantEngineAt(directory, ContentFreshnessEngine),
      dedupeEngine: tenantEngineAt(directory, AntiDuplicationEngine),
    }));
    this.router.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes() {
    this.router.use(requireAuth, requireWorkspace);

    this.router.get("/candidates", (req: ExpressRequest, res: ExpressResponse) => {
      res.json({ status: "ok", data: this.scoped.forRequest(req).recycleEngine.getCandidates(),
        });
    },
    );

    this.router.get("/stats", (req: ExpressRequest, res: ExpressResponse) => {
      res.json({ status: "ok", data: this.scoped.forRequest(req).recycleEngine.getStats(),
      });
    });

    this.router.post("/register", (req: ExpressRequest, res: ExpressResponse) => {
      const { videoId, title, category, isEvergreen } = req.body;
      if (!videoId || !title || !category) return res.status(400).json({ error: "videoId, title, category required" });
      this.scoped
          .forRequest(req)
          .recycleEngine.register(videoId, title, category, isEvergreen);
      res.json({ status: "ok" });
    },
    );

    this.router.patch("/:videoId/metrics", (req: ExpressRequest, res: ExpressResponse) => {
      const { viewCount, engagementScore } = req.body;
      this.scoped
          .forRequest(req)
          .recycleEngine.updateMetrics(req.params.videoId, viewCount || 0, engagementScore || 0,
          );
      res.json({ status: "ok" });
    },
    );

    this.router.post("/:videoId/recycle", (req: ExpressRequest, res: ExpressResponse) => {
      this.scoped
          .forRequest(req)
          .recycleEngine.markRecycled(req.params.videoId);
      res.json({ status: "ok", message: "Marked as recycled" });
    },
    );

    this.router.post("/freshness/check", (req: ExpressRequest, res: ExpressResponse) => {
      const { keyword, category } = req.body;
      if (!keyword || !category) return res.status(400).json({ error: "keyword and category required" });
      const result = this.scoped
          .forRequest(req)
          .freshnessEngine.check(keyword, category);
      res.json({ status: "ok", data: result });
    },
    );

    this.router.post("/freshness/record", (req: ExpressRequest, res: ExpressResponse) => {
      const { keyword, category } = req.body;
      if (!keyword || !category) return res.status(400).json({ error: "keyword and category required" });
      this.scoped.forRequest(req).freshnessEngine.record(keyword, category);
      res.json({ status: "ok" });
    },
    );

    this.router.post("/dedupe/check", (req: ExpressRequest, res: ExpressResponse) => {
      const { title, keywords, category } = req.body;
      if (!title || !category) return res.status(400).json({ error: "title and category required" });
      const result = this.scoped
          .forRequest(req)
          .dedupeEngine.check(title, keywords || [], category);
      res.json({ status: "ok", data: result });
    },
    );

    this.router.get("/dedupe/stats", (req: ExpressRequest, res: ExpressResponse) => {
      res.json({ status: "ok", data: this.scoped.forRequest(req).dedupeEngine.getStats(),
        });
    },
    );
  }
}
