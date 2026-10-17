import express from "express";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { TrendEngine } from "../../services/TrendEngine";
import { ViralRadarEngine } from "../../services/ViralRadarEngine";
import { logger } from "../../logger";
import { requireAuth } from "../auth";


const trendEngine = new TrendEngine();
const viralRadar = new ViralRadarEngine(trendEngine);

export class TrendsRouter {
  public router: express.Router;

  constructor() {
    this.router = express.Router();
    this.router.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes() {
    this.router.use(requireAuth);

    this.router.get("/", async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const categories = req.query.categories ? String(req.query.categories).split(",") : undefined;
        const result = await trendEngine.fetchTrends(categories);
        res.json({ status: "ok", data: result });
      } catch (err) {
        logger.error(err, "Trend fetch error");
        res.status(500).json({ error: "Failed to fetch trends" });
      }
    });

    this.router.get("/category/:category", async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const topics = await trendEngine.getTopByCategory(req.params.category, 10);
        res.json({ status: "ok", data: topics });
      } catch (err) {
        logger.error({ err }, "GET /trends/category failed");
        res.status(500).json({ error: "Failed to fetch category trends" });
      }
    });

    this.router.get("/viral-radar", async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const result = await viralRadar.scan();
        res.json({ status: "ok", data: result });
      } catch (err) {
        logger.error(err, "Viral radar scan error");
        res.status(500).json({ error: "Viral radar scan failed" });
      }
    });

    this.router.post("/refresh", async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        trendEngine.clearCache();
        const result = await trendEngine.fetchTrends();
        res.json({ status: "ok", data: result, message: "Trends refreshed" });
      } catch (err) {
        logger.error({ err }, "POST /trends/refresh failed");
        res.status(500).json({ error: "Refresh failed" });
      }
    });
  }
}
