import {
  TenantEngineScope,
  tenantEngineAt,
} from "../../services/TenantEngineScope";
import { Router, json } from "express";
import type { Request, Response } from "express";
import { TrendHijackingEngine } from "../../services/TrendHijackingEngine";
import { CategoryEngine } from "../../services/CategoryEngine";
import { ContentEngine } from "../../services/ContentEngine";
import { CaptionEngine } from "../../services/CaptionEngine";
import { VoiceEngine } from "../../services/VoiceEngine";
import { ImageEngine } from "../../services/ImageEngine";
import type { Config } from "../../config";
import { requireAuth, requireWorkspace } from "../auth";


export class EnginesRouter {
  public router: Router;
  private category: CategoryEngine;
  private content: ContentEngine;
  private caption: CaptionEngine;
  private voice: VoiceEngine;
  private image: ImageEngine;

  private scoped: TenantEngineScope<{ trendHijack: TrendHijackingEngine }>;

  constructor(config: Config) {
    this.router = Router();
    this.scoped = new TenantEngineScope(config.dataDirPath, (directory) => ({
      trendHijack: tenantEngineAt(directory, TrendHijackingEngine),
    }));
    this.router.use(json());
    this.category = new CategoryEngine();
    this.content = new ContentEngine();
    this.caption = new CaptionEngine();
    this.voice = new VoiceEngine(config.dataDirPath);
    this.image = new ImageEngine();
    this.register();
  }

  private register() {
    this.router.use(requireAuth, requireWorkspace);

    // Trend Hijacking
    this.router.post("/trend-hijack", (req: Request, res: Response) => {
      const { topic, niche = "general", platform } = req.body;
      if (!topic) { res.status(400).json({ error: "topic required" }); return; }
      res.json({ status: "ok", data: this.scoped
          .forRequest(req)
          .trendHijack.hijackTrend(topic, niche, platform),
      });
    });
    this.router.get("/trend-hijack/formats", (req: Request, res: Response) => {
      res.json({ status: "ok", data: this.scoped.forRequest(req).trendHijack.getAllFormats(),
      });
    });
    this.router.get("/trend-hijack/history", (req: Request, res: Response) => {
      res.json({ status: "ok", data: this.scoped.forRequest(req).trendHijack.getHistory().slice(-50),
      });
    });
    this.router.post("/trend-hijack/evergreen", (req: Request, res: Response) => {
      const { niche = "general" } = req.body;
      res.json({ status: "ok", data: this.scoped
            .forRequest(req)
            .trendHijack.getEvergreenFallback(niche),
        });
    },
    );

    // Category
    this.router.post("/category/classify", (req: Request, res: Response) => {
      const { text } = req.body;
      if (!text) { res.status(400).json({ error: "text required" }); return; }
      res.json({ status: "ok", data: this.category.classify(text) });
    });
    this.router.get("/category/list", (req: Request, res: Response) => {
      res.json({ status: "ok", data: this.category.getAllCategories() });
    });

    // Content Engine (script generation)
    this.router.post("/content/script", async (req: Request, res: Response) => {
      const { topic, platform, category, durationSec, tone } = req.body;
      if (!topic) { res.status(400).json({ error: "topic required" }); return; }
      try {
        const result = await this.content.generateScript({ topic, platform, category, durationSec, tone,
        });
        res.json({ status: "ok", data: result });
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    });
    this.router.post("/content/hook", async (req: Request, res: Response) => {
      const { topic, platform } = req.body;
      if (!topic) { res.status(400).json({ error: "topic required" }); return; }
      res.json({ status: "ok", data: { hook: await this.content.generateHook(topic, platform) },
      });
    });
    this.router.post("/content/caption", async (req: Request, res: Response) => {
      const { topic, platform = "general" } = req.body;
      if (!topic) { res.status(400).json({ error: "topic required" }); return; }
      res.json({ status: "ok", data: { caption: await this.content.generateCaption(topic, platform),
          },
        });
    },
    );

    // Caption Engine
    this.router.post("/caption/generate", async (req: Request, res: Response) => {
      const { topic, platform, category, mood, includeHashtags, includeEmoji, maxLength,
        } = req.body;
      if (!topic || !platform) { res.status(400).json({ error: "topic and platform required" }); return; }
      try {
        const result = await this.caption.generate({ topic, platform, category, mood, includeHashtags, includeEmoji, maxLength,
          });
        res.json({ status: "ok", data: result });
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    },
    );

    // Voice Engine
    this.router.get("/voice/profiles", (req: Request, res: Response) => {
      res.json({ status: "ok", data: this.voice.getAllVoices() });
    });
    this.router.post("/voice/recommend", (req: Request, res: Response) => {
      const { platform = "youtube", category = "General" } = req.body;
      res.json({ status: "ok", data: this.voice.recommendVoice(platform, category),
      });
    });
    this.router.post("/voice/synthesize", async (req: Request, res: Response) => {
      const { text, voiceId, speed, outputPath } = req.body;
      if (!text) { res.status(400).json({ error: "text required" }); return; }
      try {
        const result = await this.voice.synthesize({ text, voiceId, speed, outputPath,
          });
        res.json({ status: "ok", data: result });
      } catch (err) {
        res.status(500).json({ error: String(err) });
      }
    },
    );

    // Image Engine
    this.router.post("/image/quote-card", (req: Request, res: Response) => {
      const opts = req.body;
      if (!opts.quote) { res.status(400).json({ error: "quote required" }); return; }
      res.json({ status: "ok", data: this.image.generateQuoteCard(opts) });
    });
    this.router.post("/image/carousel", (req: Request, res: Response) => {
      const opts = req.body;
      if (!opts.topic || !opts.slides) { res.status(400).json({ error: "topic and slides required" }); return; }
      res.json({ status: "ok", data: this.image.generateCarousel(opts) });
    });
    this.router.post("/image/poster", (req: Request, res: Response) => {
      const opts = req.body;
      if (!opts.headline) { res.status(400).json({ error: "headline required" }); return; }
      res.json({ status: "ok", data: this.image.generatePoster(opts) });
    });
    this.router.post("/image/banner", (req: Request, res: Response) => {
      const { title, tagline, width = 1200, height = 400, platform = "general",
      } = req.body;
      if (!title) { res.status(400).json({ error: "title required" }); return; }
      res.json({ status: "ok", data: this.image.generateBanner({ title, tagline, width, height, platform,
        }),
      });
    });
  }
}
