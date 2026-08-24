import express from "express";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import path from "path";
import fs from "fs-extra";
import { logger } from "../../logger";
import { Config } from "../../config";
import { RepurposeEngine } from "../../services/RepurposeEngine";
import { getAuthenticatedTenantId } from "../auth";
import { ArtifactManifestStore } from "../../db/ArtifactManifestStore";

/**
 * RepurposeRouter – long-form video → short clips (OpusClip-style, OSS).
 *
 * POST /api/repurpose   { videoPath, clipSeconds?, maxClips? }
 * GET  /api/repurpose   list clips for a source (query: videoPath)
 *
 * The heavy Whisper+ffmpeg engine is lazily initialized on first request so
 * the server stays responsive at boot.
 */
export class RepurposeRouter {
  public router: express.Router;
  private config: Config;
  private engine: RepurposeEngine | null = null;
  private enginePromise: Promise<RepurposeEngine> | null = null;
  private manifests: ArtifactManifestStore;

  constructor(config: Config) {
    this.config = config;
    this.manifests = new ArtifactManifestStore(config.dataDirPath);
    this.router = express.Router();
    this.router.use(express.json());
    this.setupRoutes();
  }

  private getEngine(): Promise<RepurposeEngine> {
    if (!this.enginePromise) {
      this.enginePromise = RepurposeEngine.create(this.config)
        .then((engine) => {
          this.engine = engine;
          logger.info("RepurposeEngine ready (Whisper + ffmpeg initialized)");
          return engine;
        })
        .catch((err: unknown) => {
          this.enginePromise = null;
          throw err;
        });
    }
    return this.enginePromise;
  }

  private resolveVideoPath(videoPath: string): string | null {
    const videosDir = path.resolve(this.config.videosDirPath);
    const abs = path.resolve(videoPath);
    const insideVideos = abs === videosDir || abs.startsWith(videosDir + path.sep);
    const exists = fs.existsSync(abs) && fs.statSync(abs).isFile();
    const allowedExt = /\.(mp4|mov|mkv|webm|m4v)$/i.test(abs);
    if (!insideVideos || !exists || !allowedExt) {
      return null;
    }
    return abs;
  }

  private setupRoutes(): void {
    this.router.post("/", async (req: ExpressRequest, res: ExpressResponse) => {
      const tenantId = getAuthenticatedTenantId(req);
      if (!tenantId) {
        res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
        return;
      }
      const { videoPath, clipSeconds, maxClips } = req.body as {
        videoPath?: string;
        clipSeconds?: number;
        maxClips?: number;
      };

      if (!videoPath || typeof videoPath !== "string") {
        res.status(400).json({ error: "videoPath is required" });
        return;
      }
      const resolved = this.resolveVideoPath(videoPath);
      if (!resolved) {
        res.status(400).json({
          error:
            "videoPath must be an existing video file inside the videos directory (mp4/mov/mkv/webm/m4v)",
        });
        return;
      }

      try {
        const engine = await this.getEngine();
        const clips = await engine.repurpose(resolved, {
          tenantId,
          clipSeconds: clipSeconds || undefined,
          maxClips: maxClips || undefined,
        });
        for (const clip of clips) {
          await this.manifests.register({ tenantId, kind: "repurposed-video", localPath: clip.outputPath, mimeType: "video/mp4", lifecycle: "active" });
        }
        res.json({
          status: "ok",
          source: resolved,
          clips: clips.map((clip) => ({
            ...clip,
            outputPath: undefined,
            fileName: clip.fileName,
          })),
        });
      } catch (err) {
        logger.error({ err, videoPath }, "Repurpose failed");
        res.status(500).json({ error: (err as Error).message });
      }
    });

    this.router.get("/", (req: ExpressRequest, res: ExpressResponse) => {
      const tenantId = getAuthenticatedTenantId(req);
      if (!tenantId) {
        res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
        return;
      }
      const ownerPrefix = `${tenantId.replace(/[^a-zA-Z0-9_-]/g, "-")}__`;
      const videoPath = String(req.query["videoPath"] || "");
      if (!videoPath) {
        res.status(400).json({ error: "videoPath query param is required" });
        return;
      }
      const resolved = this.resolveVideoPath(videoPath);
      if (!resolved) {
        res.status(400).json({ error: "invalid videoPath" });
        return;
      }
      const base = path.basename(resolved, path.extname(resolved));
      const dir = path.join(this.config.videosDirPath, "repurposed", base);
      let clips: Array<{ fileName: string; sizeBytes: number }> = [];
      if (fs.existsSync(dir)) {
        clips = fs
          .readdirSync(dir)
          .filter((f) => f.startsWith(ownerPrefix) && f.endsWith(".mp4") && !f.endsWith(".wav"))
          .map((f) => ({
            fileName: f,
            sizeBytes: fs.statSync(path.join(dir, f)).size,
          }));
      }
      res.json({ status: "ok", clips });
    });
  }
}