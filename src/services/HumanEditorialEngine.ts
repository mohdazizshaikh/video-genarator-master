import { AntiDuplicationEngine, type DuplicationCheckResult } from "./AntiDuplicationEngine";
import { ModerationEngine, type ModerationResult } from "./ModerationEngine";

export type EditorialDecision = "ready_for_human_review" | "needs_revision" | "blocked";

export interface EditorialSource { url: string; title?: string; excerpt?: string; }
export interface HumanEditorialInput {
  tenantId: string; category: string; title: string; script: string;
  sources?: EditorialSource[]; mediaAssetIds?: string[]; captionLines?: string[];
  hasAudio?: boolean; durationSeconds?: number; videoType?: "short" | "long";
  visualQualityScore?: number; audioQualityScore?: number;
}
export interface EditorialReview {
  decision: EditorialDecision; score: number; moderation: ModerationResult;
  duplication: DuplicationCheckResult;
  sourceCoverage: { required: boolean; passed: boolean; sourceCount: number; reason?: string };
  originality: { passed: boolean; repeatedLineRatio: number; repeatedMediaCount: number; suggestions: string[] };
  production: { passed: boolean; issues: string[] };
  reviewerChecklist: string[]; suggestions: string[];
}

const SOURCE_REQUIRED_CATEGORIES = new Set(["news", "finance", "health", "science", "marketing", "it", "itservices", "technologyservices"]);
function normalizeCategory(category: string): string { return category.toLowerCase().replace(/[\s_-]+/g, "").trim(); }
function tokenize(text: string): string[] { return [...new Set(text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((token) => token.length > 2))]; }
function repeatedLineRatio(lines: string[]): number {
  const normalized = lines.map((line) => line.toLowerCase().replace(/\s+/g, " ").trim()).filter(Boolean);
  if (normalized.length < 2) return 0;
  return (normalized.length - new Set(normalized).size) / normalized.length;
}

export class HumanEditorialEngine {
  private readonly moderation = new ModerationEngine();
  private readonly duplication: AntiDuplicationEngine;
  private readonly reviewedKeys = new Set<string>();
  constructor(dataDirPath: string) { this.duplication = new AntiDuplicationEngine(dataDirPath); }
  review(input: HumanEditorialInput): EditorialReview {
    const category = normalizeCategory(input.category);
    const moderation = this.moderation.scan(`${input.title}\n${input.script}`.trim());
    const tokens = tokenize(`${input.title} ${input.script}`);
    const editorialKey = `${input.tenantId}:${category}:${input.title.toLowerCase().replace(/\s+/g, " ").trim()}`;
    const duplication = this.reviewedKeys.has(editorialKey)
      ? { isDuplicate: true, similarity: 1, matchedTitle: input.title }
      : this.duplication.check(input.title, tokens, category, input.tenantId);
    const sources = input.sources ?? [];
    const sourceRequired = SOURCE_REQUIRED_CATEGORIES.has(category);
    const sourceCoverage = { required: sourceRequired, passed: !sourceRequired || sources.some((source) => /^https?:\/\//i.test(source.url)), sourceCount: sources.length, ...(sourceRequired && sources.length === 0 ? { reason: "Source evidence is required for this category" } : {}) };
    const lineRatio = repeatedLineRatio(input.captionLines ?? input.script.split(/[.!?\n]+/));
    const mediaIds = input.mediaAssetIds ?? [];
    const repeatedMediaCount = mediaIds.length - new Set(mediaIds).size;
    const originalitySuggestions: string[] = [];
    if (lineRatio > 0.2) originalitySuggestions.push("Rewrite repeated caption or script lines");
    if (repeatedMediaCount > 0) originalitySuggestions.push("Replace repeated media assets");
    if (duplication.isDuplicate) originalitySuggestions.push("Change the angle, hook, or supporting examples before review");
    const originalityPassed = !duplication.isDuplicate && lineRatio <= 0.2 && repeatedMediaCount === 0;
    const productionIssues: string[] = [];
    if (input.hasAudio === false) productionIssues.push("Audio or narration is missing");
    if (input.durationSeconds !== undefined) {
      const min = input.videoType === "long" ? 60 : 3;
      const max = input.videoType === "long" ? 3600 : 180;
      if (input.durationSeconds < min || input.durationSeconds > max) productionIssues.push("Duration is outside the configured video mode range");
    }
    if ((input.visualQualityScore ?? 100) < 70) productionIssues.push("Visual quality score is below review threshold");
    if ((input.audioQualityScore ?? 100) < 70) productionIssues.push("Audio quality score is below review threshold");
    const blocked = !moderation.passed || moderation.overallSeverity === "critical";
    const needsRevision = !blocked && (!sourceCoverage.passed || !originalityPassed || productionIssues.length > 0);
    const decision: EditorialDecision = blocked ? "blocked" : needsRevision ? "needs_revision" : "ready_for_human_review";
    const score = Math.max(0, Math.min(100, Math.round((moderation.passed ? 30 : 0) + (sourceCoverage.passed ? 20 : 0) + (originalityPassed ? 25 : Math.max(0, 25 - Math.round(lineRatio * 25))) + (productionIssues.length === 0 ? 25 : 10))));
    const reviewerChecklist = ["Verify every material claim against the listed source evidence", "Confirm category and overlay match the actual content", "Check captions, narration, safe areas, contrast, and media reuse", "Confirm no fabricated testimonial, rating, result, score, or personal experience", "Approve only after required checks are explicitly completed"];
    if (!duplication.isDuplicate && sourceCoverage.passed && productionIssues.length === 0 && lineRatio <= 0.2 && repeatedMediaCount === 0) {
      this.duplication.register(input.title, tokenize(`${input.title} ${input.script}`), category, input.tenantId);
      this.reviewedKeys.add(editorialKey);
    }
    const suggestions = [...new Set([...moderation.suggestedActions, ...originalitySuggestions, ...productionIssues])];
    return { decision, score, moderation, duplication, sourceCoverage, originality: { passed: originalityPassed, repeatedLineRatio: lineRatio, repeatedMediaCount, suggestions: originalitySuggestions }, production: { passed: productionIssues.length === 0, issues: productionIssues }, reviewerChecklist, suggestions };
  }
}
