/* eslint-disable @remotion/deterministic-randomness */

import fs from "fs-extra";
import path from "path";
import { logger } from "../logger";

export interface ABVariant {
  id: string;
  testId: string;
  name: string;
  hook?: string;
  thumbnail?: string;
  caption?: string;
  impressions: number;
  clicks: number;
  views: number;
  completions: number;
  likes: number;
  shares: number;
  createdAt: string;
}

export interface ABTest {
  /** Newly-created experiments must belong to exactly one workspace. */
  tenantId: string;
  id: string;
  name: string;
  videoId?: string;
  status: "running" | "paused" | "concluded";
  startedAt: string;
  concludedAt?: string;
  variants: ABVariant[];
  winner?: string;
  winnerConfidence?: number;
  sampleSize: number;
}

export interface StatResult {
  chiSquare: number;
  pValue: number;
  significant: boolean;
  confidence: number;
  winner?: string;
  winnerCtr?: number;
  loserCtr?: number;
  relativeLift?: number;
}

function chiSquarePValue(chi2: number, df = 1): number {
  if (chi2 <= 0) return 1;
  if (df !== 1) {
    // Simple conservative fallback for unsupported degrees of freedom
    return 1;
  }
  const x = chi2 / 2;
  let sum = Math.exp(-x);
  let term = sum;
  for (let i = 1; i <= 50; i++) { term *= x / i; sum += term; }
  return Math.max(0, Math.min(1, sum));
}

export class ABTestingEngine {
  private dataPath: string;
  private tests: ABTest[] = [];

  constructor(dataDirPath: string) {
    this.dataPath = path.join(dataDirPath, "ab-tests.json");
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.dataPath)) this.tests = fs.readJsonSync(this.dataPath);
    } catch { this.tests = []; }
  }

  private save() {
    try { fs.writeJsonSync(this.dataPath, this.tests, { spaces: 2 }); } catch { /* ignore */ }
  }

  createTest(tenantId: string, name: string, videoId?: string, variants?: Partial<ABVariant>[]): ABTest {
    const id = `abt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const defaultVariants: ABVariant[] = (variants || [{ name: "Control" }, { name: "Variant A" }]).map((v, i) => ({
      id: `var_${id}_${i}`, testId: id, name: v.name || `Variant ${i}`,
      hook: v.hook, thumbnail: v.thumbnail, caption: v.caption,
      impressions: 0, clicks: 0, views: 0, completions: 0, likes: 0, shares: 0,
      createdAt: new Date().toISOString(),
      ...v,
    }));

    const test: ABTest = { tenantId, id, name, videoId, status: "running", startedAt: new Date().toISOString(), variants: defaultVariants, sampleSize: 0 };
    this.tests.push(test);
    this.save();
    logger.debug({ id, name }, "ABTestingEngine: test created");
    return test;
  }

  recordEvent(tenantId: string, testId: string, variantId: string, event: "impression" | "click" | "view" | "completion" | "like" | "share", count = 1): void {
    const test = this.tests.find((t) => t.id === testId && t.tenantId === tenantId);
    if (!test) { logger.warn({ testId }, "ABTestingEngine: test not found"); return; }
    const variant = test.variants.find((v) => v.id === variantId);
    if (!variant) { logger.warn({ variantId }, "ABTestingEngine: variant not found"); return; }

    const fieldMap: Record<string, keyof ABVariant> = {
      impression: "impressions", click: "clicks", view: "views",
      completion: "completions", like: "likes", share: "shares",
    };
    const field = fieldMap[event];
    if (field) (variant[field] as number) += count;
    test.sampleSize = test.variants.reduce((s, v) => s + v.impressions, 0);
    this.save();
  }

  analyze(tenantId: string, testId: string): StatResult {
    const test = this.tests.find((t) => t.id === testId && t.tenantId === tenantId);
    if (!test || test.variants.length < 2) {
      return { chiSquare: 0, pValue: 1, significant: false, confidence: 0 };
    }

    const sorted = [...test.variants].sort((a, b) => {
      const ctrA = a.impressions > 0 ? a.clicks / a.impressions : 0;
      const ctrB = b.impressions > 0 ? b.clicks / b.impressions : 0;
      return ctrB - ctrA;
    });

    const [best, worst] = sorted;
    const ctrBest = best.impressions > 0 ? best.clicks / best.impressions : 0;
    const ctrWorst = worst.impressions > 0 ? worst.clicks / worst.impressions : 0;
    const total = best.impressions + worst.impressions;

    if (total < 100) {
      return { chiSquare: 0, pValue: 1, significant: false, confidence: 0, winner: undefined };
    }

    const pooledCtr = (best.clicks + worst.clicks) / total;
    const expected1 = pooledCtr * best.impressions;
    const expected2 = pooledCtr * worst.impressions;
    const chiSquare = expected1 > 0 && expected2 > 0
      ? ((best.clicks - expected1) ** 2 / expected1) + ((worst.clicks - expected2) ** 2 / expected2)
      : 0;

    const pValue = chiSquarePValue(chiSquare);
    const significant = pValue < 0.05;
    const confidence = Math.round((1 - pValue) * 100);
    const relativeLift = ctrWorst > 0 ? Math.round(((ctrBest - ctrWorst) / ctrWorst) * 100) : 0;

    if (significant && test.status === "running") {
      test.winner = best.id;
      test.winnerConfidence = confidence;
      test.status = "concluded";
      test.concludedAt = new Date().toISOString();
      this.save();
    }

    logger.debug({ testId, significant, confidence }, "ABTestingEngine: analysis complete");
    return { chiSquare: Math.round(chiSquare * 100) / 100, pValue: Math.round(pValue * 1000) / 1000, significant, confidence, winner: best.name, winnerCtr: Math.round(ctrBest * 10000) / 100, loserCtr: Math.round(ctrWorst * 10000) / 100, relativeLift };
  }

  getTest(tenantId: string, id: string): ABTest | undefined { return this.tests.find((t) => t.id === id && t.tenantId === tenantId); }
  getAllTests(tenantId: string): ABTest[] { return this.tests.filter((t) => t.tenantId === tenantId); }
  getRunningTests(tenantId: string): ABTest[] { return this.tests.filter((t) => t.tenantId === tenantId && t.status === "running"); }

  pauseTest(tenantId: string, id: string): void {
    const t = this.tests.find((t) => t.id === id && t.tenantId === tenantId);
    if (t) { t.status = "paused"; this.save(); }
  }

  resumeTest(tenantId: string, id: string): void {
    const t = this.tests.find((t) => t.id === id && t.tenantId === tenantId);
    if (t) { t.status = "running"; this.save(); }
  }
}
