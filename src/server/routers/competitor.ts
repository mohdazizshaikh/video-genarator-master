import { Router, json } from "express";
import type { Request, Response } from "express";
import { CompetitorAnalysisEngine } from "../../services/CompetitorAnalysisEngine";
import type { Config } from "../../config";
import { getAuthenticatedTenantId, requireAuth } from "../auth";

export class CompetitorRouter {
  public router: Router;
  private engine: CompetitorAnalysisEngine;

  constructor(config: Config) {
    this.router = Router();
    this.router.use(json());
    this.router.use(requireAuth);
    this.engine = new CompetitorAnalysisEngine(config.dataDirPath);
    this.register();
  }

  private register() {
    this.router.get("/creators", (req: Request, res: Response) => {
      const { niche = "all", platform = "all" } = req.query as Record<string, string>;
      res.json({ status: "ok", data: this.engine.analyzeCompetitor(niche, platform) });
    });

    this.router.get("/patterns", (req: Request, res: Response) => {
      const { platform } = req.query as Record<string, string>;
      res.json({ status: "ok", data: this.engine.detectViralPatterns(platform) });
    });

    this.router.post("/strategy", (req: Request, res: Response) => {
      const tenantId = getAuthenticatedTenantId(req);
      if (!tenantId) { res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" }); return; }
      const { niche, platform } = req.body;
      if (!niche || !platform) { res.status(400).json({ error: "niche and platform required" }); return; }
      res.json({ status: "ok", data: this.engine.generateStrategyForTenant(tenantId, niche, platform) });
    });

    this.router.get("/history", (req: Request, res: Response) => {
      const tenantId = getAuthenticatedTenantId(req);
      if (!tenantId) { res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" }); return; }
      res.json({ status: "ok", data: this.engine.getHistoryForTenant(tenantId) });
    });
  }
}
