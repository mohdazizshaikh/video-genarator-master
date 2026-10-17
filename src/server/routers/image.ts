/* eslint-disable @typescript-eslint/no-explicit-any */

import express from "express";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import path from "path";
import { logger } from "../../logger";
import { Config } from "../../config";
import { ImageFiltersEngine } from "../../services/ImageFiltersEngine";
import type { FilterType, FilterOptions } from "../../services/ImageFiltersEngine";
import { getAuthenticatedTenantId, requireAuth } from "../auth";
import { ArtifactManifestStore } from "../../db/ArtifactManifestStore";

function safePathInDir(dirPath: string, fileName: string): string | null {
  const base = path.resolve(dirPath);
  const candidate = path.resolve(base, path.basename(fileName));
  if (candidate !== path.join(base, path.basename(fileName))) return null;
  if (path.dirname(candidate) !== base) return null;
  if (!candidate.startsWith(base + path.sep)) return null;
  return candidate;
}

export class ImageRouter {
  public router: express.Router;
  private config: Config;
  private engine: any;
  private filtersEngine: ImageFiltersEngine;
  private manifests: ArtifactManifestStore;

  constructor(config: Config) {
    this.router = express.Router();
    this.config = config;
    this.filtersEngine = new ImageFiltersEngine(config.dataDirPath);
    this.manifests = new ArtifactManifestStore(config.dataDirPath);
    this.router.use(express.json());
    this.setupRoutes();
    this.initEngine();
  }

  private async initEngine() {
    try {
      const { ImageGenerationEngine } = await import("../../services/ImageGenerationEngine.js");
      this.engine = new ImageGenerationEngine(this.config.dataDirPath);
    } catch (err) {
      logger.warn({ err: (err as Error).message }, "ImageGenerationEngine not available (canvas may not be installed)");
    }
  }

  private setupRoutes() {
    this.router.use(requireAuth);

    const tenantPrefix = (req: ExpressRequest): string | null => {
      const tenantId = getAuthenticatedTenantId(req);
      return tenantId ? `${tenantId.replace(/[^a-zA-Z0-9_-]/g, "-")}__` : null;
    };
    const ownerFileName = (req: ExpressRequest, fileName: string): string | null => {
      const prefix = tenantPrefix(req);
      return prefix && fileName.startsWith(prefix) ? fileName : null;
    };

    // ---- Image Generation ----
    this.router.post("/generate", async (req: ExpressRequest, res: ExpressResponse) => {
      if (!this.engine) return res.status(503).json({ error: "Image engine not available — install canvas package" });
      try {
        const tenantId = getAuthenticatedTenantId(req);
        if (!tenantId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
        const result = await this.engine.generate({ ...req.body, tenantId });
        await this.manifests.register({ tenantId, kind: "generated-image", localPath: result.filePath, mimeType: result.filePath.endsWith(".svg") ? "image/svg+xml" : "image/png", lifecycle: "active" });
        res.json({ status: "ok", data: { ...result, filePath: undefined, fileName: path.basename(result.filePath) } });
      } catch (err) {
        logger.error(err, "Image generation error");
        res.status(500).json({ error: (err as Error).message });
      }
    });

    this.router.post("/quote-card", async (req: ExpressRequest, res: ExpressResponse) => {
      if (!this.engine) return res.status(503).json({ error: "Image engine not available" });
      const { quote, author, category } = req.body;
      if (!quote) return res.status(400).json({ error: "quote required" });
      try {
        const tenantId = getAuthenticatedTenantId(req);
        if (!tenantId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
        const result = await this.engine.generateQuoteCard(quote, author, category, tenantId);
        await this.manifests.register({ tenantId, kind: "generated-image", localPath: result.filePath, mimeType: result.filePath.endsWith(".svg") ? "image/svg+xml" : "image/png", lifecycle: "active" });
        res.json({ status: "ok", data: { ...result, fileName: path.basename(result.filePath) } });
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    });

    this.router.post("/thumbnail", async (req: ExpressRequest, res: ExpressResponse) => {
      if (!this.engine) return res.status(503).json({ error: "Image engine not available" });
      const { title, category } = req.body;
      if (!title) return res.status(400).json({ error: "title required" });
      try {
        const tenantId = getAuthenticatedTenantId(req);
        if (!tenantId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
        const result = await this.engine.generateThumbnail(title, category, tenantId);
        await this.manifests.register({ tenantId, kind: "generated-image", localPath: result.filePath, mimeType: result.filePath.endsWith(".svg") ? "image/svg+xml" : "image/png", lifecycle: "active" });
        res.json({ status: "ok", data: { ...result, fileName: path.basename(result.filePath) } });
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    });

    this.router.post("/announcement", async (req: ExpressRequest, res: ExpressResponse) => {
      if (!this.engine) return res.status(503).json({ error: "Image engine not available" });
      const { title, subtitle, platform } = req.body;
      if (!title) return res.status(400).json({ error: "title required" });
      try {
        const tenantId = getAuthenticatedTenantId(req);
        if (!tenantId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
        const result = await this.engine.generateAnnouncement(title, subtitle, platform, tenantId);
        await this.manifests.register({ tenantId, kind: "generated-image", localPath: result.filePath, mimeType: result.filePath.endsWith(".svg") ? "image/svg+xml" : "image/png", lifecycle: "active" });
        res.json({ status: "ok", data: { ...result, fileName: path.basename(result.filePath) } });
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    });

    this.router.get("/file/:fileName", async (req: ExpressRequest, res: ExpressResponse) => {
      const fileName = ownerFileName(req, req.params.fileName);
      const filePath = fileName ? safePathInDir(path.join(this.config.dataDirPath, "generated-images"), fileName) : null;
      if (!filePath) return res.status(404).json({ error: "File not found" });
      res.sendFile(filePath, (err) => {
        if (err) res.status(404).json({ error: "File not found" });
      });
    });

    // ---- Image Filters ----

    /**
     * GET /api/image/filters
     * Returns all available filter presets
     */
    this.router.get("/filters", (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const platform = req.query["platform"] as string | undefined;
        const presets = platform
          ? this.filtersEngine.getPresetsForPlatform(platform)
          : this.filtersEngine.getPresets();
        res.json({ status: "ok", filters: presets, total: presets.length });
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    });

    /**
     * GET /api/image/filters/:filterId
     * Returns a single filter preset detail
     */
    this.router.get("/filters/:filterId", (req: ExpressRequest, res: ExpressResponse) => {
      const preset = this.filtersEngine.getPreset(req.params.filterId as FilterType);
      if (!preset) return res.status(404).json({ error: "Filter not found" });
      const cssFilter = this.filtersEngine.buildCssFilter({ filter: req.params.filterId as FilterType, ...preset.defaultOptions });
      res.json({ status: "ok", preset, cssFilter });
    });

    /**
     * POST /api/image/filters/css
     * Convert filter options to CSS filter string
     * Body: { filter, intensity?, brightness?, contrast?, saturation?, hue?, blur? }
     */
    this.router.post("/filters/css", (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const options = req.body as FilterOptions;
        if (!options.filter) return res.status(400).json({ error: "filter is required" });
        const cssFilter = this.filtersEngine.buildCssFilter(options);
        const svgFilter = this.filtersEngine.buildSvgFilter(options);
        res.json({ status: "ok", cssFilter, svgFilter, filter: options.filter });
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    });

    /**
     * POST /api/image/filters/preview
     * Generate a filter preview image (SVG)
     * Body: { filter, title?, intensity?, width?, height? }
     */
    this.router.post("/filters/preview", async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const { filter, title, intensity = 100, width = 400, height = 300 } = req.body as any;
        if (!filter) return res.status(400).json({ error: "filter is required" });
        const tenantId = getAuthenticatedTenantId(req);
        if (!tenantId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
        const options: FilterOptions = { filter, intensity, tenantId };
        const filePath = await this.filtersEngine.generateFilterPreview(
          title || filter,
          options,
          width,
          height,
        );
        await this.manifests.register({ tenantId, kind: "filtered-image", localPath: filePath, mimeType: "image/svg+xml", lifecycle: "active" });
        res.json({
          status: "ok",
          preview: { filePath: undefined, fileName: path.basename(filePath), filter },
        });
      } catch (err) {
        logger.error(err, "Filter preview error");
        res.status(500).json({ error: (err as Error).message });
      }
    });

    /**
     * GET /api/image/filters/preview/file/:fileName
     * Serve generated filter preview file
     */
    this.router.get("/filters/preview/file/:fileName", (req: ExpressRequest, res: ExpressResponse) => {
      const fileName = ownerFileName(req, req.params.fileName);
      const filePath = fileName ? safePathInDir(path.join(this.config.dataDirPath, "filtered-images"), fileName) : null;
      if (!filePath) return res.status(404).json({ error: "File not found" });
      res.sendFile(filePath, (err) => {
        if (err) res.status(404).json({ error: "Filter preview file not found" });
      });
    });

    /**
     * POST /api/image/filters/apply
     * Apply a filter to an existing image
     * Body: { fileName, filter, intensity?, brightness?, contrast?, saturation? }
     */
    this.router.post("/filters/apply", async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const { fileName, filter, ...rest } = req.body as any;
        if (!fileName) return res.status(400).json({ error: "fileName is required" });
        if (!filter) return res.status(400).json({ error: "filter is required" });

        const ownedInput = ownerFileName(req, fileName);
        const inputPath = ownedInput ? safePathInDir(path.join(this.config.dataDirPath, "generated-images"), ownedInput) : null;
        if (!inputPath) return res.status(404).json({ error: "File not found" });
        const tenantId = getAuthenticatedTenantId(req);
        if (!tenantId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
        const options: FilterOptions = { filter, ...rest, tenantId };

        const ext = path.extname(fileName).toLowerCase();
        const outputPath = ext === ".svg"
          ? await this.filtersEngine.applyFilterToSvg(inputPath, options)
          : await this.filtersEngine.applyFilterToCanvas(inputPath, options);
        await this.manifests.register({ tenantId, kind: "filtered-image", localPath: outputPath, mimeType: outputPath.endsWith(".svg") ? "image/svg+xml" : "image/png", lifecycle: "active" });

        res.json({
          status: "ok",
          result: {
            inputFileName: fileName,
            outputFileName: path.basename(outputPath),
            filter,
          },
        });
      } catch (err) {
        logger.error(err, "Filter apply error");
        res.status(500).json({ error: (err as Error).message });
      }
    });

    /**
     * POST /api/image/filters/batch
     * Apply a filter to multiple images
     * Body: { fileNames: string[], filter, ...options }
     */
    this.router.post("/filters/batch", async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const { fileNames, filter, ...rest } = req.body as any;
        if (!Array.isArray(fileNames) || fileNames.length === 0) {
          return res.status(400).json({ error: "fileNames array is required" });
        }
        if (!filter) return res.status(400).json({ error: "filter is required" });
        if (fileNames.length > 20) return res.status(400).json({ error: "Max 20 files per batch" });

        const inputPaths = fileNames.map((f: string) => {
          const owned = ownerFileName(req, f);
          const safe = owned ? safePathInDir(path.join(this.config.dataDirPath, "generated-images"), owned) : null;
          return safe;
        });
        if (inputPaths.some((p) => p === null)) {
          return res.status(400).json({ error: "Invalid file name in fileNames" });
        }
        const tenantId = getAuthenticatedTenantId(req);
        if (!tenantId) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
        const options: FilterOptions = { filter, ...rest, tenantId };
        const results = await this.filtersEngine.batchApplyFilter(inputPaths as string[], options);
        for (const result of results) {
          if (result.success) await this.manifests.register({ tenantId, kind: "filtered-image", localPath: result.output, mimeType: result.output.endsWith(".svg") ? "image/svg+xml" : "image/png", lifecycle: "active" });
        }

        res.json({
          status: "ok",
          results: results.map((r, i) => ({
            inputFileName: fileNames[i],
            outputFileName: r.success ? path.basename(r.output) : null,
            success: r.success,
            error: r.error,
          })),
          successCount: results.filter((r) => r.success).length,
        });
      } catch (err) {
        logger.error(err, "Filter batch error");
        res.status(500).json({ error: (err as Error).message });
      }
    });

    /**
     * GET /api/image/filtered/:fileName
     * Serve filtered image files
     */
    this.router.get("/filtered/:fileName", (req: ExpressRequest, res: ExpressResponse) => {
      const fileName = ownerFileName(req, req.params.fileName);
      const filePath = fileName ? safePathInDir(path.join(this.config.dataDirPath, "filtered-images"), fileName) : null;
      if (!filePath) return res.status(404).json({ error: "File not found" });
      res.sendFile(filePath, (err) => {
        if (err) res.status(404).json({ error: "Filtered image not found" });
      });
    });
  }
}
