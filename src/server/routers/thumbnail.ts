import { Router } from "express";
import type { Request, Response } from "express";
import { ThumbnailEngine } from "../../services/ThumbnailEngine";
import { logger } from "../../logger";
import { requireAuth } from "../auth";


export class ThumbnailRouter {
  readonly router: Router;
  private engine: ThumbnailEngine;

  constructor() {
    this.router = Router();
    this.engine = new ThumbnailEngine();
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.use(requireAuth);

    this.router.post("/generate", (req: Request, res: Response) => {
      try {
        const { title, contrast, emotionalTrigger, curiosityGap, bgColor, textColor, accentColor } = req.body;
        if (!title) return res.status(400).json({ error: "title is required" });

        const directives = this.engine.generateThumbnailDirectives({
          title,
          boldText: true,
          contrast: contrast || "high",
          emotionalTrigger: emotionalTrigger || "curiosity",
          curiosityGap: curiosityGap || "Click to reveal...",
          backgroundColor: bgColor || "#1e293b",
          textColor: textColor || "#ffffff",
          accentColor: accentColor || "#6366f1",
        });

        const score = this.engine.scoreThumbailEffectiveness(directives);
        res.json({ directives, effectivenessScore: score });
      } catch (err) {
        logger.error({ err }, "POST /thumbnail/generate failed");
        res.status(500).json({ error: "Failed to generate thumbnail" });
      }
    });

    this.router.get("/curiosity-gap/:topic", (req, res) => {
      try {
        const gap = this.engine.generateCuriosityGap(req.params.topic);
        res.json({ gap });
      } catch (err) {
        logger.error({ err }, "GET /thumbnail/curiosity-gap failed");
        res.status(500).json({ error: "Failed to generate gap" });
      }
    });

    this.router.post("/validate-contrast", (req, res) => {
      try {
        const { bgColor, textColor } = req.body;
        if (!bgColor || !textColor) return res.status(400).json({ error: "bgColor and textColor required" });
        const isValid = this.engine.validateContrast(bgColor, textColor);
        res.json({ valid: isValid });
      } catch (err) {
        logger.error({ err }, "POST /thumbnail/validate-contrast failed");
        res.status(500).json({ error: "Validation failed" });
      }
    });
  }
}
