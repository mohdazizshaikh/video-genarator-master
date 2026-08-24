import fs from "fs-extra";
import path from "path";
export interface SkipDataPoint {
  tenantId?: string;
  videoId: string;
  category: string;
  platform: string;
  at3sec: number;
  at10sec: number;
  at30sec: number;
  avgWatchPercent: number;
  recordedAt: string;
}

export interface SkipAnalysis {
  category: string;
  platform: string;
  avgSkipAt3sec: number;
  avgSkipAt10sec: number;
  avgSkipAt30sec: number;
  avgWatchPercent: number;
  hookQuality: "excellent" | "good" | "poor";
  recommendations: string[];
  sampleCount: number;
}

export class SkipAnalysisEngine {
  private dataPath: string;
  private data: SkipDataPoint[] = [];

  constructor(dataDirPath: string) {
    this.dataPath = path.join(dataDirPath, "skip-analysis.json");
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.dataPath)) this.data = fs.readJsonSync(this.dataPath);
    } catch { this.data = []; }
  }

  private save() {
    try { fs.writeJsonSync(this.dataPath, this.data, { spaces: 2 }); } catch { /* ignore */ }
  }

  recordForTenant(tenantId: string, videoId: string, category: string, platform: string, skipData: { at3sec: number; at10sec: number; at30sec: number; avgWatchPercent: number }) {
    if (!tenantId.trim()) throw new Error("tenantId is required");
    this.data.push({ tenantId, videoId, category, platform, ...skipData, recordedAt: new Date().toISOString() });
    if (this.data.length > 5000) this.data = this.data.slice(-4000);
    this.save();
  }

  analyzeForTenant(tenantId: string, category: string, platform: string): SkipAnalysis {
    const points = this.data.filter((d) => d.tenantId === tenantId && d.category === category && d.platform === platform);

    if (points.length === 0) {
      return {
        category, platform, avgSkipAt3sec: 0, avgSkipAt10sec: 0, avgSkipAt30sec: 0,
        avgWatchPercent: 0, hookQuality: "good", recommendations: ["No data yet — record skip data to get insights"], sampleCount: 0,
      };
    }

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const avgSkipAt3sec = Math.round(avg(points.map((p) => p.at3sec)));
    const avgSkipAt10sec = Math.round(avg(points.map((p) => p.at10sec)));
    const avgSkipAt30sec = Math.round(avg(points.map((p) => p.at30sec)));
    const avgWatchPercent = Math.round(avg(points.map((p) => p.avgWatchPercent)));

    let hookQuality: SkipAnalysis["hookQuality"] = "excellent";
    const recommendations: string[] = [];

    if (avgSkipAt3sec > 50) {
      hookQuality = "poor";
      recommendations.push("Over 50% skip in first 3s — use stronger opening hook, pattern interrupt or shocking statement");
    } else if (avgSkipAt3sec > 30) {
      hookQuality = "good";
      recommendations.push("30-50% skip at 3s — refine opening hook with more curiosity or urgency");
    } else {
      recommendations.push("Strong hook — less than 30% skip at 3s. Keep this pattern.");
    }

    if (avgSkipAt10sec > 40) recommendations.push("High drop-off at 10s — add pattern reset or reveal teaser early");
    if (avgWatchPercent < 50) recommendations.push("Low avg watch time — add mid-video cliffhanger or engagement prompt");
    if (avgWatchPercent > 70) recommendations.push("Excellent retention — replicate this content style");

    return { category, platform, avgSkipAt3sec, avgSkipAt10sec, avgSkipAt30sec, avgWatchPercent, hookQuality, recommendations, sampleCount: points.length };
  }

  getAllForTenant(tenantId: string): SkipDataPoint[] {
    if (!tenantId.trim()) return [];
    return this.data.filter((point) => point.tenantId === tenantId);
  }
}
