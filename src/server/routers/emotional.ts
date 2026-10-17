import { Router } from "express";
import type { Request, Response } from "express";
import { EmotionalResonanceEngine, type EmotionalTone } from "../../services/EmotionalResonanceEngine";
import { logger } from "../../logger";
import { requireAuth } from "../auth";


export class EmotionalRouter {
  readonly router: Router;
  private engine: EmotionalResonanceEngine;

  constructor() {
    this.router = Router();
    this.engine = new EmotionalResonanceEngine();
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.use(requireAuth);

    this.router.post("/score", (req: Request, res: Response) => {
      try {
        const { scriptText = "", audioLength = 30, visualElements = 5 } = req.body;
        const score = this.engine.scoreEmotionalContent(scriptText, audioLength, visualElements);
        res.json({ score });
      } catch (err) {
        logger.error({ err }, "POST /emotional/score failed");
        res.status(500).json({ error: "Failed to score emotional content" });
      }
    });

    this.router.get("/directives/:emotion", (req, res) => {
      try {
        const emotionParam = String(req.params.emotion);
        if (!this.isEmotionalTone(emotionParam)) {
          res.status(400).json({ error: "Invalid emotion" });
          return;
        }
        const directives = this.engine.generateEmotionalDirectives(emotionParam);
        res.json({ directives });
      } catch (err) {
        logger.error({ err }, "GET /emotional/directives failed");
        res.status(500).json({ error: "Failed to generate directives" });
      }
    });

    this.router.post("/validate", (req, res) => {
      try {
        const { score } = req.body;
        if (!score) return res.status(400).json({ error: "score required" });
        const isValid = this.engine.validateEmotionalAlignment(score);
        res.json({ valid: isValid });
      } catch (err) {
        logger.error({ err }, "POST /emotional/validate failed");
        res.status(500).json({ error: "Validation failed" });
      }
    });
  }

  private isEmotionalTone(value: unknown): value is EmotionalTone {
    return [
      "joy",
      "fear",
      "anger",
      "sadness",
      "surprise",
      "trust",
      "disgust",
      "anticipation",
    ].includes(String(value)) as boolean;
  }
}
