import { Router } from "express";
import type { Request, Response } from "express";
import { AttentionOptimizerEngine } from "../../services/AttentionOptimizerEngine";
import { logger } from "../../logger";
import { requireAuth } from "../auth";


export class AttentionRouter {
  readonly router: Router;
  private engine: AttentionOptimizerEngine;

  constructor() {
    this.router = Router();
    this.engine = new AttentionOptimizerEngine();
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.use(requireAuth);

    this.router.post("/analyze", (req: Request, res: Response) => {
      try {
        const { duration = 30, platform = "tiktok" } = req.body;
        const span = this.engine.analyzeAttentionSpan(duration, platform);
        res.json({ span });
      } catch (err) {
        logger.error({ err }, "POST /attention/analyze failed");
        res.status(500).json({ error: "Failed to analyze attention span" });
      }
    });

    this.router.post("/optimize", (req, res) => {
      try {
        const { duration = 30, platform = "tiktok" } = req.body;
        const optimization = this.engine.optimizeForAttention(duration, platform);
        res.json({ optimization });
      } catch (err) {
        logger.error({ err }, "POST /attention/optimize failed");
        res.status(500).json({ error: "Failed to optimize attention" });
      }
    });

    this.router.get("/hook/:platform/:topic", (req, res) => {
      try {
        const hook = this.engine.generateHookScript(req.params.platform, req.params.topic);
        res.json({ hook });
      } catch (err) {
        logger.error({ err }, "GET /attention/hook failed");
        res.status(500).json({ error: "Failed to generate hook" });
      }
    });
  }
}
