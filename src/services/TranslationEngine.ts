import axios from "axios";
import crypto from "node:crypto";
import { logger } from "../logger";

export type SupportedLanguage =
  | "en" | "hi" | "es" | "fr" | "ar" | "pt" | "de" | "zh" | "ja" | "ko" | "ur" | "bn";

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: "English", hi: "Hindi", es: "Spanish", fr: "French",
  ar: "Arabic", pt: "Portuguese", de: "German", zh: "Chinese",
  ja: "Japanese", ko: "Korean", ur: "Urdu", bn: "Bengali",
};

interface TranslationCache {
  [key: string]: { result: string; expiresAt: number };
}

export interface TranslationResult {
  original: string;
  translated: string;
  sourceLang: SupportedLanguage;
  targetLang: SupportedLanguage;
  engine: "libretranslate" | "fallback" | "cache";
}

export class TranslationEngine {
  private libreTranslateUrl: string;
  private cache: TranslationCache = {};
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

  constructor(libreTranslateUrl: string = "https://libretranslate.com") {
    this.libreTranslateUrl = libreTranslateUrl;
  }

  private cacheKey(text: string, from: string, to: string,
    tenantId: string,
  ): string {
    return crypto
      .createHash("sha256")
      .update(
        JSON.stringify([tenantId, this.libreTranslateUrl, from, to, text]),
      )
      .digest("hex");
  }

  private getCache(key: string): string | null {
    const entry = this.cache[key];
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      delete this.cache[key];
      return null;
    }
    return entry.result;
  }

  private setCache(key: string, value: string) {
    this.cache[key] = { result: value, expiresAt: Date.now() + this.CACHE_TTL };
  }

  async translate(
    text: string,
    targetLang: SupportedLanguage,
    sourceLang: SupportedLanguage = "en",
    tenantId?: string,
  ): Promise<TranslationResult> {
    if (typeof text !== "string" || !text.trim())
      throw new TypeError("Non-empty text is required");
    if (text.length > 5000)
      throw new RangeError("Translation text exceeds 5000 characters");
    if (
      !Object.hasOwn(LANGUAGE_NAMES, targetLang) ||
      !Object.hasOwn(LANGUAGE_NAMES, sourceLang)
    )
      throw new TypeError("Unsupported translation language");
    if (sourceLang === targetLang)
      return {
        original: text,
        translated: text,
        sourceLang,
        targetLang,
        engine: "cache",
      };

    const key = this.cacheKey(text, sourceLang, targetLang, tenantId || "");
    const cached = tenantId ? this.getCache(key) : null;
    if (cached)
      return {
        original: text,
        translated: cached,
        sourceLang,
        targetLang,
        engine: "cache",
      };

    try {
      const response = await axios.post(
        `${this.libreTranslateUrl}/translate`,
        {
          q: text,
          source: sourceLang,
          target: targetLang,
          format: "text",
        },
        { timeout: 5000 },
      );

      const translated = response.data?.translatedText;
      if (typeof translated !== "string" || !translated.trim())
        throw new Error("Translation provider returned no result");
      if (tenantId) this.setCache(key, translated);
      logger.debug(
        { from: sourceLang, to: targetLang, chars: text.length },
        "Translated via LibreTranslate",
      );
      return {
        original: text,
        translated,
        sourceLang,
        targetLang,
        engine: "libretranslate",
      };
    } catch {
      logger.warn("Translation provider is unavailable");
      throw new Error(
        "Translation is unavailable; source text was not translated",
      );
    }
  }

  async translateBatch(
    texts: string[],
    targetLang: SupportedLanguage,
    sourceLang: SupportedLanguage = "en",
    tenantId?: string,
  ): Promise<TranslationResult[]> {
    if (
      !Array.isArray(texts) ||
      texts.length === 0 ||
      texts.length > 30 ||
      texts.some((text) => typeof text !== "string" || text.length > 5000)
    )
      throw new RangeError(
        "Translation batches require 1–30 texts of at most 5000 characters",
      );
    return Promise.all(
      texts.map((t) => this.translate(t, targetLang, sourceLang, tenantId)),
    );
  }

  getSupportedLanguages(): typeof LANGUAGE_NAMES {
    return LANGUAGE_NAMES;
  }
}
