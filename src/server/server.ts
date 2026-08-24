import http from "http";
import express from "express";
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
  NextFunction,
} from "express";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";
import { ShortCreator } from "../short-creator/ShortCreator";
import { APIRouter } from "./routers/rest";
import { MCPRouter } from "./routers/mcp";
import { HealthRouter } from "./routers/health";
import { PublishRouter } from "./routers/publish";
import { QueueRouter } from "./routers/queue";
import { TenantRouter } from "./routers/tenants";
import { MarketingRouter } from "./routers/marketing";
import { AiRouter } from "./routers/ai";
import { ContentRouter } from "./routers/content";
import { TrendsRouter } from "./routers/trends";
import { HooksRouter } from "./routers/hooks";
import { TranslateRouter } from "./routers/translate";
import { ImageRouter } from "./routers/image";
import { RecycleRouter } from "./routers/recycle";
import { CostsRouter } from "./routers/costs";
import { ShadowbanRouter } from "./routers/shadowban";
import { StrategyRouter } from "./routers/strategy";
import { WebhooksRouter } from "./routers/webhooks";
import { BrandingRouter } from "./routers/branding";
import { HumanizedRouter } from "./routers/humanized";
import { ThumbnailRouter } from "./routers/thumbnail";
import { EditingRouter } from "./routers/editing";
import { VisualRouter } from "./routers/visual";
import { AudioRouter } from "./routers/audio";
import { EmotionalRouter } from "./routers/emotional";
import { AttentionRouter } from "./routers/attention";
import { QualityRouter } from "./routers/quality";
import { EngagementRouter } from "./routers/engagement";
import { AccountRouter } from "./routers/account";
import { WatermarkRouter } from "./routers/watermark";
import { VideoLibraryRouter } from "./routers/videolibrary";
import { ScheduleRouter } from "./routers/schedule";
import { PipelineRouter } from "./routers/pipeline";
import { CompetitorRouter } from "./routers/competitor";
import { EnginesRouter } from "./routers/engines";
import { ABTestingRouter } from "./routers/abtesting";
import { ApprovalRouter } from "./routers/approval";
import { SystemEnginesRouter } from "./routers/systemengines";
import { ContentBucketsRouter } from "./routers/contentbuckets";
import { ChannelConfigRouter } from "./routers/channelconfigs";
import { ProfilesRouter, OAuthRouter } from "./routers/profiles";
import { RepurposeRouter } from "./routers/repurpose";
import { apiRateLimiter } from "./rateLimit";
import { logger } from "../logger";
import { Config } from "../config";
import { MusicManager } from "../short-creator/music";
import { RssFetcher } from "../news-fetcher/RssFetcher";
import { VoiceEnum } from "../types/shorts";
import { requireAuth, validateTokenIfPresent, logAdminKeyStatus } from "./auth";
import JobEventsRouter from "./routers/jobevents";
import { readiness } from "./readiness";

export class Server {
  private app: express.Application;
  private config: Config;
  private shortCreatorReady = false;

  constructor(config: Config, shortCreatorPromise: Promise<ShortCreator>) {
    this.config = config;
    this.app = express();
    // Trust proxies only when explicitly enabled (behind a reverse proxy).
    // When disabled, req.ip comes from the socket and rate limiting cannot be
    // bypassed by spoofing X-Forwarded-For.
    this.app.set("trust proxy", process.env.TRUST_PROXY === "true" ? 1 : false);
    this.app.use(express.json({ limit: "10mb" }));

    this.applySecurityHeaders();
    this.applyCors();

    // Trace-level request logging: every request (method, path, status, duration)
    // is logged when LOG_LEVEL=trace, so even the smallest UI click shows up.
    this.app.use((req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
      if (this.config.logLevel === "trace") {
        const start = process.hrtime.bigint();
        res.on("finish", () => {
          const durationMs = (Number(process.hrtime.bigint() - start) / 1e6).toFixed(2);
          logger.trace(
            {
              method: req.method,
              path: req.originalUrl,
              status: res.statusCode,
              durationMs,
              ip: req.ip,
            },
            "http request",
          );
        });
      }
      next();
    });

    // Optional token validation (non-blocking) + global API rate limit.
    this.app.use(validateTokenIfPresent);
    this.app.use("/api", apiRateLimiter);
    this.app.use("/mcp", apiRateLimiter);

    // Mark ready once the promise resolves
    shortCreatorPromise.then(() => {
      this.shortCreatorReady = true;
      readiness.videoEngineReady = true;
    }).catch((err) => {
      readiness.videoEngineError = true;
      logger.error(err, "ShortCreator initialization failed");
    });

    logAdminKeyStatus();

    // Global guard: any /api or /mcp path not yet handled returns 503 until ready
    // This middleware runs first for /api and /mcp.
    // "Always available" routes below will handle their paths before it becomes relevant.
    const initializingResponse = (_req: ExpressRequest, res: ExpressResponse) => {
      res.status(503).json({
        status: "initializing",
        message: "Service is starting up. AI models are being loaded — this may take a few minutes on first launch.",
      });
    };

    // Routers that do NOT need ShortCreator (always available)
    const healthRouter = new HealthRouter(config);
    const publishRouter = new PublishRouter(config);
    const tenantRouter = new TenantRouter(config);
    const marketingRouter = new MarketingRouter(config);
    const aiRouter = new AiRouter(config);
    const contentRouter = new ContentRouter();
    const trendsRouter = new TrendsRouter();
    const hooksRouter = new HooksRouter(config);
    const translateRouter = new TranslateRouter();
    const imageRouter = new ImageRouter(config);
    const recycleRouter = new RecycleRouter(config);
    const costsRouter = new CostsRouter(config);
    const shadowbanRouter = new ShadowbanRouter(config);
    const strategyRouter = new StrategyRouter(config);
    const webhooksRouter = new WebhooksRouter(config);
    const brandingRouter = new BrandingRouter(config);
    const humanizedRouter = new HumanizedRouter(config);
    const thumbnailRouter = new ThumbnailRouter();
    const editingRouter = new EditingRouter();
    const visualRouter = new VisualRouter();
    const audioRouter = new AudioRouter();
    const emotionalRouter = new EmotionalRouter();
    const attentionRouter = new AttentionRouter();
    const qualityRouter = new QualityRouter();
    const engagementRouter = new EngagementRouter();
    const accountRouter = new AccountRouter(config);
    const watermarkRouter = new WatermarkRouter();
    const videoLibraryRouter = new VideoLibraryRouter(config);
    const scheduleRouter = new ScheduleRouter(config);
    const pipelineRouter = new PipelineRouter(config);
    const competitorRouter = new CompetitorRouter(config);
    const enginesRouter = new EnginesRouter(config);
    const abTestingRouter = new ABTestingRouter(config);
    const approvalRouter = new ApprovalRouter(config);
    const systemEnginesRouter = new SystemEnginesRouter(config);
    const jobEventsRouter = new JobEventsRouter(config);
    const contentBucketsRouter = new ContentBucketsRouter(config);
    const channelConfigRouter = new ChannelConfigRouter(config);
    const profilesRouter = new ProfilesRouter(config);
    const oauthRouter = new OAuthRouter(config);
    const repurposeRouter = new RepurposeRouter(config);

    // Always-available routes (no ShortCreator dependency)
    this.app.use("/api/health", healthRouter.router);
    this.app.use("/api/publish", requireAuth, publishRouter.router);
    this.app.use("/api/tenants", requireAuth, tenantRouter.router);
    this.app.use("/api/marketing", requireAuth, marketingRouter.router);
    this.app.use("/api/ai", requireAuth, aiRouter.router);
    this.app.use("/api/content", requireAuth, contentRouter.router);
    this.app.use("/api/trends", requireAuth, trendsRouter.router);
    this.app.use("/api/hooks", requireAuth, hooksRouter.router);
    this.app.use("/api/translate", requireAuth, translateRouter.router);
    this.app.use("/api/image", requireAuth, imageRouter.router);
    this.app.use("/api/recycle", requireAuth, recycleRouter.router);
    this.app.use("/api/costs", requireAuth, costsRouter.router);
    this.app.use("/api/shadowban", requireAuth, shadowbanRouter.router);
    this.app.use("/api/strategy", requireAuth, strategyRouter.router);
    this.app.use("/api/webhooks", requireAuth, webhooksRouter.router);
    this.app.use("/api/branding", requireAuth, brandingRouter.router);
    this.app.use("/api/humanized", requireAuth, humanizedRouter.router);
    this.app.use("/api/thumbnail", requireAuth, thumbnailRouter.router);
    this.app.use("/api/editing", requireAuth, editingRouter.router);
    this.app.use("/api/visual", requireAuth, visualRouter.router);
    this.app.use("/api/audio", requireAuth, audioRouter.router);
    this.app.use("/api/emotional", requireAuth, emotionalRouter.router);
    this.app.use("/api/attention", requireAuth, attentionRouter.router);
    this.app.use("/api/quality", requireAuth, qualityRouter.router);
    this.app.use("/api/engagement", requireAuth, engagementRouter.router);
    this.app.use("/api/account", requireAuth, accountRouter.router);
    this.app.use("/api/watermark", requireAuth, watermarkRouter.router);
    this.app.use("/api/videolibrary", requireAuth, videoLibraryRouter.router);
    this.app.use("/api/schedule", requireAuth, scheduleRouter.router);
    this.app.use("/api/pipeline", requireAuth, pipelineRouter.router);
    this.app.use("/api/competitor", requireAuth, competitorRouter.router);
    this.app.use("/api/engines", requireAuth, enginesRouter.router);
    this.app.use("/api/abtesting", requireAuth, abTestingRouter.router);
    this.app.use("/api/approval", requireAuth, approvalRouter.router);
    this.app.use("/api/system", systemEnginesRouter.router);
    this.app.use("/api/job-events", requireAuth, jobEventsRouter.router);
    this.app.use("/api/system/content-buckets", requireAuth, contentBucketsRouter.router);
    this.app.use("/api/channel-configs", requireAuth, channelConfigRouter.router);
    this.app.use("/api/profiles", requireAuth, profilesRouter.router);
    this.app.use("/api/oauth", oauthRouter.router);
    this.app.use("/api/repurpose", requireAuth, repurposeRouter.router);

    // API Documentation (Swagger UI) — always available
    this.app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customSiteTitle: "AI Viral Content Empire – API Docs",
      customCss: ".swagger-ui .topbar { background-color: #6366f1; }",
    }));
    this.app.get("/api/docs.json", (_req: ExpressRequest, res: ExpressResponse) => {
      res.setHeader("Content-Type", "application/json");
      res.send(swaggerSpec);
    });

    // Expose non-video-dependent UI options immediately, even while the heavy video engine initializes.
    const musicManager = new MusicManager(config);
    const rssFetcher = new RssFetcher(config.dataDirPath);
    this.app.get("/api/voices", (_req: ExpressRequest, res: ExpressResponse) => {
      res.status(200).json(Object.values(VoiceEnum));
    });
    this.app.get("/api/music-tags", (_req: ExpressRequest, res: ExpressResponse) => {
      const tags = Array.from(new Set(musicManager.musicList().map((music) => music.mood)));
      res.status(200).json(tags);
    });
    this.app.get("/api/news-sources", (_req: ExpressRequest, res: ExpressResponse) => {
      res.status(200).json(rssFetcher.listSourcesSync());
    });

    // ShortCreator-dependent routes: registered dynamically once ready.
    // While not ready, all remaining /api and /mcp requests get 503.
    const deferredApiRouter = express.Router();
    const deferredMcpRouter = express.Router();
    const deferredQueueRouter = express.Router();

    // Placeholder 503 handlers — replaced by real handlers once ready
    let apiHandler: express.Router = express.Router().use(initializingResponse);
    let mcpHandler: express.Router = express.Router().use(initializingResponse);
    let queueHandler: express.Router = express.Router().use(initializingResponse);

    deferredApiRouter.use(requireAuth, (req, res, next) => apiHandler(req, res, next));
    deferredMcpRouter.use(requireAuth, (req, res, next) => mcpHandler(req, res, next));
    deferredQueueRouter.use(requireAuth, (req, res, next) => queueHandler(req, res, next));

    this.app.use("/api", deferredApiRouter);
    this.app.use("/mcp", deferredMcpRouter);
    this.app.use("/api/queue", deferredQueueRouter);

    // JSON 404s for unknown API routes (before the SPA catch-all)
    this.app.use("/api", (_req: ExpressRequest, res: ExpressResponse) => {
      res.status(404).json({ error: "Not found" });
    });
    this.app.use("/mcp", (_req: ExpressRequest, res: ExpressResponse) => {
      res.status(404).json({ error: "Not found" });
    });

    // When ShortCreator is ready, swap in the real handlers
    shortCreatorPromise.then((shortCreator) => {
      const apiRouter = new APIRouter(config, shortCreator);
      const mcpRouter = new MCPRouter(shortCreator);
      const queueRouter = new QueueRouter(config, shortCreator);
      apiHandler = apiRouter.router;
      mcpHandler = mcpRouter.router;
      queueHandler = queueRouter.router;
      // Inject ShortCreator into ScheduleRouter for video-type schedule execution
      scheduleRouter.setShortCreator(shortCreator);
      logger.info("Video API routes are now active");
    }).catch((err) => {
      logger.error(err, "ShortCreator failed to initialize — video routes unavailable");
    });

    // Serve static files from the UI build
    this.app.use(express.static(path.join(__dirname, "../../dist/ui")));
    this.app.use(
      "/static",
      express.static(path.join(__dirname, "../../static")),
    );

    // Serve the React app for all other routes (must be last)
    this.app.get("*", (req: ExpressRequest, res: ExpressResponse) => {
      res.sendFile(path.join(__dirname, "../../dist/ui/index.html"));
    });

    // Central JSON error handler (must be registered after all routes)
    this.app.use((err: unknown, _req: ExpressRequest, res: ExpressResponse, _next: NextFunction) => {
      void _next;
      const status = (err as { status?: number }).status ?? 500;
      const message = status >= 500 ? "Internal server error" : (err as Error).message;
      if (status >= 500) logger.error(err, "Unhandled request error");
      if (!res.headersSent) {
        res.status(status).json({ error: message });
      } else {
        res.destroy();
      }
    });
  }

  private applySecurityHeaders(): void {
    this.app.use((_req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("Referrer-Policy", "no-referrer");
      res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      next();
    });
  }

  private applyCors(): void {
    const allowedOrigins = (process.env.CORS_ORIGINS || "*")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    this.app.use((req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
      const origin = req.headers.origin;
      if (origin) {
        const allowed = allowedOrigins.includes("*") || allowedOrigins.includes(origin);
        if (allowed) {
          res.setHeader("Access-Control-Allow-Origin", allowedOrigins.includes("*") ? "*" : origin);
          res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Admin-Key");
          res.setHeader("Vary", "Origin");
        }
      }
      if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
      }
      next();
    });
  }

  public start(): http.Server {
    const server = this.app.listen(this.config.port, () => {
      logger.info(
        { port: this.config.port, mcp: "/mcp", api: "/api" },
        "MCP and API server is running",
      );
      logger.info(
        `UI server is running on http://localhost:${this.config.port}`,
      );
    });

    server.on("error", (error: Error) => {
      logger.error(error, "Error starting server");
    });

    return server;
  }

  public getApp() {
    return this.app;
  }
}
