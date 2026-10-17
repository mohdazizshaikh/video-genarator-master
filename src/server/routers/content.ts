import { Router } from "express";
import type { Request, Response } from "express";
import { ContentEnhancementService } from "../../services/ContentEnhancementService";
import { requireAuth } from "../auth";


export class ContentRouter {
  public router: Router;
  private service: ContentEnhancementService;

  constructor() {
    this.router = Router();
    this.router.use(jsonMiddleware());
    this.service = new ContentEnhancementService();
    this.register();
  }

  private register(): void {
    this.router.use(requireAuth);

    this.router.post("/ideation", (req, res) => this.ideation(req, res));
    this.router.post("/editing-primitives", (req, res) => this.editing(req, res));
    this.router.post("/personalize", (req, res) => this.personalize(req, res));
    this.router.post("/interactive", (req, res) => this.interactive(req, res));
    this.router.post("/moderate", (req, res) => this.moderate(req, res));
    this.router.post("/trend-optimize", (req, res) => this.trendOptimize(req, res));
    this.router.post("/accessibility", (req, res) => this.accessibility(req, res));
  }

  private ideation(req: Request, res: Response): void {
    const { category, trendKeywords = [], userPreferences = [] } = req.body;
    if (!category) {
      res.status(400).json({ error: "category is required" });
      return;
    }
    res.json({ ideas: this.service.ideate({ category, trendKeywords, userPreferences }) });
  }

  private editing(req: Request, res: Response): void {
    const intensity = req.body.intensity || "medium";
    res.json(this.service.editingPrimitives(intensity));
  }

  private personalize(req: Request, res: Response): void {
    res.json(this.service.personalize(req.body || {}));
  }

  private interactive(req: Request, res: Response): void {
    const { script = "" } = req.body;
    res.json(this.service.addInteractiveOverlay(script));
  }

  private moderate(req: Request, res: Response): void {
    const { text = "" } = req.body;
    res.json(this.service.moderate(text));
  }

  private trendOptimize(req: Request, res: Response): void {
    const { baseTags = [], liveTrends = [] } = req.body;
    res.json({ tags: this.service.optimizeByTrends(baseTags, liveTrends) });
  }

  private accessibility(req: Request, res: Response): void {
    const { script = "" } = req.body;
    res.json(this.service.accessibility(script));
  }
}

function jsonMiddleware() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const express = require("express") as typeof import("express");
  return express.json();
}
