/**
 * ThemeEngine – genre-aware visual + audio theming for rendered videos.
 *
 * Maps a content category (plus optional per-scene subcategory) to a full
 * rendering theme: background/palette, overlay accent + label, caption tone,
 * chapter styling, music mood, and a deterministic template variant.
 *
 * This is the single source of truth for "genre → look" so different genres
 * no longer all render like one news template.
 */
import { MusicMoodEnum } from "../../types/shorts";
import { resolveCategoryPipeline } from "./CategoryPipelineProfiles";

export type TemplateVariantName =
  | "classic"
  | "modern"
  | "bold"
  | "dark"
  | "soft";

export interface VideoTheme {
  family: string;
  label: string;
  subLabels: string[];
  palette: {
    bg: string;
    bgAlt: string;
    accent: string;
    accentSoft: string;
    accentGlow: string;
    headlineColor: string;
    captionHighlight: string;
  };
  musicMood: MusicMoodEnum;
  fontTone: "condensed" | "clean" | "rounded";
  variants: TemplateVariantName[];
}

const THEMES: VideoTheme[] = [
  {
    family: "News",
    label: "Top Story",
    subLabels: ["Breaking", "World Desk"],
    palette: {
      bg: "#071018",
      bgAlt: "#0b1420",
      accent: "#ff5a36",
      accentSoft: "#fff1ea",
      accentGlow: "rgba(255, 90, 54, 0.38)",
      headlineColor: "#ffffff",
      captionHighlight: "#ff5a36",
    },
    musicMood: MusicMoodEnum.uneasy,
    fontTone: "condensed",
    variants: ["classic", "bold", "dark"],
  },
  {
    family: "Sports",
    label: "Sports Desk",
    subLabels: ["Match Day", "Highlights", "Score"],
    palette: {
      bg: "#04100b",
      bgAlt: "#062015",
      accent: "#30d158",
      accentSoft: "#d2ffe0",
      accentGlow: "rgba(48, 209, 88, 0.38)",
      headlineColor: "#ffffff",
      captionHighlight: "#c3ff5a",
    },
    musicMood: MusicMoodEnum.excited,
    fontTone: "rounded",
    variants: ["bold", "modern", "classic"],
  },
  {
    family: "Finance",
    label: "Market Watch",
    subLabels: ["Markets", "Trade Desk", "Business"],
    palette: {
      bg: "#100d04",
      bgAlt: "#191507",
      accent: "#ffd166",
      accentSoft: "#fff5cf",
      accentGlow: "rgba(255, 209, 102, 0.38)",
      headlineColor: "#ffffff",
      captionHighlight: "#ffd166",
    },
    musicMood: MusicMoodEnum.contemplative,
    fontTone: "condensed",
    variants: ["dark", "classic", "modern"],
  },
  {
    family: "Tech",
    label: "Deep Brief",
    subLabels: ["Gadgets", "AI", "Startups", "Science"],
    palette: {
      bg: "#050b14",
      bgAlt: "#0a1a2e",
      accent: "#4cc9f0",
      accentSoft: "#d7f7ff",
      accentGlow: "rgba(76, 201, 240, 0.38)",
      headlineColor: "#ffffff",
      captionHighlight: "#4cc9f0",
    },
    musicMood: MusicMoodEnum.hopeful,
    fontTone: "clean",
    variants: ["modern", "dark", "classic"],
  },
  {
    family: "Entertainment",
    label: "In The Spotlight",
    subLabels: ["Pop Culture", "Lifestyle", "Trending"],
    palette: {
      bg: "#14050f",
      bgAlt: "#200a18",
      accent: "#ff6ec7",
      accentSoft: "#ffe3f4",
      accentGlow: "rgba(255, 110, 199, 0.4)",
      headlineColor: "#ffffff",
      captionHighlight: "#ff6ec7",
    },
    musicMood: MusicMoodEnum.happy,
    fontTone: "rounded",
    variants: ["soft", "bold", "modern"],
  },
  {
    family: "Science",
    label: "Depth Briefing",
    subLabels: ["Space", "Research", "Climate"],
    palette: {
      bg: "#07121a",
      bgAlt: "#0b1b26",
      accent: "#6ee7ff",
      accentSoft: "#dcfaff",
      accentGlow: "rgba(110, 231, 255, 0.35)",
      headlineColor: "#ffffff",
      captionHighlight: "#6ee7ff",
    },
    musicMood: MusicMoodEnum.contemplative,
    fontTone: "clean",
    variants: ["modern", "soft", "dark"],
  },
  {
    family: "Health",
    label: "Wellness Desk",
    subLabels: ["Fitness", "Health", "Nutrition"],
    palette: {
      bg: "#071510",
      bgAlt: "#0a2218",
      accent: "#5dd9a8",
      accentSoft: "#d8f8e9",
      accentGlow: "rgba(93, 217, 168, 0.35)",
      headlineColor: "#ffffff",
      captionHighlight: "#5dd9a8",
    },
    musicMood: MusicMoodEnum.chill,
    fontTone: "clean",
    variants: ["soft", "classic", "modern"],
  },
  {
    family: "Marketing",
    label: "Aaditech Solution",
    subLabels: ["Digital Solutions", "Business Growth", "Trusted Support"],
    palette: {
      bg: "#0b1720",
      bgAlt: "#123449",
      accent: "#f4a340",
      accentSoft: "#fff0d5",
      accentGlow: "rgba(244, 163, 64, 0.32)",
      headlineColor: "#ffffff",
      captionHighlight: "#f4a340",
    },
    musicMood: MusicMoodEnum.hopeful,
    fontTone: "clean",
    variants: ["modern", "soft", "classic"],
  },
  {
    family: "Motivation",
    label: "Inspire Daily",
    subLabels: ["Success", "Mindset", "Growth"],
    palette: {
      bg: "#120d04",
      bgAlt: "#1e1706",
      accent: "#ffb347",
      accentSoft: "#ffeed2",
      accentGlow: "rgba(255, 179, 71, 0.4)",
      headlineColor: "#ffffff",
      captionHighlight: "#ffb347",
    },
    musicMood: MusicMoodEnum.hopeful,
    fontTone: "condensed",
    variants: ["bold", "dark", "classic"],
  },
  {
    family: "Politics",
    label: "The Briefing",
    subLabels: ["Policy", "Politics", "World"],
    palette: {
      bg: "#0a0a12",
      bgAlt: "#12121e",
      accent: "#8b7ff7",
      accentSoft: "#e9e6ff",
      accentGlow: "rgba(139, 127, 247, 0.4)",
      headlineColor: "#ffffff",
      captionHighlight: "#8b7ff7",
    },
    musicMood: MusicMoodEnum.contemplative,
    fontTone: "condensed",
    variants: ["classic", "dark", "modern"],
  },
  {
    family: "Education",
    label: "Learn Fast",
    subLabels: ["Explained", "Knowledge"],
    palette: {
      bg: "#0a0f1c",
      bgAlt: "#101a30",
      accent: "#5ab8ff",
      accentSoft: "#e2f1ff",
      accentGlow: "rgba(90, 184, 255, 0.35)",
      headlineColor: "#ffffff",
      captionHighlight: "#5ab8ff",
    },
    musicMood: MusicMoodEnum.chill,
    fontTone: "clean",
    variants: ["modern", "classic", "soft"],
  },
];

const FAMILY_KEYWORDS: Array<{ family: string; keywords: string[] }> = [
  {
    family: "News",
    keywords: ["news", "world", "general", "breaking", "global", "update", "headline", "live"],
  },
  {
    family: "Sports",
    keywords: ["sports", "cricket", "nba", "football", "match", "league", "tournament", "fitness", "olympic", "tennis", "golf", "hockey", "racing"],
  },
  {
    family: "Finance",
    keywords: ["business", "finance", "market", "stock", "trade", "economy", "tariff", "earnings", "blockchain", "crypto", "banking", "money"],
  },
  {
    family: "Tech",
    keywords: ["technology", "tech", "science", "ai", "chip", "semiconductor", "software", "startup", "gadget", "nvidia", "data", "internet", "app"],
  },
  {
    family: "Entertainment",
    keywords: ["entertainment", "music", "movie", "celebrity", "pop", "fashion", "beauty", "gaming", "funny", "culture", "lifestyle"],
  },
  {
    family: "Science",
    keywords: ["science", "space", "research", "lab", "climate", "nasa", "universe"],
  },
  {
    family: "Health",
    keywords: ["health", "fitness", "medical", "nutrition", "wellness", "disease", "mental"],
  },
  {
    family: "Marketing",
    keywords: ["marketing", "brand", "business profile", "company", "services", "solution", "growth", "contact", "aaditech"],
  },
  {
    family: "Motivation",
    keywords: ["motivation", "success", "mindset", "inspirational", "self-help"],
  },
  {
    family: "Politics",
    keywords: ["politics", "policy", "political", "government", "election", "law", "legal", "senate"],
  },
  {
    family: "Education",
    keywords: ["education", "learn", "explainer", "explain", "training", "study"],
  },
];

function normalize(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchesKeywords(haystack: string, keywords: string[]): boolean {
  return keywords.some((kw) => haystack.includes(kw));
}

/** Deterministic stable hash of a string (used for variant picking). */
export function stableHash(input: string): number {
  let hash = 0;
  const text = String(input || "");
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function resolveTheme(category: string, subcategories: string[] = []): VideoTheme {
  const explicit = THEMES.find((t) => t.family.toLowerCase() === normalize(category));
  if (explicit) {
    return explicit;
  }

  const haystack = `${normalize(category)} ${subcategories.map(normalize).join(" ")}`;
  const matched = THEMES.find((theme) => {
    const group = FAMILY_KEYWORDS.find((g) => g.family === theme.family);
    return group ? matchesKeywords(haystack, group.keywords) : false;
  });
  if (matched) {
    return matched;
  }

  const profile = resolveCategoryPipeline(category);
  const accent = profile.category === "Food" ? "#f97316" : profile.category === "Travel" ? "#2dd4bf" : profile.category === "Gaming" ? "#a78bfa" : profile.category === "Beauty" ? "#f472b6" : profile.category === "Parenting" ? "#60a5fa" : "#94a3b8";
  const bg = profile.category === "Food" ? "#20120a" : profile.category === "Travel" ? "#071d22" : profile.category === "Gaming" ? "#120d24" : profile.category === "Beauty" ? "#240f1d" : profile.category === "Parenting" ? "#0b1728" : "#111827";
  return {
    family: profile.category,
    label: profile.category,
    subLabels: [],
    palette: {
      bg,
      bgAlt: "#1f2937",
      accent,
      accentSoft: "#f8fafc",
      accentGlow: `${accent}55`,
      headlineColor: "#ffffff",
      captionHighlight: accent,
    },
    musicMood: profile.musicMood,
    fontTone: profile.category === "Beauty" || profile.category === "Entertainment" ? "rounded" : "clean",
    variants: ["modern", "soft", "classic"],
  };
}

/**
 * Deterministically pick a template variant for this video so same-genre
 * videos don't all share an identical look, while staying stable per script.
 */
export function pickTemplateVariant(theme: VideoTheme, seed: string, override?: string): TemplateVariantName {
  if (override && (theme.variants as string[]).includes(override)) {
    return override as TemplateVariantName;
  }
  const index = stableHash(seed) % theme.variants.length;
  return theme.variants[index];
}