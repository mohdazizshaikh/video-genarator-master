import { ContentBucketEngine, type BucketType } from './ContentBucketEngine';
import { CompetitorAnalysisEngine } from './CompetitorAnalysisEngine';
import { EngagementPredictionEngine } from './EngagementPredictionEngine';
import { TrendEngine, type TrendTopic } from './TrendEngine';
import { ViralRadarEngine, type ViralAlert } from './ViralRadarEngine';

export interface IntelligenceBriefInput { tenantId: string; category: string; platform: string; niche: string; topic?: string; }
export interface IntelligenceBrief { topic: string; category: string; sourceLinks: string[]; keywords: string[]; trendScore: number; viralScore: number; priority: 'critical' | 'high' | 'medium' | 'normal'; bucket: BucketType; suggestedFormat: string; hookDirection: string; targetAudience: string; peakTime: string; confidence: number; requiresHumanReview: true; rationale: string[]; }

export class ContentIntelligenceEngine {
  private readonly trends: TrendEngine;
  private readonly radar: ViralRadarEngine;
  private readonly competitors: CompetitorAnalysisEngine;
  private readonly engagement: EngagementPredictionEngine;
  private readonly buckets: ContentBucketEngine;
  constructor(dataDirPath: string) {
    this.trends = new TrendEngine();
    this.radar = new ViralRadarEngine(this.trends);
    this.competitors = new CompetitorAnalysisEngine(dataDirPath);
    this.engagement = new EngagementPredictionEngine();
    this.buckets = new ContentBucketEngine(dataDirPath);
  }
  async buildBrief(input: IntelligenceBriefInput): Promise<IntelligenceBrief> {
    const trendResult = await this.trends.fetchTrends([input.category]);
    const radarResult = await this.radar.scan();
    const topic = this.selectTopic(input, trendResult.topics, radarResult.alerts);
    const alert = radarResult.alerts.find((item) => this.sameTopic(item.title, topic.title));
    const strategy = this.competitors.generateStrategyForTenant(input.tenantId, input.niche, input.platform);
    const bucket = this.buckets.getNextRecommendedBucket();
    const topicTrend: 'low' | 'medium' | 'high' = topic.trendScore >= 70 ? 'high' : topic.trendScore >= 40 ? 'medium' : 'low';
    const prediction = this.engagement.predictEngagement(1000, topicTrend === 'high' ? 'high' : 'medium', topicTrend, 'medium');
    const priority = alert?.priority ?? (topic.viralScore >= 70 ? 'high' : 'normal');
    const sourceLinks = topic.link ? [topic.link] : [];
    const confidence = Math.round(Math.min(100, (sourceLinks.length ? 35 : 15) + Math.min(topic.trendScore, 30) + Math.min(topic.viralScore, 25) + (strategy ? 10 : 0)));
    return {
      topic: topic.title,
      category: input.category,
      sourceLinks,
      keywords: topic.keywords,
      trendScore: topic.trendScore,
      viralScore: topic.viralScore,
      priority,
      bucket,
      suggestedFormat: strategy?.topFormats?.[0] ?? 'Explainer',
      hookDirection: strategy?.recommendations?.[0] ?? 'Lead with one useful, source-backed insight',
      targetAudience: prediction.targetAudience,
      peakTime: prediction.peakTime,
      confidence,
      requiresHumanReview: true,
      rationale: [
        `Trend score ${topic.trendScore}/100 from ${topic.source}`,
        `Viral score ${topic.viralScore}/100; prioritization only, not factual proof`,
        `Content mix recommendation: ${bucket}`,
        'Human Editorial review is mandatory before release or publishing',
      ],
    };
  }
  private selectTopic(input: IntelligenceBriefInput, topics: TrendTopic[], alerts: ViralAlert[]): TrendTopic {
    if (input.topic) return topics.find((item) => this.sameTopic(item.title, input.topic!)) ?? { title: input.topic, category: input.category, source: 'user-provided', trendScore: 0, viralScore: 0, keywords: [], fetchedAt: new Date().toISOString() };
    const alert = alerts.find((item) => item.category.toLowerCase() === input.category.toLowerCase());
    if (alert) return { title: alert.title, category: alert.category, source: alert.source, trendScore: alert.risingScore, viralScore: Math.max(0, 100 - alert.saturationScore), keywords: alert.keywords, fetchedAt: alert.detectedAt };
    return topics[0] ?? { title: `${input.category} insights`, category: input.category, source: 'category-fallback', trendScore: 0, viralScore: 0, keywords: [], fetchedAt: new Date().toISOString() };
  }
  private sameTopic(a: string, b: string): boolean { return a.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim() === b.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); }
}
