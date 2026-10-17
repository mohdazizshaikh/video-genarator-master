import express from "express";
import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { HookLibraryEngine, type HookEmotion } from "../../services/HookLibraryEngine";
import { logger } from "../../logger";
import { Config } from "../../config";
import { requireAuth } from "../auth";


export class HooksRouter {
  public router: express.Router;
  private library: HookLibraryEngine;

  constructor(config: Config) {
    this.router = express.Router();
    this.library = new HookLibraryEngine(config.dataDirPath);
    this.router.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes() {
    this.router.use(requireAuth);

    this.router.get("/", (req: ExpressRequest, res: ExpressResponse) => {
      const type = typeof req.query.type === "string" ? req.query.type : undefined;
      const category = typeof req.query.category === "string" ? req.query.category : undefined;
      const platform = typeof req.query.platform === "string" ? req.query.platform : undefined;
      const emotion = this.parseHookEmotion(req.query.emotion);
      let hooks = this.library.getAll();
      if (type) hooks = hooks.filter((h) => h.type === type);
      if (category) hooks = hooks.filter((h) => h.category.includes(category));
      if (platform) hooks = hooks.filter((h) => h.platform.includes(platform));
      if (emotion) hooks = hooks.filter((h) => h.emotion === emotion);
      res.json({ status: "ok", data: hooks });
    });

    this.router.get("/best", (req: ExpressRequest, res: ExpressResponse) => {
      const category = typeof req.query.category === "string" ? req.query.category : undefined;
      const platform = typeof req.query.platform === "string" ? req.query.platform : undefined;
      const emotion = this.parseHookEmotion(req.query.emotion);
      const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 5;
      const hooks = this.library.getBest({
        category,
        platform,
        emotion,
        limit: Number.isFinite(limit) ? limit : 5,
      });
      res.json({ status: "ok", data: hooks });
    });

    this.router.post("/generate", (req: ExpressRequest, res: ExpressResponse) => {
      const { topic, category, platform, limit } = req.body;
      if (!topic) return res.status(400).json({ error: "topic required" });
      const hooks = this.library.generateWithTopic(topic, {
        category: typeof category === "string" ? category : undefined,
        platform: typeof platform === "string" ? platform : undefined,
        limit: typeof limit === "number" ? limit : Number(limit) || 5,
      });
      res.json({ status: "ok", data: hooks });
    });

    this.router.post("/", (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const hook = this.library.addHook(req.body);
        res.status(201).json({ status: "ok", data: hook });
      } catch (err) {
        logger.error({ err }, "POST /hooks failed");
        res.status(400).json({ error: "Invalid hook data" });
      }
    });

    this.router.patch("/:hookId/track", (req: ExpressRequest, res: ExpressResponse) => {
      const { performanceScore } = req.body;
      this.library.trackUsage(req.params.hookId, performanceScore);
      res.json({ status: "ok" });
    });

    this.router.delete("/:hookId", (req: ExpressRequest, res: ExpressResponse) => {
      const deleted = this.library.deleteHook(req.params.hookId);
      if (deleted) res.json({ status: "ok" });
      else res.status(404).json({ error: "Hook not found" });
    });
  }

  private parseHookEmotion(value: unknown): HookEmotion | undefined {
    const emotion = typeof value === "string" ? value : undefined;
    return ["inspiration", "fear", "curiosity", "humor", "anger", "surprise", "joy"].includes(emotion ?? "")
      ? (emotion as HookEmotion)
      : undefined;
  }
}
