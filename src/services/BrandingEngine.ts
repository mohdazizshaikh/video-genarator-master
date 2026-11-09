import fs from "fs-extra";
import path from "path";
import { logger } from "../logger";

export interface BrandingColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

export interface BrandingTypography {
  fontFamily: string;
  headingWeight: number;
  bodyWeight: number;
}

export interface BrandingLogo {
  light: string;
  dark: string;
}

export interface BrandingConfig {
  tenantId: string;
  name: string;
  description: string;
  logo: BrandingLogo;
  colors: BrandingColors;
  typography: BrandingTypography;
  domain: string;
  customDomain: boolean;
  favicon: string;
  updatedAt: string;
}

const DEFAULT_BRANDING: BrandingConfig = {
  tenantId: "default",
  name: "AI Content Empire",
  description: "AI-powered viral content creation platform",
  logo: {
    light: "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%236366f1%22/%3E%3C/svg%3E",
    dark: "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%23a5b4fc%22/%3E%3C/svg%3E",
  },
  colors: {
    primary: "#6366f1",
    secondary: "#f59e0b",
    accent: "#22c55e",
    background: "#0f172a",
  },
  typography: {
    fontFamily: "Inter, Roboto, Helvetica, Arial, sans-serif",
    headingWeight: 700,
    bodyWeight: 400,
  },
  domain: "localhost:5000",
  customDomain: false,
  favicon: "/favicon.ico",
  updatedAt: new Date().toISOString(),
};

export class BrandingEngine {
  private dataPath: string;
  private brandingMap: Map<string, BrandingConfig> = new Map();

  constructor(dataDirPath: string) {
    this.dataPath = path.join(dataDirPath, "branding.json");
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data = fs.readJsonSync(this.dataPath) as Record<string, BrandingConfig>;
        Object.entries(data).forEach(([tenantId, config]) => {
          this.brandingMap.set(tenantId, config);
        });
      } else {
        this.brandingMap.set("default", DEFAULT_BRANDING);
        this.save();
      }
    } catch (err) {
      logger.warn({ err }, "Failed to load branding config, using defaults");
      this.brandingMap.set("default", DEFAULT_BRANDING);
    }
  }

  private save() {
    try {
      const obj: Record<string, BrandingConfig> = {};
      this.brandingMap.forEach((config, tenantId) => {
        obj[tenantId] = config;
      });
      fs.ensureFileSync(this.dataPath);
      fs.writeJsonSync(this.dataPath, obj, { spaces: 2 });
    } catch (err) {
      logger.error({ err }, "Failed to save branding config");
    }
  }

  getBranding(tenantId: string): BrandingConfig {
    return this.brandingMap.get(tenantId) || { ...DEFAULT_BRANDING, tenantId };
  }

  updateBranding(tenantId: string, updates: Partial<BrandingConfig>): BrandingConfig {
    const current = this.getBranding(tenantId);
    const updated: BrandingConfig = {
      ...current,
      ...updates,
      tenantId,
      updatedAt: new Date().toISOString(),
    };
    this.brandingMap.set(tenantId, updated);
    this.save();
    logger.info({ tenantId }, "Branding updated");
    return updated;
  }

  resetBranding(tenantId: string): BrandingConfig {
    const reset = { ...DEFAULT_BRANDING, tenantId, updatedAt: new Date().toISOString() };
    this.brandingMap.set(tenantId, reset);
    this.save();
    logger.info({ tenantId }, "Branding reset to default");
    return reset;
  }

  getAllBranding(): Record<string, BrandingConfig> {
    const obj: Record<string, BrandingConfig> = {};
    this.brandingMap.forEach((config, tenantId) => {
      obj[tenantId] = config;
    });
    return obj;
  }

  generateThemeCss(tenantId: string): string {
    const config = this.getBranding(tenantId);
    return `
:root {
  --color-primary: ${config.colors.primary};
  --color-secondary: ${config.colors.secondary};
  --color-accent: ${config.colors.accent};
  --color-background: ${config.colors.background};
  --font-family: ${config.typography.fontFamily};
  --font-heading-weight: ${config.typography.headingWeight};
  --font-body-weight: ${config.typography.bodyWeight};
}

body {
  font-family: var(--font-family);
  font-weight: var(--font-body-weight);
  background-color: var(--color-background);
}

h1, h2, h3, h4, h5, h6 {
  font-weight: var(--font-heading-weight);
  color: var(--color-primary);
}

a {
  color: var(--color-secondary);
}

button.primary {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
}
    `.trim();
  }

  validateDomain(domain: string): boolean {
    const regex = /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(:[0-9]+)?$/;
    return regex.test(domain);
  }

  validateColors(colors: BrandingColors): boolean {
    const colorRegex = /^#[0-9A-F]{6}$/i;
    return Object.values(colors).every((c) => colorRegex.test(c));
  }
}
