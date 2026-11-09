import express from "express";
import type { Request as ExpressRequest, Response as ExpressResponse,
} from "express";
import { TranslationEngine } from "../../services/TranslationEngine";
import { logger } from "../../logger";
import {
  getAuthenticatedTenantId,
  requireAuth,
  requireWorkspace,
} from "../auth";


const engine = new TranslationEngine(process.env.LIBRETRANSLATE_URL);

export class TranslateRouter {
  public router: express.Router;

  constructor() {
    this.router = express.Router();
    this.router.use(express.json());
    this.setupRoutes();
  }

  private setupRoutes() {
    this.router.use(requireAuth, requireWorkspace);

    this.router.get("/languages", (_req: ExpressRequest, res: ExpressResponse) => {
      res.json({ status: "ok", data: engine.getSupportedLanguages() });
    },
    );

    this.router.post("/", async (req: ExpressRequest, res: ExpressResponse) => {
      const { text, targetLang, sourceLang } = req.body;
      if (!text || !targetLang) return res.status(400).json({ error: "text and targetLang required" });
      try {
        const result = await engine.translate(text, targetLang, sourceLang || "en",
          getAuthenticatedTenantId(req),
        );
        res.json({ status: "ok", data: result });
      } catch (err) {
        logger.error(err, "Translation error");
        res.status(
            err instanceof TypeError || err instanceof RangeError ? 400 : 503,
          ).json({ error:
              err instanceof TypeError || err instanceof RangeError
                ? err.message
                : "Translation is unavailable",
          });
      }
    });

    this.router.post("/batch", async (req: ExpressRequest, res: ExpressResponse) => {
      const { texts, targetLang, sourceLang } = req.body;
      if (!Array.isArray(texts) || !targetLang) return res.status(400).json({ error: "texts[] and targetLang required" });
      try {
        const results = await engine.translateBatch(texts, targetLang, sourceLang || "en",
            getAuthenticatedTenantId(req),
          );
        res.json({ status: "ok", data: results });
      } catch (err) {
        logger.error({ err }, "POST /translate/batch failed");
        res.status(
              err instanceof TypeError || err instanceof RangeError ? 400 : 503,
            ).json({ error:
                err instanceof TypeError || err instanceof RangeError
                  ? err.message
                  : "Translation is unavailable",
            });
      }
    },
    );
  }
}
