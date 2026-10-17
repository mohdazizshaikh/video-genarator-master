import { Router } from "express";
import type { Request, Response } from "express";
import { AudioQualityEngine } from "../../services/AudioQualityEngine";
import { logger } from "../../logger";
import { requireAuth } from "../auth";


export class AudioRouter {
  readonly router: Router;
  private engine: AudioQualityEngine;

  constructor() {
    this.router = Router();
    this.engine = new AudioQualityEngine();
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.use(requireAuth);

    this.router.post("/process", (req: Request, res: Response) => {
      try {
        const { currentLUFS = -18, targetLUFS = -14 } = req.body;

        const enhancement = this.engine.processAudio(currentLUFS, {
          targetLUFS,
          musicDucking: true,
          fadeInMs: 500,
          fadeOutMs: 800,
          noiseGateThreshold: -40,
          compressionRatio: 4,
        });

        res.json({ enhancement });
      } catch (err) {
        logger.error({ err }, "POST /audio/process failed");
        res.status(500).json({ error: "Failed to process audio" });
      }
    });

    this.router.get("/ffmpeg-chain", (req, res) => {
      try {
        const baseEnhancement = this.engine.processAudio(-16);
        const chain = this.engine.generateFfmpegAudioChain(baseEnhancement);
        res.json({ ffmpegChain: chain });
      } catch (err) {
        logger.error({ err }, "GET /audio/ffmpeg-chain failed");
        res.status(500).json({ error: "Failed to generate audio chain" });
      }
    });

    this.router.post("/detect-levels", (req, res) => {
      try {
        const { audioFile } = req.body;
        if (!audioFile) return res.status(400).json({ error: "audioFile required" });

        const levels = this.engine.detectAudioLevels(audioFile);
        const isOptimal = this.engine.isAudioOptimal(levels.meanLUFS);

        res.json({ levels, isOptimal });
      } catch (err) {
        logger.error({ err }, "POST /audio/detect-levels failed");
        res.status(500).json({ error: "Failed to detect levels" });
      }
    });
  }
}
