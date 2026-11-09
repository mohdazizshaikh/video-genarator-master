import {
  TenantEngineScope,
  tenantEngineAt,
} from "../../services/TenantEngineScope";
import { Router, json } from "express";
import type { Request, Response } from "express";
import { ContentBucketEngine } from "../../services/ContentBucketEngine";
import type { Config } from "../../config";
import { requireAuth, requireWorkspace } from "../auth";



export class ContentBucketsRouter {
  public router: Router;
  private scoped: TenantEngineScope<{ engine: ContentBucketEngine }>;

  constructor(config: Config) {
    this.router = Router();
    this.scoped = new TenantEngineScope(config.dataDirPath, (directory) => ({
      engine: tenantEngineAt(directory, ContentBucketEngine),
    }));
    this.router.use(json());
    this.register();
  }

  private register() {
    this.router.use(requireAuth, requireWorkspace);

    this.router.get("/stats", (req: Request, res: Response) => {
      res.json({ status: "ok", data: this.scoped.forRequest(req).engine.getStats(),
      });
    });

    this.router.get("/next", (req: Request, res: Response) => {
      res.json({ status: "ok", data: { bucket: this.scoped.forRequest(req).engine.getNextRecommendedBucket(),
        },
      });
    });

    this.router.post("/add", (req: Request, res: Response) => {
      const { videoId, title, category, bucketOverride } = req.body;
      if (!videoId || !title) { res.status(400).json({ error: "videoId and title required" }); return; }
      res.status(201).json({ status: "ok", data: this.scoped
            .forRequest(req)
            .engine.addContent(videoId, title, category || "General", bucketOverride,
            ),
        });
    });

    this.router.post("/detect", (req: Request, res: Response) => {
      const { title, category } = req.body;
      if (!title) { res.status(400).json({ error: "title required" }); return; }
      res.json({ status: "ok", data: { bucket: this.scoped
            .forRequest(req)
            .engine.detectBucket(title, category || "General"),
        },
      });
    });
  }
}
