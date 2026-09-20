/**
 * Canonical category pipeline profiles.
 * This is the contract between classification, media search, rendering, and QA.
 * News is the only profile allowed to use newsroom chrome.
 */
import { MusicMoodEnum } from "../../types/shorts";

export type CanonicalCategory =
  | "Tech" | "Finance" | "Health" | "Food" | "Fitness" | "Travel"
  | "Education" | "Entertainment" | "Sports" | "Motivation" | "Business"
  | "Science" | "Gaming" | "Beauty" | "Parenting" | "News" | "General"
  | "Marketing" | "ITServices";

export type CategoryOverlayMode = "news" | "marketing" | "clean" | "dynamic" | "warm" | "cinematic" | "editorial" | "sports" | "it-showcase";
export type CaptionCase = "sentence" | "title" | "uppercase";

export interface CategoryPipelineProfile {
  category: CanonicalCategory;
  template: "breaking" | "listicle" | "quiz" | "beforeafter" | "brainrot" | "explainer" | "marketing" | "story";
  overlayMode: CategoryOverlayMode;
  captionCase: CaptionCase;
  musicMood: MusicMoodEnum;
  pacing: "slow" | "measured" | "medium" | "fast" | "beat-led";
  mediaPrefixes: string[];
  prohibitedMediaTerms: string[];
  ctaStyle: "source" | "learn" | "save" | "follow" | "consult" | "website" | "neutral";
}

const commonProhibited = ["breaking news", "live desk", "news studio", "ticker"];

export const CATEGORY_PIPELINE_PROFILES: Record<CanonicalCategory, CategoryPipelineProfile> = {
  Tech: { category: "Tech", template: "explainer", overlayMode: "clean", captionCase: "sentence", musicMood: MusicMoodEnum.hopeful, pacing: "medium", mediaPrefixes: ["technology", "software", "device", "data"], prohibitedMediaTerms: commonProhibited, ctaStyle: "learn" },
  Finance: { category: "Finance", template: "explainer", overlayMode: "editorial", captionCase: "sentence", musicMood: MusicMoodEnum.contemplative, pacing: "measured", mediaPrefixes: ["finance", "market analysis", "document", "chart"], prohibitedMediaTerms: ["guaranteed returns", "get rich", ...commonProhibited], ctaStyle: "consult" },
  Health: { category: "Health", template: "explainer", overlayMode: "warm", captionCase: "sentence", musicMood: MusicMoodEnum.chill, pacing: "measured", mediaPrefixes: ["healthcare", "wellness", "doctor", "healthy lifestyle"], prohibitedMediaTerms: ["miracle cure", "diagnose", ...commonProhibited], ctaStyle: "consult" },
  Food: { category: "Food", template: "listicle", overlayMode: "warm", captionCase: "sentence", musicMood: MusicMoodEnum.happy, pacing: "fast", mediaPrefixes: ["food", "cooking", "ingredients", "kitchen"], prohibitedMediaTerms: commonProhibited, ctaStyle: "save" },
  Fitness: { category: "Fitness", template: "listicle", overlayMode: "dynamic", captionCase: "sentence", musicMood: MusicMoodEnum.excited, pacing: "beat-led", mediaPrefixes: ["fitness", "workout", "training", "athlete"], prohibitedMediaTerms: ["instant transformation", ...commonProhibited], ctaStyle: "follow" },
  Travel: { category: "Travel", template: "story", overlayMode: "cinematic", captionCase: "sentence", musicMood: MusicMoodEnum.hopeful, pacing: "medium", mediaPrefixes: ["travel", "destination", "landscape", "journey"], prohibitedMediaTerms: commonProhibited, ctaStyle: "save" },
  Education: { category: "Education", template: "explainer", overlayMode: "clean", captionCase: "sentence", musicMood: MusicMoodEnum.chill, pacing: "measured", mediaPrefixes: ["education", "classroom", "diagram", "learning"], prohibitedMediaTerms: commonProhibited, ctaStyle: "learn" },
  Entertainment: { category: "Entertainment", template: "story", overlayMode: "dynamic", captionCase: "title", musicMood: MusicMoodEnum.happy, pacing: "fast", mediaPrefixes: ["entertainment", "performance", "music", "culture"], prohibitedMediaTerms: commonProhibited, ctaStyle: "follow" },
  Sports: { category: "Sports", template: "listicle", overlayMode: "sports", captionCase: "title", musicMood: MusicMoodEnum.excited, pacing: "beat-led", mediaPrefixes: ["sports", "athlete", "stadium", "training"], prohibitedMediaTerms: commonProhibited, ctaStyle: "follow" },
  Motivation: { category: "Motivation", template: "story", overlayMode: "warm", captionCase: "sentence", musicMood: MusicMoodEnum.hopeful, pacing: "medium", mediaPrefixes: ["motivation", "focus", "progress", "goal"], prohibitedMediaTerms: ["guaranteed success", ...commonProhibited], ctaStyle: "save" },
  Business: { category: "Business", template: "marketing", overlayMode: "marketing", captionCase: "sentence", musicMood: MusicMoodEnum.hopeful, pacing: "medium", mediaPrefixes: ["business", "strategy", "team", "office"], prohibitedMediaTerms: ["guaranteed growth", ...commonProhibited], ctaStyle: "website" },
  Science: { category: "Science", template: "explainer", overlayMode: "clean", captionCase: "sentence", musicMood: MusicMoodEnum.contemplative, pacing: "measured", mediaPrefixes: ["science", "research", "laboratory", "discovery"], prohibitedMediaTerms: commonProhibited, ctaStyle: "source" },
  Gaming: { category: "Gaming", template: "story", overlayMode: "dynamic", captionCase: "sentence", musicMood: MusicMoodEnum.excited, pacing: "beat-led", mediaPrefixes: ["gaming", "gameplay", "controller", "esports"], prohibitedMediaTerms: commonProhibited, ctaStyle: "follow" },
  Beauty: { category: "Beauty", template: "beforeafter", overlayMode: "cinematic", captionCase: "sentence", musicMood: MusicMoodEnum.happy, pacing: "medium", mediaPrefixes: ["beauty", "skincare", "makeup", "style"], prohibitedMediaTerms: ["guaranteed results", ...commonProhibited], ctaStyle: "save" },
  Parenting: { category: "Parenting", template: "story", overlayMode: "warm", captionCase: "sentence", musicMood: MusicMoodEnum.chill, pacing: "slow", mediaPrefixes: ["parenting", "family", "child development", "home"], prohibitedMediaTerms: commonProhibited, ctaStyle: "learn" },
  News: { category: "News", template: "breaking", overlayMode: "news", captionCase: "uppercase", musicMood: MusicMoodEnum.uneasy, pacing: "fast", mediaPrefixes: ["news", "report", "press conference", "current events"], prohibitedMediaTerms: [], ctaStyle: "source" },
  General: { category: "General", template: "story", overlayMode: "clean", captionCase: "sentence", musicMood: MusicMoodEnum.chill, pacing: "medium", mediaPrefixes: ["documentary", "people", "abstract"], prohibitedMediaTerms: commonProhibited, ctaStyle: "neutral" },
  Marketing: { category: "Marketing", template: "marketing", overlayMode: "marketing", captionCase: "sentence", musicMood: MusicMoodEnum.hopeful, pacing: "medium", mediaPrefixes: ["brand", "business", "service", "customer experience"], prohibitedMediaTerms: ["testimonial", "five star review", "guaranteed results", ...commonProhibited], ctaStyle: "website" },
  ITServices: { category: "ITServices", template: "marketing", overlayMode: "it-showcase", captionCase: "sentence", musicMood: MusicMoodEnum.hopeful, pacing: "medium", mediaPrefixes: ["software product", "saas dashboard", "website development", "automation workflow", "ai tool", "cloud infrastructure", "cybersecurity", "erp crm", "it support"], prohibitedMediaTerms: ["guaranteed results", "five star review", "fake dashboard", "fake metric", ...commonProhibited], ctaStyle: "website" },
};

export function normalizePipelineCategory(category?: string): CanonicalCategory {
  const value = String(category || "General").trim().toLowerCase();
  if (value === "technology") return "Tech";
  if (["it", "it services", "it products", "it product services", "software services", "saas marketing", "technology services"].includes(value)) return "ITServices";
  const match = Object.keys(CATEGORY_PIPELINE_PROFILES).find((key) => key.toLowerCase() === value);
  return (match as CanonicalCategory | undefined) || "General";
}

export function resolveCategoryPipeline(category?: string): CategoryPipelineProfile {
  return CATEGORY_PIPELINE_PROFILES[normalizePipelineCategory(category)];
}
