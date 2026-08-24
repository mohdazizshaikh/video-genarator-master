import { logger } from "../logger";
import { HumanizedContentEngine } from "./HumanizedContentEngine";
import { EmotionalResonanceEngine } from "./EmotionalResonanceEngine";
import { QualityScoringEngine } from "./QualityScoringEngine";
import { AttentionOptimizerEngine } from "./AttentionOptimizerEngine";
import { EngagementPredictionEngine } from "./EngagementPredictionEngine";
import { ThumbnailEngine } from "./ThumbnailEngine";
import { WatermarkEngine } from "./WatermarkEngine";
import { HookLibraryEngine } from "./HookLibraryEngine";
import { PipelineStore, type PipelineJob, type GeneratedVariation, type AIScores } from "../db/PipelineStore";
import { ScheduleStore } from "../db/ScheduleStore";

export interface PipelineInput {
  tenantId?: string;
  topic: string;
  platform: "tiktok" | "instagram" | "youtube" | "youtube_shorts" | "linkedin";
  tone: "excited" | "calm" | "urgent" | "informative" | "humorous";
  bulkCount?: number;
  autoSchedule?: boolean;
}

export interface PipelineResult {
  job: PipelineJob;
  topVariations: GeneratedVariation[];
  allVariations: GeneratedVariation[];
}

const PLATFORM_HASHTAGS: Record<string, string[]> = {
  tiktok: ["#fyp", "#foryoupage", "#viral", "#trending"],
  instagram: ["#reels", "#instadaily", "#explore", "#viral"],
  youtube: ["#youtube", "#youtubevideos", "#subscribe"],
  youtube_shorts: ["#shorts", "#youtubeshorts", "#viral"],
  linkedin: ["#linkedin", "#professional", "#growth", "#business"],
};

const TOPIC_HASHTAGS: Record<string, string[]> = {
  business: ["#business", "#entrepreneur", "#success", "#money"],
  health: ["#health", "#wellness", "#fitness", "#selfcare"],
  tech: ["#tech", "#technology", "#ai", "#innovation"],
  motivation: ["#motivation", "#mindset", "#inspiration", "#goals"],
  finance: ["#finance", "#investing", "#wealth", "#financialfreedom"],
  education: ["#education", "#learning", "#knowledge", "#tips"],
};

export class PipelineOrchestrator {
  private humanized: HumanizedContentEngine;
  private emotional: EmotionalResonanceEngine;
  private quality: QualityScoringEngine;
  private attention: AttentionOptimizerEngine;
  private engagement: EngagementPredictionEngine;
  private thumbnail: ThumbnailEngine;
  private watermark: WatermarkEngine;
  private hooks: HookLibraryEngine;
  private store: PipelineStore;
  private scheduleStore: ScheduleStore;

  constructor(dataDirPath: string) {
    this.humanized = new HumanizedContentEngine(dataDirPath);
    this.emotional = new EmotionalResonanceEngine();
    this.quality = new QualityScoringEngine();
    this.attention = new AttentionOptimizerEngine();
    this.engagement = new EngagementPredictionEngine();
    this.thumbnail = new ThumbnailEngine();
    this.watermark = new WatermarkEngine();
    this.hooks = new HookLibraryEngine(dataDirPath);
    this.store = new PipelineStore(dataDirPath);
    this.scheduleStore = new ScheduleStore(dataDirPath);
  }

  async run(input: PipelineInput): Promise<PipelineResult> {
    const startTime = Date.now();
    const bulkCount = Math.min(Math.max(input.bulkCount ?? 1, 1), 30);

    const job = await this.store.createJob({
      tenantId: input.tenantId,
      topic: input.topic,
      platform: input.platform,
      tone: input.tone,
      bulkCount,
      autoSchedule: input.autoSchedule ?? false,
    });

    logger.info({ jobId: job.id, topic: input.topic, platform: input.platform, bulkCount }, "Pipeline started");

    try {
      await this.store.updateJob(job.id, { status: "running", currentStep: "generating-hooks" });

      const hookStrings = this.hooks.generateWithTopic(input.topic, {
        platform: input.platform,
        limit: Math.max(bulkCount, 5),
      });

      await this.store.updateJob(job.id, { currentStep: "running-ai-engines" });

      const variations: GeneratedVariation[] = [];

      for (let i = 0; i < bulkCount; i++) {
        const hookText = hookStrings[i % hookStrings.length];
        const script = `${hookText} — ${input.topic}. This is your complete guide to understanding ${input.topic} on ${input.platform}.`;

        const humanizedOutput = this.humanized.humanizeContent(script, input.tone);
        const emotionalScore = this.emotional.scoreEmotionalContent(script, 30, 5);
        const emotionalDirectives = this.emotional.generateEmotionalDirectives(emotionalScore.tone);
        const qualityMetrics = this.quality.scoreContent(true, -14, 1920, 30, script.length);
        const attentionOpt = this.attention.optimizeForAttention(30, input.platform === "youtube" ? "youtube" : input.platform === "youtube_shorts" ? "youtube_shorts" : input.platform === "instagram" ? "instagram" : "tiktok");
        const engagementPred = this.engagement.predictEngagement(1000, "high", "high", "medium");

        const thumbnailDirectives = this.thumbnail.generateThumbnailDirectives({
          title: input.topic,
          boldText: true,
          contrast: "high",
          emotionalTrigger: "curiosity",
          curiosityGap: `The ${input.topic} secret nobody tells you...`,
          backgroundColor: "#1e293b",
          textColor: "#ffffff",
          accentColor: "#6366f1",
        });

        const watermarkFilter = this.watermark.buildFfmpegFilter({ text: `@${input.platform}` });

        const caption = this.buildCaption(input.topic, input.platform, input.tone, hookText);
        const hashtags = this.buildHashtags(input.topic, input.platform);

        const aiScores: AIScores = {
          emotionalScore: Math.round(emotionalScore.overallScore * 100),
          qualityScore: Math.round(qualityMetrics.overallScore),
          attentionScore: Math.round(attentionOpt.estimatedRetention * 100),
          engagementScore: Math.round(Math.min(engagementPred.viralScore, 100)),
          overallScore: 0,
        };
        aiScores.overallScore = Math.round(
          (aiScores.emotionalScore + aiScores.qualityScore + aiScores.attentionScore + aiScores.engagementScore) / 4,
        );

        const variation = await this.store.saveVariation({
          tenantId: input.tenantId,
          jobId: job.id,
          hook: hookText,
          caption,
          hashtags,
          humanizedOutput: humanizedOutput as unknown as Record<string, unknown>,
          emotionalDirectives: emotionalDirectives as unknown as Record<string, unknown>,
          thumbnailDirectives: thumbnailDirectives as unknown as Record<string, unknown>,
          watermarkFilter,
          aiScores,
          rank: i + 1,
        });

        variations.push(variation);
      }

      variations.sort((a, b) => b.aiScores.overallScore - a.aiScores.overallScore);
      variations.forEach((v, idx) => { v.rank = idx + 1; });

      const topVariations = variations.slice(0, 3);
      const scheduleIds: string[] = [];

      if (input.autoSchedule && topVariations.length > 0) {
        await this.store.updateJob(job.id, { currentStep: "scheduling" });

        for (const variation of topVariations) {
          const publishAt = new Date(Date.now() + (scheduleIds.length + 1) * 24 * 60 * 60 * 1000);
          const schedule = await this.scheduleStore.createForTenant(input.tenantId ?? "", {
            name: `Pipeline: ${input.topic} — Variation #${variation.rank}`,
            videoId: `pipeline_${job.id}_${variation.id}`,
            platforms: [input.platform],
            categories: [this.detectCategory(input.topic)],
            languages: ["en"],
            engines: {
              enableTranslation: false,
              enableCommentCTA: true,
              enablePlatformPsych: true,
              enableSeries: false,
              enableHumanMimicry: true,
              enableHashtagOptimization: true,
              enableEngagementOptimization: true,
            },
            quality: { targetLUFS: -14, sharpnessLevel: 8, visualQualityTier: "premium" },
            cronExpression: "0 18 * * *",
            publishAt: publishAt.toISOString(),
            status: "active",
            metadata: {
              tags: ["pipeline", "auto-generated"],
              notes: `Auto-scheduled from pipeline job ${job.id}. Score: ${variation.aiScores.overallScore}`,
            },
          });
          scheduleIds.push(schedule.id);
        }
      }

      const completedJob = await this.store.updateJob(job.id, {
        status: "completed",
        currentStep: "done",
        totalVariations: variations.length,
        topVariations: topVariations.map((v) => v.id),
        scheduleIds,
        durationMs: Date.now() - startTime,
      });

      logger.info({ jobId: job.id, variations: variations.length, scheduleIds: scheduleIds.length, durationMs: Date.now() - startTime }, "Pipeline completed");

      return {
        job: completedJob!,
        topVariations,
        allVariations: variations,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      await this.store.updateJob(job.id, { status: "failed", currentStep: "error", error });
      logger.error({ err, jobId: job.id }, "Pipeline failed");
      throw err;
    }
  }

  private buildCaption(topic: string, platform: string, tone: string, hook: string): string {
    const hookText = hook.replace("{topic}", topic);

    const toneOpeners: Record<string, string> = {
      excited: `🚀 ${hookText}`,
      calm: `✨ ${hookText}`,
      urgent: `⚠️ ${hookText}`,
      informative: `📌 ${hookText}`,
      humorous: `😄 ${hookText}`,
    };

    const ctas: Record<string, string> = {
      tiktok: "Follow for more! Drop a comment if this helped 👇",
      instagram: "Save this post! Share with someone who needs to see it 💾",
      youtube: "Subscribe for weekly content! Comment your thoughts below 💬",
      youtube_shorts: "Subscribe and hit the bell! 🔔",
      linkedin: "Follow for insights! Share with your network 🤝",
    };

    return `${toneOpeners[tone] || hookText}\n\nLearn everything you need to know about ${topic} in this post.\n\n${ctas[platform] || "Follow for more!"}`;
  }

  private buildHashtags(topic: string, platform: string): string[] {
    const platformTags = PLATFORM_HASHTAGS[platform] || [];
    const detectedCategory = this.detectCategory(topic);
    const topicTags = TOPIC_HASHTAGS[detectedCategory] || [`#${topic.toLowerCase().replace(/\s+/g, "")}`];
    const genericTags = ["#content", "#creator", "#viral2025"];
    return [...new Set([...platformTags, ...topicTags, ...genericTags])].slice(0, 15);
  }

  private detectCategory(topic: string): string {
    const lower = topic.toLowerCase();
    if (/money|business|startup|entrepreneur|profit|revenue/.test(lower)) return "business";
    if (/health|fitness|diet|workout|wellness|sleep/.test(lower)) return "health";
    if (/tech|ai|software|coding|app|digital/.test(lower)) return "tech";
    if (/motivation|mindset|success|goal|discipline/.test(lower)) return "motivation";
    if (/invest|finance|stock|crypto|wealth/.test(lower)) return "finance";
    if (/learn|education|study|school|course/.test(lower)) return "education";
    return "education";
  }

  getStore(): PipelineStore {
    return this.store;
  }
}
