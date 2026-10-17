import { Router } from "express";
import type { Request, Response } from "express";
import { ExpertEditingEngine } from "../../services/ExpertEditingEngine";
import { logger } from "../../logger";
import { requireAuth } from "../auth";


export class EditingRouter {
  readonly router: Router;
  private engine: ExpertEditingEngine;

  constructor() {
    this.router = Router();
    this.engine = new ExpertEditingEngine();
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.use(requireAuth);

    this.router.post("/plan", (req: Request, res: Response) => {
      try {
        const { videoDuration, emotionalIntensity = 3 } = req.body;
        if (videoDuration === undefined) return res.status(400).json({ error: "videoDuration required" });

        const plan = this.engine.generateEditingPlan(videoDuration, emotionalIntensity);
        res.json({ plan });
      } catch (err) {
        logger.error({ err }, "POST /editing/plan failed");
        res.status(500).json({ error: "Failed to generate editing plan" });
      }
    });

    this.router.get("/effects/:type/:intensity", (req, res) => {
      try {
        const { type } = req.params;
        const intensity = parseFloat(req.params.intensity) || 1;

        let result: string | Array<unknown>;
        switch (type) {
          case "zoom_cut":
            result = this.engine.zoomCutEffect(intensity);
            break;
          case "speed_ramp":
            result = this.engine.speedRampEffect(intensity);
            break;
          case "glitch":
            result = this.engine.glitchEffect(intensity);
            break;
          case "text_animation":
            result = this.engine.textAnimationEffect("VIRAL", intensity);
            break;
          default:
            return res.status(400).json({ error: "Unknown effect type" });
        }

        res.json({ effect: result });
      } catch (err) {
        logger.error({ err }, "GET /editing/effects failed");
        res.status(500).json({ error: "Failed to generate effect" });
      }
    });
  }
}
