/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * VideoLibraryRouter – Full CRUD + search + stats for video library
 *
 * GET    /api/videolibrary           – list videos (with pagination, filter)
 * POST   /api/videolibrary           – create video record
 * GET    /api/videolibrary/stats     – library statistics
 * GET    /api/videolibrary/tags      – trending tags
 * GET    /api/videolibrary/search    – search videos
 * GET    /api/videolibrary/:id       – get single video
 * PATCH  /api/videolibrary/:id       – update video
 * DELETE /api/videolibrary/:id       – delete video
 * PATCH  /api/videolibrary/:id/status    – update status only
 * PATCH  /api/videolibrary/:id/metrics   – update engagement metrics
 */
import { Router } from "express";
import type { Request, Response } from "express";
import express from "express";
import type { Config } from "../../config";
import { VideoLibraryStore } from "../../db/VideoLibraryStore";
import { logger } from "../../logger";
import { getAuthenticatedTenantId, requireAuth } from "../auth";

export class VideoLibraryRouter {
  public router: Router;
  private store: VideoLibraryStore;

  constructor(config: Config) {
    this.router = Router();
    this.store = new VideoLibraryStore(config.dataDirPath);
    this.router.use(express.json());
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.use(requireAuth);

    this.router.get("/search", (req: Request, res: Response) => this.searchVideos(req, res));
    this.router.get("/stats", (req: Request, res: Response) => this.getStats(req, res));
    this.router.get("/tags", (req: Request, res: Response) => this.getTrendingTags(req, res));
    this.router.get("/", (req: Request, res: Response) => this.listVideos(req, res));
    this.router.post("/", (req: Request, res: Response) => this.createVideo(req, res));
    this.router.get("/:id", (req: Request, res: Response) => this.getVideo(req, res));
    this.router.patch("/:id/status", (req: Request, res: Response) => this.updateStatus(req, res));
    this.router.patch("/:id/metrics", (req: Request, res: Response) => this.updateMetrics(req, res));
    this.router.patch("/:id", (req: Request, res: Response) => this.updateVideo(req, res));
    this.router.delete("/:id", (req: Request, res: Response) => this.deleteVideo(req, res));
  }

  private async listVideos(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(parseInt(String(req.query["limit"] || "50")), 200);
      const offset = parseInt(String(req.query["offset"] || "0"));
      const category = req.query["category"] as string | undefined;
      const status = req.query["status"] as string | undefined;
      const platform = req.query["platform"] as string | undefined;

      const tenantId = getAuthenticatedTenantId(req) ?? "";
      let videos;
      if (category) {
        const result = (await this.store.listForTenant(tenantId, 200, 0)).videos.filter((video) => video.category === category).slice(offset, offset + limit);
        videos = result;
        res.json({ status: "ok", videos, total: videos.length });
        return;
      }
      if (status) {
        const result = (await this.store.listForTenant(tenantId, 200, 0)).videos.filter((video) => video.status === status).slice(offset, offset + limit);
        videos = result;
        res.json({ status: "ok", videos, total: videos.length });
        return;
      }
      if (platform) {
        const result = (await this.store.listForTenant(tenantId, 200, 0)).videos.filter((video) => video.platform === platform).slice(offset, offset + limit);
        videos = result;
        res.json({ status: "ok", videos, total: videos.length });
        return;
      }

      const result = await this.store.listForTenant(tenantId, limit, offset);
      res.json({ status: "ok", ...result });
    } catch (err) {
      logger.error(err, "VideoLibrary: list failed");
      res.status(500).json({ status: "error", error: "Failed to list videos" });
    }
  }

  private async createVideo(req: Request, res: Response): Promise<void> {
    try {
      const {
        title,
        description = "",
        category = "General",
        subcategory,
        duration = 0,
        platform = "youtube",
        status = "draft",
        videoPath,
        thumbnailPath,
        tags = [],
        engagementMetrics,
        publishedAt,
        scheduledFor,
      } = req.body as any;

      if (!title || typeof title !== "string") {
        res.status(400).json({ error: "title is required" });
        return;
      }

      const record = await this.store.create({
        tenantId: getAuthenticatedTenantId(req) ?? "",
        title,
        description,
        category,
        subcategory,
        duration,
        platform,
        status,
        videoPath,
        thumbnailPath,
        tags: Array.isArray(tags) ? tags : [],
        engagementMetrics: engagementMetrics || { views: 0, likes: 0, comments: 0, shares: 0 },
        publishedAt,
        scheduledFor,
      });

      res.status(201).json({ status: "ok", video: record });
    } catch (err) {
      logger.error(err, "VideoLibrary: create failed");
      res.status(500).json({ status: "error", error: "Failed to create video" });
    }
  }

  private async getVideo(req: Request, res: Response): Promise<void> {
    try {
      const video = await this.store.getForTenant(getAuthenticatedTenantId(req) ?? "", req.params.id);
      if (!video) {
        res.status(404).json({ error: "Video not found" });
        return;
      }
      res.json({ status: "ok", video });
    } catch (err) {
      logger.error(err, "VideoLibrary: get failed");
      res.status(500).json({ status: "error", error: "Failed to get video" });
    }
  }

  private async updateVideo(req: Request, res: Response): Promise<void> {
    try {
      const updated = await this.store.updateForTenant(getAuthenticatedTenantId(req) ?? "", req.params.id, req.body);
      if (!updated) {
        res.status(404).json({ error: "Video not found" });
        return;
      }
      res.json({ status: "ok", video: updated });
    } catch (err) {
      logger.error(err, "VideoLibrary: update failed");
      res.status(500).json({ status: "error", error: "Failed to update video" });
    }
  }

  private async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.body as { status: string };
      const allowed = ["draft", "published", "scheduled", "archived"];
      if (!status || !allowed.includes(status)) {
        res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
        return;
      }
      const updated = await this.store.updateStatusForTenant(getAuthenticatedTenantId(req) ?? "", req.params.id, status as any);
      if (!updated) {
        res.status(404).json({ error: "Video not found" });
        return;
      }
      res.json({ status: "ok", video: updated });
    } catch (err) {
      logger.error(err, "VideoLibrary: updateStatus failed");
      res.status(500).json({ status: "error", error: "Failed to update status" });
    }
  }

  private async updateMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { views, likes, comments, shares } = req.body as any;
      const updated = await this.store.updateMetricsForTenant(getAuthenticatedTenantId(req) ?? "", req.params.id, { views, likes, comments, shares });
      if (!updated) {
        res.status(404).json({ error: "Video not found" });
        return;
      }
      res.json({ status: "ok", video: updated });
    } catch (err) {
      logger.error(err, "VideoLibrary: updateMetrics failed");
      res.status(500).json({ status: "error", error: "Failed to update metrics" });
    }
  }

  private async deleteVideo(req: Request, res: Response): Promise<void> {
    try {
      const deleted = await this.store.deleteForTenant(getAuthenticatedTenantId(req) ?? "", req.params.id);
      if (!deleted) {
        res.status(404).json({ error: "Video not found" });
        return;
      }
      res.json({ status: "ok", message: "Video deleted successfully" });
    } catch (err) {
      logger.error(err, "VideoLibrary: delete failed");
      res.status(500).json({ status: "error", error: "Failed to delete video" });
    }
  }

  private async searchVideos(req: Request, res: Response): Promise<void> {
    try {
      const q = req.query["q"] as string;
      if (!q || q.trim().length < 2) {
        res.status(400).json({ error: "Search query must be at least 2 characters" });
        return;
      }
      const limit = Math.min(parseInt(String(req.query["limit"] || "50")), 200);
      const offset = parseInt(String(req.query["offset"] || "0"));
      const videos = await this.store.searchForTenant(getAuthenticatedTenantId(req) ?? "", q, limit, offset);
      res.json({ status: "ok", videos, query: q });
    } catch (err) {
      logger.error(err, "VideoLibrary: search failed");
      res.status(500).json({ status: "error", error: "Search failed" });
    }
  }

  private async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.store.getStatsForTenant(getAuthenticatedTenantId(req) ?? "");
      res.json({ status: "ok", stats });
    } catch (err) {
      logger.error(err, "VideoLibrary: stats failed");
      res.status(500).json({ status: "error", error: "Failed to get stats" });
    }
  }

  private async getTrendingTags(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(String(req.query["limit"] || "20"));
      const tags = await this.store.getTrendingTagsForTenant(getAuthenticatedTenantId(req) ?? "", limit);
      res.json({ status: "ok", tags });
    } catch (err) {
      logger.error(err, "VideoLibrary: tags failed");
      res.status(500).json({ status: "error", error: "Failed to get tags" });
    }
  }
}
