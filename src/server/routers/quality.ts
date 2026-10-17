import { Router } from "express";
import type { Request, Response } from "express";
import { QualityScoringEngine } from "../../services/QualityScoringEngine";
import { logger } from "../../logger";
import { requireAuth } from "../auth";


export class QualityRouter {
  readonly router: Router;
  private engine: QualityScoringEngine;

  constructor() {
    this.router = Router();
    this.engine = new QualityScoringEngine();
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.use(requireAuth);

    this.router.post("/score", (req: Request, res: Response) => {
      try {
        const {
          hasAudio = true,
          audioLUFS = -14,
          visualResolution = 1920,
          frameRate = 30,
          scriptLength = 500,
        } = req.body;

        const metrics = this.engine.scoreContent(
          hasAudio,
          audioLUFS,
          visualResolution,
          frameRate,
          scriptLength,
        );

        res.json({ metrics });
      } catch (err) {
        logger.error({ err }, "POST /quality/score failed");
        res.status(500).json({ error: "Failed to score quality" });
      }
    });
  }
}
