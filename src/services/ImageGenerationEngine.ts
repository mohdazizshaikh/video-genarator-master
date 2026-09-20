/* eslint-disable @typescript-eslint/no-explicit-any */

import fs from "fs-extra";
import path from "path";
import { logger } from "../logger";

export type ImageType = "quote_card" | "banner" | "poster" | "thumbnail" | "announcement";

export interface ImageGenerationOptions {
  /** Auth-derived owner used only for local artifact isolation. */
  tenantId?: string;
  type: ImageType;
  title: string;
  subtitle?: string;
  category?: string;
  platform?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  watermark?: string;
}

export interface GeneratedImage {
  filePath: string;
  width: number;
  height: number;
  type: ImageType;
  createdAt: string;
}

const PLATFORM_DIMENSIONS: Record<string, { w: number; h: number }> = {
  instagram_square: { w: 1080, h: 1080 },
  instagram_story: { w: 1080, h: 1920 },
  youtube_thumbnail: { w: 1280, h: 720 },
  linkedin: { w: 1200, h: 627 },
  twitter: { w: 1200, h: 675 },
  default: { w: 1080, h: 1080 },
};

const CATEGORY_PALETTES: Record<string, { bg: string; text: string; accent: string }> = {
  Tech: { bg: "#0f172a", text: "#f8fafc", accent: "#3b82f6" },
  Technology: { bg: "#0f172a", text: "#f8fafc", accent: "#3b82f6" },
  Finance: { bg: "#17130a", text: "#fff8e7", accent: "#eab308" },
  Business: { bg: "#10202b", text: "#f8fafc", accent: "#f4a340" },
  Motivation: { bg: "#7c3aed", text: "#ffffff", accent: "#fbbf24" },
  News: { bg: "#dc2626", text: "#ffffff", accent: "#fef2f2" },
  Education: { bg: "#12305c", text: "#ffffff", accent: "#60a5fa" },
  Entertainment: { bg: "#2a1027", text: "#ffffff", accent: "#f472b6" },
  Food: { bg: "#29150a", text: "#fff7ed", accent: "#f97316" },
  Fitness: { bg: "#0b231a", text: "#f0fdf4", accent: "#4ade80" },
  Travel: { bg: "#082529", text: "#ecfeff", accent: "#2dd4bf" },
  Sports: { bg: "#0b231a", text: "#f0fdf4", accent: "#22c55e" },
  Science: { bg: "#10233b", text: "#eff6ff", accent: "#38bdf8" },
  Gaming: { bg: "#180f2e", text: "#faf5ff", accent: "#a78bfa" },
  Beauty: { bg: "#2a1020", text: "#fff1f2", accent: "#f472b6" },
  Parenting: { bg: "#10233b", text: "#eff6ff", accent: "#60a5fa" },
  Health: { bg: "#09251e", text: "#ecfdf5", accent: "#34d399" },
  Marketing: { bg: "#10202b", text: "#f8fafc", accent: "#f4a340" },
  General: { bg: "#111827", text: "#f9fafb", accent: "#94a3b8" },
};

export class ImageGenerationEngine {
  private outputDir: string;
  private canvasLib: any = null;

  constructor(dataDirPath: string) {
    this.outputDir = path.join(dataDirPath, "generated-images");
    fs.ensureDirSync(this.outputDir);
    this.tryLoadCanvas();
  }

  private async tryLoadCanvas() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.canvasLib = require("canvas");
    } catch {
      logger.warn("canvas package not available — image generation will use fallback SVG method");
    }
  }

  private wrapText(ctx: any, text: string, maxWidth: number, lineHeight: number, x: number, y: number): number {
    const words = text.split(" ");
    let line = "";
    let currentY = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + " ";
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
    return currentY;
  }

  private async generateSvgFallback(options: ImageGenerationOptions, dims: { w: number; h: number }): Promise<string> {
    const palette = CATEGORY_PALETTES[options.category || "General"];
    const bgColor = options.backgroundColor || palette.bg;
    const textColor = options.textColor || palette.text;
    const accentColor = options.accentColor || palette.accent;
    const titleWords = options.title.split(" ").slice(0, 10).join(" ");
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${dims.w}" height="${dims.h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${dims.w}" height="${dims.h}" fill="${bgColor}"/>
  <rect width="12" height="${dims.h}" fill="${accentColor}"/>
  <rect x="${dims.w - 12}" width="12" height="${dims.h}" fill="${accentColor}"/>
  <text x="${dims.w * 0.08}" y="${dims.h * 0.12}" font-family="Arial" font-size="${Math.round(dims.h * 0.025)}" font-weight="bold" fill="${accentColor}">${options.category?.toUpperCase() || "TRENDING"}</text>
  <text x="${dims.w * 0.08}" y="${dims.h * 0.45}" font-family="Arial" font-size="${Math.round(dims.h * 0.065)}" font-weight="bold" fill="${textColor}" xml:space="preserve">${titleWords}</text>
  ${options.subtitle ? `<text x="${dims.w * 0.08}" y="${dims.h * 0.72}" font-family="Arial" font-size="${Math.round(dims.h * 0.038)}" fill="${textColor}CC">${options.subtitle}</text>` : ""}
  ${options.watermark ? `<text x="${dims.w * 0.08}" y="${dims.h * 0.94}" font-family="Arial" font-size="${Math.round(dims.h * 0.025)}" fill="${textColor}66">${options.watermark}</text>` : ""}
</svg>`;
    return svg;
  }

  async generate(options: ImageGenerationOptions): Promise<GeneratedImage> {
    const platform = options.platform || "default";
    const dims = options.width && options.height
      ? { w: options.width, h: options.height }
      : PLATFORM_DIMENSIONS[platform] || PLATFORM_DIMENSIONS.default;

    const ownerPrefix = options.tenantId ? `${options.tenantId.replace(/[^a-zA-Z0-9_-]/g, "-")}__` : "legacy__";
    const fileName = `${ownerPrefix}img_${options.type}_${Date.now()}.png`;
    const filePath = path.join(this.outputDir, fileName);

    if (this.canvasLib) {
      const { createCanvas } = this.canvasLib;
      const palette = CATEGORY_PALETTES[options.category || "General"];
      const bgColor = options.backgroundColor || palette.bg;
      const textColor = options.textColor || palette.text;
      const accentColor = options.accentColor || palette.accent;

      const canvas = createCanvas(dims.w, dims.h);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, dims.w, dims.h);
      ctx.fillStyle = accentColor;
      ctx.fillRect(0, 0, 12, dims.h);
      ctx.fillRect(dims.w - 12, 0, 12, dims.h);

      ctx.fillStyle = accentColor;
      ctx.font = `bold ${Math.round(dims.h * 0.025)}px Arial`;
      ctx.fillText((options.category || "TRENDING").toUpperCase(), dims.w * 0.08, dims.h * 0.12);

      const titleFontSize = Math.round(dims.h * (options.title.length > 60 ? 0.055 : 0.07));
      ctx.fillStyle = textColor;
      ctx.font = `bold ${titleFontSize}px Arial`;
      this.wrapText(ctx, options.title, dims.w * 0.84, titleFontSize * 1.3, dims.w * 0.08, dims.h * 0.4);

      if (options.subtitle) {
        ctx.fillStyle = textColor + "cc";
        ctx.font = `${Math.round(dims.h * 0.04)}px Arial`;
        this.wrapText(ctx, options.subtitle, dims.w * 0.84, Math.round(dims.h * 0.05), dims.w * 0.08, dims.h * 0.72);
      }

      if (options.watermark) {
        ctx.fillStyle = textColor + "66";
        ctx.font = `${Math.round(dims.h * 0.025)}px Arial`;
        ctx.fillText(options.watermark, dims.w * 0.08, dims.h * 0.94);
      }

      const buffer = canvas.toBuffer("image/png");
      await fs.writeFile(filePath, buffer);
    } else {
      const svgFileName = `${ownerPrefix}img_${options.type}_${Date.now()}.svg`;
      const svgPath = path.join(this.outputDir, svgFileName);
      const svg = await this.generateSvgFallback(options, dims);
      await fs.writeFile(svgPath, svg, "utf-8");
      logger.info({ type: options.type, filePath: svgPath }, "Image generated as SVG (canvas not available)");
      return { filePath: svgPath, width: dims.w, height: dims.h, type: options.type, createdAt: new Date().toISOString() };
    }

    logger.info({ type: options.type, filePath, w: dims.w, h: dims.h }, "Image generated");
    return { filePath, width: dims.w, height: dims.h, type: options.type, createdAt: new Date().toISOString() };
  }

  async generateQuoteCard(quote: string, author?: string, category?: string, tenantId?: string): Promise<GeneratedImage> {
    return this.generate({ tenantId, type: "quote_card", title: `"${quote}"`, subtitle: author ? `— ${author}` : undefined, category: category || "Motivation" });
  }

  async generateThumbnail(title: string, category?: string, tenantId?: string): Promise<GeneratedImage> {
    return this.generate({ tenantId, type: "thumbnail", title, category: category || "General", platform: "youtube_thumbnail", width: 1280, height: 720 });
  }

  async generateAnnouncement(title: string, subtitle?: string, platform?: string, tenantId?: string): Promise<GeneratedImage> {
    return this.generate({ tenantId, type: "announcement", title, subtitle, platform: platform || "instagram_story" });
  }
}
