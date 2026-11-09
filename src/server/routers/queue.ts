/* eslint-disable @typescript-eslint/no-explicit-any */

import { Router } from "express";
import type { Request, Response } from "express";
import type { Config } from "../../config";
import type { ShortCreator } from "../../short-creator/ShortCreator";
import { RenderJobStore } from "../../db/RenderJobStore";
import { SchedulerService } from "../../services/SchedulerService";
import { getAuthenticatedTenantId, requireWorkspace } from "../auth";
import { renderConfig } from "../../types/shorts";
import { resolveCategoryPipeline } from "../../components/videos/CategoryPipelineProfiles";

export class QueueRouter {
  public router: Router;
  private scheduler: SchedulerService;
  private renderJobs: RenderJobStore;

  constructor(config: Config, shortCreator: ShortCreator) {
    this.router = Router();
    this.scheduler = new SchedulerService(config, shortCreator);
    this.renderJobs = new RenderJobStore(config.dataDirPath);
    this.router.use(expressJsonMiddleware());
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.use(expressJsonMiddleware());
    this.router.use(requireWorkspace);
    this.router.get("/render-jobs", async (req, res) => {
      try {
        const jobs = await this.renderJobs.listForTenant(getAuthenticatedTenantId(req)!);
        res.json(jobs.map((job) => Object.fromEntries(Object.entries(job).filter(([key]) => key !== "outputPath"))));
      } catch { res.status(500).json({ error: "Failed to load render jobs" }); }
    });
    this.router.get("/render-jobs/:id", async (req, res) => {
      try {
        const job = await this.renderJobs.getForTenant(getAuthenticatedTenantId(req)!, req.params.id);
        if (!job) { res.status(404).json({ error: "Render job not found" }); return; }
        res.json(Object.fromEntries(Object.entries(job).filter(([key]) => key !== "outputPath")));
      } catch { res.status(500).json({ error: "Failed to load render job" }); }
    });
    this.router.post("/bulk", (req: Request, res: Response) => this.bulkEnqueue(req, res));
  }

  private async bulkEnqueue(req: Request, res: Response): Promise<void> {
    const { sceneInput, config, orientation, category, videoType, subtitleLanguage, namingKey } = req.body;
    const parsedConfig = renderConfig.safeParse(config ?? { category: category || "Technology", videoType: videoType || "short", subtitleLanguage: subtitleLanguage || "en" });
    if (!parsedConfig.success) {
      res.status(400).json({ error: "Valid render config is required", details: parsedConfig.error.flatten() });
      return;
    }
    const normalizedSceneInput = Array.isArray(sceneInput)
      ? sceneInput
      : typeof sceneInput === "string" && sceneInput.trim().length > 0
        ? [{ text: sceneInput.trim(), searchTerms: [String(category)] }]
        : null;
    if (!normalizedSceneInput || normalizedSceneInput.length === 0 || !orientation || !category) {
      res.status(400).json({ error: "sceneInput (array or non-empty string), orientation, category are required" });
      return;
    }

    try {
      const tenantId = getAuthenticatedTenantId(req) ?? "";
      const effectiveCategory = String(category || parsedConfig.data.category || "General");
      const pipeline = resolveCategoryPipeline(effectiveCategory);
      const effectiveConfig = {
        ...parsedConfig.data,
        category: effectiveCategory,
        contentTemplate: parsedConfig.data.contentTemplate || pipeline.template,
      };
      const renderJobId = await this.scheduler.enqueueRenderJob({
        tenantId,
        sceneInput: normalizedSceneInput,
        config: effectiveConfig,
        orientation,
        category,
        videoType,
        subtitleLanguage,
        namingKey,
      });
      res.status(201).json({ renderJobId });
    } catch (err: any) {
      res.status(409).json({ error: err.message });
    }
  }
}

function expressJsonMiddleware() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const express = require("express") as typeof import("express");
  return express.json();
}
