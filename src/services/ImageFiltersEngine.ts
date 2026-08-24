/**
 * ImageFiltersEngine – Advanced image filters and processing pipeline
 * Supports 20+ filter types: color grading, cinematic, social-media-optimized presets
 * Works via SVG filter generation (universal) + canvas pixel manipulation (when available)
 */
import fs from "fs-extra";
import path from "path";
import { logger } from "../logger";

export type FilterType =
  | "none"
  | "grayscale"
  | "sepia"
  | "vintage"
  | "cinema"
  | "noir"
  | "warm"
  | "cool"
  | "vivid"
  | "fade"
  | "matte"
  | "cyberpunk"
  | "golden_hour"
  | "arctic"
  | "sunset"
  | "moody"
  | "high_contrast"
  | "soft_glow"
  | "dramatic"
  | "pastel";

export interface FilterOptions {
  /** Auth-derived owner used only for local artifact isolation. */
  tenantId?: string;
  filter: FilterType;
  intensity?: number; // 0-100, default 100
  brightness?: number; // 0-200, default 100
  contrast?: number; // 0-200, default 100
  saturation?: number; // 0-200, default 100
  hue?: number; // 0-360, default 0
  blur?: number; // 0-20, default 0
  sharpen?: number; // 0-10, default 0
  vignette?: number; // 0-100, default 0
  grain?: number; // 0-100, default 0
  temperature?: number; // -100 to 100, default 0
}

export interface FilterResult {
  svgFilter: string;
  cssFilter: string;
  canvasOps: CanvasOp[];
  description: string;
}

export interface CanvasOp {
  op: "brightness" | "contrast" | "saturation" | "hue" | "blur" | "sepia" | "grayscale" | "invert" | "overlay";
  value: number;
  color?: string;
}

export interface FilterPreset {
  id: FilterType;
  name: string;
  description: string;
  tags: string[];
  platform: string[];
  defaultOptions: Partial<FilterOptions>;
}

const FILTER_PRESETS: FilterPreset[] = [
  {
    id: "none",
    name: "No Filter",
    description: "Original image without any filter applied",
    tags: ["original", "clean"],
    platform: ["all"],
    defaultOptions: {},
  },
  {
    id: "grayscale",
    name: "Classic B&W",
    description: "Full grayscale conversion for timeless black and white look",
    tags: ["classic", "editorial", "minimal"],
    platform: ["instagram", "linkedin"],
    defaultOptions: { saturation: 0 },
  },
  {
    id: "sepia",
    name: "Sepia Tone",
    description: "Warm brown tones evoking vintage photography",
    tags: ["vintage", "warm", "nostalgic"],
    platform: ["instagram", "facebook"],
    defaultOptions: { brightness: 110, contrast: 90 },
  },
  {
    id: "vintage",
    name: "Vintage Film",
    description: "Film grain + faded tones for authentic retro aesthetic",
    tags: ["retro", "film", "grain", "fade"],
    platform: ["instagram", "tiktok"],
    defaultOptions: { brightness: 95, saturation: 80, contrast: 85, grain: 30 },
  },
  {
    id: "cinema",
    name: "Cinematic",
    description: "Cinematic color grade with letterbox feel — teal/orange split",
    tags: ["cinematic", "hollywood", "film"],
    platform: ["youtube", "instagram"],
    defaultOptions: { brightness: 90, contrast: 130, saturation: 80 },
  },
  {
    id: "noir",
    name: "Film Noir",
    description: "Deep shadows, high contrast, desaturated for dramatic effect",
    tags: ["dark", "dramatic", "moody"],
    platform: ["instagram", "linkedin"],
    defaultOptions: { brightness: 80, contrast: 180, saturation: 10 },
  },
  {
    id: "warm",
    name: "Warm Glow",
    description: "Warm yellow-orange tones for a cozy, inviting feel",
    tags: ["warm", "cozy", "friendly"],
    platform: ["instagram", "facebook", "tiktok"],
    defaultOptions: { brightness: 105, saturation: 110, temperature: 40 },
  },
  {
    id: "cool",
    name: "Cool Breeze",
    description: "Blue-tinted cooler tones for a fresh, modern look",
    tags: ["cool", "modern", "fresh"],
    platform: ["linkedin", "twitter", "instagram"],
    defaultOptions: { brightness: 100, saturation: 90, temperature: -30 },
  },
  {
    id: "vivid",
    name: "Ultra Vivid",
    description: "Highly saturated, punchy colors to maximize visual impact",
    tags: ["colorful", "bold", "eye-catching"],
    platform: ["tiktok", "instagram", "youtube"],
    defaultOptions: { saturation: 180, contrast: 120, brightness: 105 },
  },
  {
    id: "fade",
    name: "Faded",
    description: "Slightly faded, raised blacks for a modern editorial look",
    tags: ["editorial", "magazine", "modern"],
    platform: ["instagram", "linkedin"],
    defaultOptions: { brightness: 110, contrast: 80, saturation: 85 },
  },
  {
    id: "matte",
    name: "Matte Finish",
    description: "Low saturation matte finish — popular in modern photography",
    tags: ["matte", "professional", "clean"],
    platform: ["instagram", "linkedin", "youtube"],
    defaultOptions: { saturation: 70, contrast: 85, brightness: 100 },
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    description: "Neon/purple hues with high contrast for futuristic sci-fi vibe",
    tags: ["neon", "futuristic", "tech", "gaming"],
    platform: ["tiktok", "instagram", "youtube"],
    defaultOptions: { brightness: 95, contrast: 150, saturation: 200, hue: 260 },
  },
  {
    id: "golden_hour",
    name: "Golden Hour",
    description: "Warm golden tones mimicking the magic hour lighting",
    tags: ["golden", "sunset", "warm", "magical"],
    platform: ["instagram", "tiktok", "facebook"],
    defaultOptions: { brightness: 110, saturation: 140, temperature: 60 },
  },
  {
    id: "arctic",
    name: "Arctic",
    description: "Ice-blue desaturated tones for a clean, cold aesthetic",
    tags: ["cold", "minimal", "clean", "blue"],
    platform: ["instagram", "linkedin"],
    defaultOptions: { brightness: 110, saturation: 60, temperature: -60 },
  },
  {
    id: "sunset",
    name: "Sunset Gradient",
    description: "Red-orange-purple tones of a dramatic sunset",
    tags: ["sunset", "dramatic", "colorful"],
    platform: ["instagram", "tiktok"],
    defaultOptions: { brightness: 100, saturation: 160, hue: 15 },
  },
  {
    id: "moody",
    name: "Moody Dark",
    description: "Underexposed with rich shadows and muted tones",
    tags: ["dark", "brooding", "artistic"],
    platform: ["instagram", "youtube"],
    defaultOptions: { brightness: 75, contrast: 120, saturation: 80 },
  },
  {
    id: "high_contrast",
    name: "High Contrast",
    description: "Pure black and white with extreme contrast",
    tags: ["bold", "impact", "editorial"],
    platform: ["all"],
    defaultOptions: { contrast: 200, brightness: 100, saturation: 0 },
  },
  {
    id: "soft_glow",
    name: "Soft Glow",
    description: "Gentle bloom effect with softened highlights and lifted shadows",
    tags: ["beauty", "soft", "romantic"],
    platform: ["instagram", "facebook"],
    defaultOptions: { brightness: 115, contrast: 85, saturation: 95, blur: 0.5 },
  },
  {
    id: "dramatic",
    name: "Dramatic",
    description: "Strong contrast with deep shadows for powerful imagery",
    tags: ["powerful", "impact", "editorial"],
    platform: ["instagram", "youtube", "linkedin"],
    defaultOptions: { brightness: 85, contrast: 160, saturation: 90 },
  },
  {
    id: "pastel",
    name: "Pastel Dream",
    description: "Soft pastel tones with raised whites for dreamy aesthetic",
    tags: ["soft", "dreamy", "feminine", "aesthetic"],
    platform: ["instagram", "tiktok"],
    defaultOptions: { brightness: 120, contrast: 80, saturation: 70 },
  },
];

export class ImageFiltersEngine {
  private outputDir: string;
  private canvasLib: any = null;

  constructor(dataDirPath: string) {
    this.outputDir = path.join(dataDirPath, "filtered-images");
    fs.ensureDirSync(this.outputDir);
    void this.tryLoadCanvas();
  }

  private async tryLoadCanvas() {
    try {
      // @ts-ignore: canvas is an optional runtime dependency and may not be installed in all environments
      const canvasModule = await import("canvas");
      this.canvasLib = canvasModule;
    } catch {
      logger.info("canvas not available — using SVG/CSS filter output");
    }
  }

  /** Get all available filter presets */
  getPresets(): FilterPreset[] {
    return FILTER_PRESETS;
  }

  /** Get presets for a specific platform */
  getPresetsForPlatform(platform: string): FilterPreset[] {
    return FILTER_PRESETS.filter(
      (p) => p.platform.includes("all") || p.platform.includes(platform),
    );
  }

  /** Get filter preset by ID */
  getPreset(filter: FilterType): FilterPreset | undefined {
    return FILTER_PRESETS.find((p) => p.id === filter);
  }

  /** Build CSS filter string from options */
  buildCssFilter(options: FilterOptions): string {
    const intensity = (options.intensity ?? 100) / 100;
    const parts: string[] = [];

    const brightness = this.lerp(100, options.brightness ?? 100, intensity);
    const contrast = this.lerp(100, options.contrast ?? 100, intensity);
    const saturation = this.lerp(100, options.saturation ?? 100, intensity);
    const blur = (options.blur ?? 0) * intensity;
    const hue = (options.hue ?? 0) * intensity;

    // Apply preset defaults for named filters
    const preset = this.getPreset(options.filter);
    const defaults = preset?.defaultOptions ?? {};

    const finalBrightness = this.lerp(100, defaults.brightness ?? brightness, intensity);
    const finalContrast = this.lerp(100, defaults.contrast ?? contrast, intensity);
    const finalSaturation = this.lerp(100, defaults.saturation ?? saturation, intensity);
    const finalBlur = (defaults.blur ?? blur);
    const finalHue = defaults.hue ? (defaults.hue * intensity) : hue;

    parts.push(`brightness(${finalBrightness}%)`);
    parts.push(`contrast(${finalContrast}%)`);
    parts.push(`saturate(${finalSaturation}%)`);
    if (finalHue !== 0) parts.push(`hue-rotate(${finalHue}deg)`);
    if (finalBlur > 0) parts.push(`blur(${finalBlur}px)`);

    // Special per-filter additions
    switch (options.filter) {
      case "grayscale":
      case "high_contrast":
        parts.push(`grayscale(${100 * intensity}%)`);
        break;
      case "sepia":
        parts.push(`sepia(${80 * intensity}%)`);
        break;
      case "vintage":
        parts.push(`sepia(${40 * intensity}%)`);
        break;
      case "noir":
        parts.push(`grayscale(${90 * intensity}%)`);
        break;
    }

    return parts.join(" ");
  }

  /** Build SVG filter XML for server-side application */
  buildSvgFilter(options: FilterOptions, filterId = "imgFilter"): string {
    const intensity = (options.intensity ?? 100) / 100;
    const preset = this.getPreset(options.filter);
    const defaults = preset?.defaultOptions ?? {};

    const brightness = ((defaults.brightness ?? options.brightness ?? 100) - 100) / 100 * intensity;
    const contrast = ((defaults.contrast ?? options.contrast ?? 100) / 100) * intensity + (1 - intensity);
    const saturation = ((defaults.saturation ?? options.saturation ?? 100) / 100) * intensity + (1 - intensity);
    const blur = (defaults.blur ?? options.blur ?? 0) * intensity;
    const temperature = (defaults.temperature ?? options.temperature ?? 0) * intensity;

    const filters: string[] = [];
    let in_attr = "SourceGraphic";

    if (blur > 0) {
      filters.push(`<feGaussianBlur in="${in_attr}" stdDeviation="${blur.toFixed(2)}" result="blurred"/>`);
      in_attr = "blurred";
    }

    if (brightness !== 0 || contrast !== 1 || saturation !== 1) {
      // Color matrix for brightness/contrast/saturation
      const s = saturation;
      const lr = 0.213 + 0.787 * s;
      const lg = 0.715 - 0.715 * s;
      const lb = 0.072 - 0.072 * s;
      const mr = 0.213 - 0.213 * s;
      const mg = 0.715 + 0.285 * s;
      const mb = 0.072 - 0.072 * s;
      const nr = 0.213 - 0.213 * s;
      const ng = 0.715 - 0.715 * s;
      const nb = 0.072 + 0.928 * s;
      const b = brightness * contrast;

      filters.push(
        `<feColorMatrix in="${in_attr}" type="matrix" values="${(lr * contrast).toFixed(3)} ${(lg * contrast).toFixed(3)} ${(lb * contrast).toFixed(3)} 0 ${b.toFixed(3)}` +
        ` ${(mr * contrast).toFixed(3)} ${(mg * contrast).toFixed(3)} ${(mb * contrast).toFixed(3)} 0 ${b.toFixed(3)}` +
        ` ${(nr * contrast).toFixed(3)} ${(ng * contrast).toFixed(3)} ${(nb * contrast).toFixed(3)} 0 ${b.toFixed(3)}` +
        ` 0 0 0 1 0" result="colorAdjusted"/>`,
      );
      in_attr = "colorAdjusted";
    }

    // Temperature shift (warm/cool)
    if (temperature !== 0) {
      const warm = temperature > 0 ? temperature / 100 : 0;
      const cool = temperature < 0 ? (-temperature) / 100 : 0;
      filters.push(
        `<feColorMatrix in="${in_attr}" type="matrix" values="${(1 + warm * 0.3).toFixed(3)} 0 0 0 ${(warm * 0.05).toFixed(3)} 0 1 0 0 0 0 0 ${(1 + cool * 0.3).toFixed(3)} 0 ${(cool * 0.05).toFixed(3)} 0 0 0 1 0" result="tempAdjusted"/>`,
      );
      in_attr = "tempAdjusted";
    }

    // Sepia for sepia/vintage filters
    if (options.filter === "sepia" || options.filter === "vintage") {
      const sp = options.filter === "sepia" ? 0.8 * intensity : 0.4 * intensity;
      filters.push(
        `<feColorMatrix in="${in_attr}" type="matrix" values="${(0.393 + 0.607 * (1 - sp)).toFixed(3)} ${(0.769 * sp).toFixed(3)} ${(0.189 * sp).toFixed(3)} 0 0 ${(0.349 * sp).toFixed(3)} ${(0.686 + 0.314 * (1 - sp)).toFixed(3)} ${(0.168 * sp).toFixed(3)} 0 0 ${(0.272 * sp).toFixed(3)} ${(0.534 * sp).toFixed(3)} ${(0.131 + 0.869 * (1 - sp)).toFixed(3)} 0 0 0 0 0 1 0" result="sepia"/>`,
      );
      in_attr = "sepia";
    }

    // Grayscale
    if (options.filter === "grayscale" || options.filter === "noir" || options.filter === "high_contrast") {
      const gs = options.filter === "grayscale" ? intensity : (options.filter === "noir" ? 0.9 * intensity : intensity);
      filters.push(
        `<feColorMatrix in="${in_attr}" type="matrix" values="${(0.213 + 0.787 * (1 - gs)).toFixed(3)} ${(0.715 * gs).toFixed(3)} ${(0.072 * gs).toFixed(3)} 0 0 ${(0.213 * gs).toFixed(3)} ${(0.715 + 0.285 * (1 - gs)).toFixed(3)} ${(0.072 * gs).toFixed(3)} 0 0 ${(0.213 * gs).toFixed(3)} ${(0.715 * gs).toFixed(3)} ${(0.072 + 0.928 * (1 - gs)).toFixed(3)} 0 0 0 0 0 1 0" result="gray"/>`,
      );
      in_attr = "gray";
    }

    // Vignette
    if (options.vignette && options.vignette > 0) {
      filters.push(
        `<feComposite operator="over" in="${in_attr}" in2="SourceGraphic" result="vignetted"/>`,
      );
    }

    return `<filter id="${filterId}" x="0%" y="0%" width="100%" height="100%">\n  ${filters.join("\n  ")}\n</filter>`;
  }

  /** Apply filter to SVG-based image (server-side wrapping) */
  async applyFilterToSvg(inputSvgPath: string, options: FilterOptions): Promise<string> {
    const inputContent = await fs.readFile(inputSvgPath, "utf-8");
    const filterId = `filter_${options.filter}_${Date.now()}`;
    const svgFilter = this.buildSvgFilter(options, filterId);

    // Inject filter into SVG defs and apply to content
    const filteredSvg = inputContent
      .replace(
        /<svg([^>]*)>/,
        `<svg$1>\n<defs>\n${svgFilter}\n</defs>`,
      )
      .replace(
        /<rect/,
        `<rect filter="url(#${filterId})"`,
      );

    const ownerPrefix = options.tenantId ? `${options.tenantId.replace(/[^a-zA-Z0-9_-]/g, "-")}__` : "legacy__";
    const outputFileName = `${ownerPrefix}filtered_${options.filter}_${Date.now()}.svg`;
    const outputPath = path.join(this.outputDir, outputFileName);
    await fs.writeFile(outputPath, filteredSvg, "utf-8");

    logger.info({ filter: options.filter, outputPath }, "SVG filter applied");
    return outputPath;
  }

  /** Apply filter to canvas image if canvas is available */
  async applyFilterToCanvas(
    inputImagePath: string,
    options: FilterOptions,
    outputWidth?: number,
    outputHeight?: number,
  ): Promise<string> {
    if (!this.canvasLib) {
      logger.warn("canvas not available, returning input path");
      return inputImagePath;
    }

    try {
      const { createCanvas, loadImage } = this.canvasLib;
      const img = await loadImage(inputImagePath);
      const w = outputWidth || img.width;
      const h = outputHeight || img.height;
      const canvas = createCanvas(w, h);
      const ctx = canvas.getContext("2d") as any;

      // Build CSS-like filter string for canvas
      const cssFilter = this.buildCssFilter(options);
      ctx.filter = cssFilter;
      ctx.drawImage(img, 0, 0, w, h);

      // Apply grain if needed
      const grain = options.grain ?? 0;
      if (grain > 0) {
        this.applyGrain(ctx, w, h, grain);
      }

      // Apply vignette overlay
      const vignette = options.vignette ?? 0;
      if (vignette > 0) {
        this.applyVignette(ctx, w, h, vignette);
      }

      const ownerPrefix = options.tenantId ? `${options.tenantId.replace(/[^a-zA-Z0-9_-]/g, "-")}__` : "legacy__";
      const outputFileName = `${ownerPrefix}canvas_${options.filter}_${Date.now()}.png`;
      const outputPath = path.join(this.outputDir, outputFileName);
      const buffer = canvas.toBuffer("image/png");
      await fs.writeFile(outputPath, buffer);

      logger.info({ filter: options.filter, outputPath, w, h }, "Canvas filter applied");
      return outputPath;
    } catch (err) {
      logger.error(err, "Canvas filter error");
      return inputImagePath;
    }
  }

  /** Generate filter preview card (SVG with filter applied) */
  async generateFilterPreview(
    title: string,
    options: FilterOptions,
    width = 400,
    height = 300,
  ): Promise<string> {
    const preset = this.getPreset(options.filter);
    const filterId = `prev_${options.filter}`;
    const svgFilter = this.buildSvgFilter(options, filterId);

    // Determine colors for the preview gradient background
    const bgColor = this.getFilterBgColor(options.filter);
    const textColor = "#ffffff";

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${svgFilter}
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgColor.from}"/>
      <stop offset="100%" stop-color="${bgColor.to}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)" filter="url(#${filterId})"/>
  <rect width="${width}" height="${height}" fill="none" stroke="${textColor}22" stroke-width="2"/>
  <text x="${width / 2}" y="${height * 0.45}" text-anchor="middle" font-family="Arial" font-size="${Math.round(height * 0.09)}" font-weight="bold" fill="${textColor}">${preset?.name || options.filter}</text>
  <text x="${width / 2}" y="${height * 0.62}" text-anchor="middle" font-family="Arial" font-size="${Math.round(height * 0.05)}" fill="${textColor}cc">${preset?.description?.slice(0, 40) || ""}</text>
  <text x="${width / 2}" y="${height * 0.82}" text-anchor="middle" font-family="Arial" font-size="${Math.round(height * 0.038)}" fill="${textColor}88">${(preset?.tags || []).slice(0, 3).map((t) => `#${t}`).join(" ")}</text>
</svg>`;

    const ownerPrefix = options.tenantId ? `${options.tenantId.replace(/[^a-zA-Z0-9_-]/g, "-")}__` : "legacy__";
    const fileName = `${ownerPrefix}preview_${options.filter}_${Date.now()}.svg`;
    const filePath = path.join(this.outputDir, fileName);
    await fs.writeFile(filePath, svg, "utf-8");
    return filePath;
  }

  /** Batch apply filter to multiple images */
  async batchApplyFilter(
    inputPaths: string[],
    options: FilterOptions,
  ): Promise<Array<{ input: string; output: string; success: boolean; error?: string }>> {
    const results = await Promise.allSettled(
      inputPaths.map(async (inputPath) => {
        const ext = path.extname(inputPath).toLowerCase();
        const output = ext === ".svg"
          ? await this.applyFilterToSvg(inputPath, options)
          : await this.applyFilterToCanvas(inputPath, options);
        return { input: inputPath, output, success: true };
      }),
    );

    return results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      return { input: inputPaths[i], output: "", success: false, error: String(r.reason) };
    });
  }

  private deterministicRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  private applyGrain(ctx: any, w: number, h: number, intensity: number): void {
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const grainAmount = (intensity / 100) * 50;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (this.deterministicRandom(i + grainAmount) - 0.5) * grainAmount;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);
  }

  private applyVignette(ctx: any, w: number, h: number, intensity: number): void {
    const gradient = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, `rgba(0,0,0,${(intensity / 100) * 0.8})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private getFilterBgColor(filter: FilterType): { from: string; to: string } {
    const map: Partial<Record<FilterType, { from: string; to: string }>> = {
      grayscale: { from: "#444", to: "#111" },
      sepia: { from: "#8b6914", to: "#4a3000" },
      vintage: { from: "#a07040", to: "#503010" },
      cinema: { from: "#0d4a6e", to: "#6e2d0d" },
      noir: { from: "#222", to: "#000" },
      warm: { from: "#f59e0b", to: "#dc2626" },
      cool: { from: "#3b82f6", to: "#1e3a8a" },
      vivid: { from: "#8b5cf6", to: "#ec4899" },
      cyberpunk: { from: "#7c3aed", to: "#06b6d4" },
      golden_hour: { from: "#f59e0b", to: "#b45309" },
      arctic: { from: "#93c5fd", to: "#1e40af" },
      sunset: { from: "#ef4444", to: "#7c3aed" },
      moody: { from: "#374151", to: "#111827" },
      dramatic: { from: "#1f2937", to: "#000" },
      pastel: { from: "#fbcfe8", to: "#c7d2fe" },
    };
    return map[filter] || { from: "#6366f1", to: "#0f172a" };
  }
}
