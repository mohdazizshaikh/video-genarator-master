import express from "express";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { WatermarkEngine } from "../../services/WatermarkEngine";
import { logger } from "../../logger";
import { requireAuth } from "../auth";


const engine = new WatermarkEngine();

export class WatermarkRouter {
  public router: express.Router;

  constructor() {
    this.router = express.Router();
    this.router.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes() {
    this.router.use(requireAuth);

    this.router.post("/filter", (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const filter = engine.buildFfmpegFilter(req.body);
        res.json({ status: "ok", filter });
      } catch (err) {
        logger.error(err, "Watermark filter error");
        res.status(500).json({ error: "Failed to generate watermark filter" });
      }
    });

    this.router.get("/default", (_req: ExpressRequest, res: ExpressResponse) => {
      res.json({ status: "ok", config: engine.getDefaultConfig() });
    });

    this.router.put("/default", (req: ExpressRequest, res: ExpressResponse) => {
      try {
        engine.updateDefault(req.body);
        res.json({ status: "ok", config: engine.getDefaultConfig() });
      } catch (err) {
        logger.error({ err }, "PUT /watermark/default failed");
        res.status(500).json({ error: "Failed to update default watermark" });
      }
    });
  }
}
