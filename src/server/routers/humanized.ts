import {
  TenantEngineScope,
  tenantEngineAt,
} from "../../services/TenantEngineScope";
import { Router } from "express";
import type { Request, Response } from "express";
import type { Config } from "../../config";
import { HumanizedContentEngine } from "../../services/HumanizedContentEngine";
import { logger } from "../../logger";
import { requireAuth, requireWorkspace } from "../auth";


export class HumanizedRouter {
  readonly router: Router;
  private scoped: TenantEngineScope<{ engine: HumanizedContentEngine }>;

  constructor(config: Config) {
    this.router = Router();
    this.scoped = new TenantEngineScope(config.dataDirPath, (directory) => ({
      engine: tenantEngineAt(directory, HumanizedContentEngine),
    }));
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.use(requireAuth, requireWorkspace);

    this.router.post("/humanize", (req: Request, res: Response) => {
      try {
        const { script, emotion = "excited" } = req.body;
        if (!script) return res.status(400).json({ error: "script is required" });
        const result = this.scoped
          .forRequest(req)
          .engine.humanizeContent(script, emotion);
        res.json({ result });
      } catch (err) {
        logger.error({ err }, "POST /humanize failed");
        res.status(500).json({ error: "Failed to humanize content" });
      }
    });

    this.router.get("/avatar-directives/:emotion", (req, res) => {
      try {
        const duration = Number(req.query.duration) || 10000;
        const directives = this.scoped
          .forRequest(req)
          .engine.generateAvatarDirectives(req.params.emotion, duration);
        res.json({ directives });
      } catch (err) {
        logger.error({ err }, "GET /humanized/avatar-directives failed");
        res.status(500).json({ error: "Failed to generate directives" });
      }
    });

    this.router.get("/config", (req, res) => {
      try {
        const config = this.scoped.forRequest(req).engine.getConfig();
        res.json({ config });
      } catch (err) {
        logger.error({ err }, "GET /humanized/config failed");
        res.status(500).json({ error: "Failed to fetch config" });
      }
    });

    this.router.put("/config", (req, res) => {
      try {
        this.scoped.forRequest(req).engine.saveConfig(req.body);
        res.json({ success: true });
      } catch (err) {
        logger.error({ err }, "PUT /humanized/config failed");
        res.status(500).json({ error: "Failed to save config" });
      }
    });
  }
}
