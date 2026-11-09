import {
  TenantEngineScope,
  tenantEngineAt,
} from "../../services/TenantEngineScope";
import { Router } from "express";
import type { Request, Response } from "express";
import type { Config } from "../../config";
import { AccountManagerEngine } from "../../services/AccountManagerEngine";
import { logger } from "../../logger";
import { requireAuth, requireWorkspace } from "../auth";

export class AccountRouter {
  readonly router: Router;
  private scoped: TenantEngineScope<{ engine: AccountManagerEngine }>;

  constructor(config: Config) {
    this.router = Router();
    this.scoped = new TenantEngineScope(config.dataDirPath, (directory) => ({
      engine: tenantEngineAt(directory, AccountManagerEngine),
    }));
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.use(requireAuth, requireWorkspace);

    this.router.post("/metrics", (req: Request, res: Response) => {
      try {
        const { totalVideos = 10, totalViews = 5000, totalEngagement = 250, followersGained = 50,
        } = req.body;

        const metrics = this.scoped
          .forRequest(req)
          .engine.calculateAccountMetrics(
          totalVideos,
          totalViews,
          totalEngagement,
          followersGained,
        );

        res.json({ metrics });
      } catch (err) {
        logger.error({ err }, "POST /account/metrics failed");
        res.status(500).json({ error: "Failed to calculate metrics" });
      }
    });

    this.router.post("/guidance", (req, res) => {
      try {
        const { metrics } = req.body;
        if (!metrics) return res.status(400).json({ error: "metrics required" });
        const guidance = this.scoped
          .forRequest(req)
          .engine.getAccountGuidance(metrics);
        res.json({ guidance });
      } catch (err) {
        logger.error({ err }, "POST /account/guidance failed");
        res.status(500).json({ error: "Failed to get guidance" });
      }
    });

    this.router.get("/load", (req, res) => {
      try {
        const metrics = this.scoped.forRequest(req).engine.loadMetrics();
        if (!metrics) {
          return res.json({
            metrics: {
              totalVideos: 0,
              totalViews: 0,
              averageEngagement: 0,
              followersGained: 0,
              accountHealth: 0,
              accountTier: "starter",
            },
          });
        }
        res.json({ metrics });
      } catch (err) {
        logger.error({ err }, "GET /account/load failed");
        res.status(500).json({ error: "Failed to load metrics" });
      }
    });

    this.router.post("/save", (req, res) => {
      try {
        this.scoped.forRequest(req).engine.saveMetrics(req.body);
        res.json({ success: true });
      } catch (err) {
        logger.error({ err }, "POST /account/save failed");
        res.status(500).json({ error: "Failed to save metrics" });
      }
    });
  }
}
