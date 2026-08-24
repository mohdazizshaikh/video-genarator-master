/* eslint-disable @typescript-eslint/no-explicit-any */

import { Router } from "express";
import type { Request, Response } from "express";
import type { Config } from "../../config";
import type { ShortCreator } from "../../short-creator/ShortCreator";
import { SchedulerService } from "../../services/SchedulerService";
import { getAuthenticatedTenantId } from "../auth";

export class QueueRouter {
  public router: Router;
  private scheduler: SchedulerService;

  constructor(config: Config, shortCreator: ShortCreator) {
    this.router = Router();
    this.scheduler = new SchedulerService(config, shortCreator);
    this.router.use(expressJsonMiddleware());
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.post("/bulk", (req: Request, res: Response) => this.bulkEnqueue(req, res));
  }

  private async bulkEnqueue(req: Request, res: Response): Promise<void> {
    const { sceneInput, orientation, category, videoType, subtitleLanguage, namingKey } = req.body;
    if (!sceneInput || !orientation || !category) {
      res.status(400).json({ error: "sceneInput, orientation, category are required" });
      return;
    }

    try {
      const tenantId = getAuthenticatedTenantId(req) ?? "";
      const renderJobId = await this.scheduler.enqueueRenderJob({
        tenantId,
        sceneInput,
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
