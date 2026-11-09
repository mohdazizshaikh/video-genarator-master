/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * PublishRouter – Phase 5.5
 *
 * POST /api/publish          – enqueue a video for publishing
 * GET  /api/publish/:id      – get publish job status + attempts
 * GET  /api/publish          – list recent publish jobs
 */
import { Router } from "express";
import type { Request, Response } from "express";
import type { Config } from "../../config";
import { PublishJobStore } from "../../db/PublishJobStore";
import { VideoMetadataStore } from "../../db/VideoMetadataStore";
import type { PlatformType } from "../../types/shorts";
import { MetadataGenerator } from "../../services/MetadataGenerator";
import { getAuthenticatedTenantId, requireAuth } from "../auth";

const ALLOWED_PLATFORMS: PlatformType[] = ["youtube", "telegram", "instagram", "facebook", "linkedin", "x",
];

export class PublishRouter {
  public router: Router;
  private publishJobStore: PublishJobStore;
  private videoMetadataStore: VideoMetadataStore;
  private metadataGenerator: MetadataGenerator;

  constructor(private config: Config) {
    this.router = Router();
    this.publishJobStore = new PublishJobStore(config.dataDirPath);
    this.videoMetadataStore = new VideoMetadataStore(config.dataDirPath);
    this.metadataGenerator = new MetadataGenerator(config);
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.use(express_json_middleware());
    this.router.use(requireAuth);
    this.router.post("/", (req: Request, res: Response) => this.createPublishJob(req, res),
    );
    this.router.post("/metadata-suggestions", (req: Request, res: Response) => this.getMetadataSuggestions(req, res),
    );
    this.router.get("/", (req: Request, res: Response) => this.listPublishJobs(req, res),
    );
    this.router.get("/:id", (req: Request, res: Response) => this.getPublishJob(req, res),
    );
  }

  private async getMetadataSuggestions(req: Request, res: Response,
  ): Promise<void> {
    const { videoId, platform, language = "en",
    } = req.body as {
      videoId?: string;
      platform?: PlatformType;
      language?: string;
    };

    if (!videoId) {
      res.status(400).json({ error: "videoId is required" });
      return;
    }
    if (!platform || !ALLOWED_PLATFORMS.includes(platform)) {
      res.status(400).json({ error: `platform must be one of: ${ALLOWED_PLATFORMS.join(", ")}`,
        });
      return;
    }

    const record = await this.videoMetadataStore.get(
      videoId,
      getAuthenticatedTenantId(req) ?? undefined,
    );
    if (!record) {
      res.status(404).json({ error: "Video metadata not found" });
      return;
    }

    const generated = await this.metadataGenerator.generate(
      platform,
      record.topic,
      record.summary,
      language,
      {
        keywords: record.keywords,
        subcategory: record.subcategory,
        category: record.category,
        headlines: record.headlines,
      },
    );

    res.json({
      videoId,
      platform,
      metadata: generated,
      source: {
        topic: record.topic,
        category: record.category,
        subcategory: record.subcategory,
        keywords: record.keywords,
        headlines: record.headlines,
      },
    });
  }

  private async createPublishJob(req: Request, res: Response): Promise<void> {
    // The legacy endpoint cannot create an unapproved parallel publish path.
    // Creator-facing releases preserve the content/destination approval chain.
    res.status(409).json({
      error: "Publish through an approved release target",
      code: "APPROVED_RELEASE_REQUIRED",
      next: "/api/releases",
    });
  }

  private async listPublishJobs(req: Request, res: Response): Promise<void> {
    const status = req.query["status"] as string | undefined;
    const tenantId = getAuthenticatedTenantId(req) ?? "";
    const jobs = status
      ? await this.publishJobStore.listJobsByStatusForTenant(
          tenantId,
          status as any,
        )
      : await this.publishJobStore.listJobsForTenant(tenantId);
    res.json(jobs);
  }

  private async getPublishJob(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const tenantId = getAuthenticatedTenantId(req) ?? "";
    const job = await this.publishJobStore.getJobForTenant(tenantId, id);
    if (!job) {
      res.status(404).json({ error: "Publish job not found" });
      return;
    }
    const attempts = await this.publishJobStore.getAttemptsForTenant(
      tenantId,
      id,
    );
    res.json({ ...job, attempts });
  }
}

// Helper – express.json() as inline middleware factory
function express_json_middleware() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const express = require("express") as typeof import("express");
  return express.json();
}
