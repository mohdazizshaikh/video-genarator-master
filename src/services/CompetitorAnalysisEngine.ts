import fs from "fs-extra";
import path from "path";
import { logger } from "../logger";

export interface CreatorProfile {
  name: string;
  platform: string;
  niche: string;
  estimatedFollowers: number;
  avgViews: number;
  postingFrequency: string;
  viralFormats: string[];
  topHashtags: string[];
  engagementRate: number;
}

export interface ViralPattern {
  format: string;
  avgEngagement: number;
  frequency: string;
  exampleHook: string;
  platforms: string[];
}

export interface CompetitorStrategy {
  niche: string;
  platform: string;
  recommendations: string[];
  gaps: string[];
  opportunities: string[];
  topFormats: string[];
  bestPostingTimes: string[];
}

const CREATOR_POOL: CreatorProfile[] = [
  { name: "TechViralPro", platform: "tiktok", niche: "tech", estimatedFollowers: 2400000, avgViews: 850000, postingFrequency: "3x/day", viralFormats: ["pov", "tutorial", "reaction"], topHashtags: ["#tech", "#ai", "#coding"], engagementRate: 8.2 },
  { name: "FinanceHacks", platform: "instagram", niche: "finance", estimatedFollowers: 1800000, avgViews: 420000, postingFrequency: "2x/day", viralFormats: ["carousel", "tips", "before_after"], topHashtags: ["#money", "#invest", "#finance"], engagementRate: 6.5 },
  { name: "HealthGuru101", platform: "youtube", niche: "health", estimatedFollowers: 3200000, avgViews: 1200000, postingFrequency: "1x/day", viralFormats: ["tutorial", "reaction", "list"], topHashtags: ["#health", "#fitness", "#wellness"], engagementRate: 5.8 },
  { name: "FoodieVibes", platform: "tiktok", niche: "food", estimatedFollowers: 4100000, avgViews: 2300000, postingFrequency: "4x/day", viralFormats: ["recipe", "pov", "trend_audio"], topHashtags: ["#food", "#recipe", "#cooking"], engagementRate: 12.1 },
  { name: "TravelUnlocked", platform: "instagram", niche: "travel", estimatedFollowers: 950000, avgViews: 310000, postingFrequency: "2x/day", viralFormats: ["cinematic", "tips", "before_after"], topHashtags: ["#travel", "#wanderlust", "#adventure"], engagementRate: 9.3 },
  { name: "AICreatorPro", platform: "youtube", niche: "tech", estimatedFollowers: 780000, avgViews: 520000, postingFrequency: "5x/week", viralFormats: ["tutorial", "case_study", "opinion"], topHashtags: ["#ai", "#chatgpt", "#tech"], engagementRate: 7.4 },
  { name: "CryptoWatcher", platform: "x", niche: "finance", estimatedFollowers: 1200000, avgViews: 680000, postingFrequency: "10x/day", viralFormats: ["hot_take", "breaking_news", "thread_teaser"], topHashtags: ["#crypto", "#bitcoin", "#defi"], engagementRate: 4.2 },
  { name: "FitnessFirst", platform: "instagram", niche: "fitness", estimatedFollowers: 2100000, avgViews: 890000, postingFrequency: "3x/day", viralFormats: ["transformation", "tips", "challenge"], topHashtags: ["#fitness", "#gym", "#workout"], engagementRate: 11.6 },
  { name: "MindsetMaster", platform: "tiktok", niche: "motivation", estimatedFollowers: 3500000, avgViews: 1800000, postingFrequency: "3x/day", viralFormats: ["pov", "storytime", "tips"], topHashtags: ["#motivation", "#mindset", "#success"], engagementRate: 9.8 },
  { name: "ScienceByte", platform: "youtube", niche: "educational", estimatedFollowers: 1600000, avgViews: 740000, postingFrequency: "3x/week", viralFormats: ["explainer", "reaction", "documentary"], topHashtags: ["#science", "#facts", "#educational"], engagementRate: 6.9 },
];

const VIRAL_PATTERNS: ViralPattern[] = [
  { format: "POV Story", avgEngagement: 12.4, frequency: "Daily", exampleHook: "POV: You just discovered this {niche} secret", platforms: ["tiktok", "instagram"] },
  { format: "3-Tips Formula", avgEngagement: 9.8, frequency: "3x/week", exampleHook: "3 {niche} tips that changed everything", platforms: ["tiktok", "instagram", "youtube"] },
  { format: "Reaction Video", avgEngagement: 8.3, frequency: "2x/day", exampleHook: "Reacting to the biggest {niche} myth", platforms: ["tiktok", "youtube"] },
  { format: "Before/After", avgEngagement: 11.2, frequency: "Weekly", exampleHook: "Before vs After applying {niche} strategy", platforms: ["instagram", "tiktok"] },
  { format: "Breaking News", avgEngagement: 7.6, frequency: "As needed", exampleHook: "BREAKING: {niche} industry just changed forever", platforms: ["x", "youtube", "telegram"] },
  { format: "Carousel Tutorial", avgEngagement: 10.5, frequency: "2x/week", exampleHook: "Save this {niche} guide (swipe ➡️)", platforms: ["instagram", "linkedin"] },
  { format: "Challenge/Trend", avgEngagement: 15.2, frequency: "Weekly", exampleHook: "Trying the viral {niche} challenge", platforms: ["tiktok", "instagram"] },
];

export interface CompetitorRecord {
  tenantId?: string;
  niche: string;
  platform: string;
  analyzedAt: string;
  creators: CreatorProfile[];
  strategy: CompetitorStrategy;
}

export class CompetitorAnalysisEngine {
  private dataPath: string;
  private records: CompetitorRecord[] = [];

  constructor(dataDirPath: string) {
    this.dataPath = path.join(dataDirPath, "competitor-analysis.json");
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.dataPath)) this.records = fs.readJsonSync(this.dataPath);
    } catch { this.records = []; }
  }

  private save() {
    try { fs.writeJsonSync(this.dataPath, this.records, { spaces: 2 }); } catch { /* ignore */ }
  }

  analyzeCompetitor(niche: string, platform: string): CreatorProfile[] {
    const nicheL = niche.toLowerCase();
    const platformL = platform.toLowerCase();
    return CREATOR_POOL
      .filter((c) => (c.niche === nicheL || nicheL === "all") && (c.platform === platformL || platformL === "all"))
      .sort((a, b) => b.avgViews - a.avgViews)
      .slice(0, 10);
  }

  detectViralPatterns(platform?: string): ViralPattern[] {
    if (!platform) return VIRAL_PATTERNS;
    const platformL = platform.toLowerCase();
    return VIRAL_PATTERNS.filter((p) => p.platforms.includes(platformL));
  }

  generateStrategyForTenant(tenantId: string, niche: string, platform: string): CompetitorStrategy {
    if (!tenantId.trim()) throw new Error("tenantId is required");
    const creators = this.analyzeCompetitor(niche, platform);
    const patterns = this.detectViralPatterns(platform);

    const allFormats = creators.flatMap((c) => c.viralFormats);
    const formatFrequency: Record<string, number> = {};
    for (const f of allFormats) formatFrequency[f] = (formatFrequency[f] || 0) + 1;
    const topFormats = Object.entries(formatFrequency).sort(([, a], [, b]) => b - a).slice(0, 5).map(([f]) => f);

    const allHashtags = creators.flatMap((c) => c.topHashtags);
    const hashtagFrequency: Record<string, number> = {};
    for (const h of allHashtags) hashtagFrequency[h] = (hashtagFrequency[h] || 0) + 1;

    const avgEngagement = creators.length > 0
      ? Math.round((creators.reduce((s, c) => s + c.engagementRate, 0) / creators.length) * 10) / 10
      : 8;

    const strategy: CompetitorStrategy = {
      niche,
      platform,
      topFormats,
      bestPostingTimes: platform === "tiktok" ? ["7am", "12pm", "7pm"] : platform === "instagram" ? ["8am", "11am", "6pm"] : ["9am", "2pm", "8pm"],
      recommendations: [
        `Post in top formats: ${topFormats.slice(0, 3).join(", ")}`,
        `Target engagement rate above ${avgEngagement}% (niche average)`,
        `Use popular hashtags: ${Object.keys(hashtagFrequency).slice(0, 5).join(", ")}`,
        `Posting frequency: ${creators[0]?.postingFrequency || "2x/day"}`,
        `Leverage these viral patterns: ${patterns.slice(0, 2).map((p) => p.format).join(", ")}`,
      ],
      gaps: [
        `Only ${creators.filter((c) => c.engagementRate > 10).length} creators above 10% engagement — room to stand out`,
        `Trending formats like ${patterns[0]?.format} are underutilized`,
        `Interactive content (polls, Q&A) is sparse in this niche`,
      ],
      opportunities: [
        `High-performing format "${patterns[0]?.format}" averages ${patterns[0]?.avgEngagement}% engagement`,
        `Early adoption of emerging trends in ${niche} gives first-mover advantage`,
        `Cross-platform repurposing from ${platform} to other channels`,
      ],
    };

    const record: CompetitorRecord = { tenantId, niche, platform, analyzedAt: new Date().toISOString(), creators, strategy };
    const idx = this.records.findIndex((r) => r.tenantId === tenantId && r.niche === niche && r.platform === platform);
    if (idx >= 0) this.records[idx] = record;
    else this.records.push(record);
    this.save();
    logger.debug({ niche, platform }, "Competitor analysis generated");
    return strategy;
  }

  getHistoryForTenant(tenantId: string): CompetitorRecord[] {
    if (!tenantId.trim()) return [];
    return this.records.filter((record) => record.tenantId === tenantId);
  }
  getAllCreators(): CreatorProfile[] { return CREATOR_POOL; }
  getAllPatterns(): ViralPattern[] { return VIRAL_PATTERNS; }
}
