/**
 * ContentTemplateEngine – content-driven layout/structure templates.
 *
 * Pairs with ThemeEngine (which picks the "look": palette, fonts, music).
 * This engine picks the "layout": how scenes are structured and which chrome
 * (BREAKING flash, listicle step chip, quiz countdown, before/after split
 * label) is layered on top of the generic overlay + captions.
 *
 * Detection is deterministic and keyword-driven (no LLM at render time):
 *   - explicit `config.contentTemplate` override always wins,
 *   - otherwise scene text/headlines/subcategories are scanned for each
 *     template's signals (breaking, listicle numbering "1.", quiz keywords,
 *     before/after pairs, subcategory keywords),
 *   - otherwise the genre family decides via preference order,
 *   - finally it falls back to a generic story template.
 *
 * Every template is declarative config, so new packs can be added without
 * touching the render components.
 */

import { resolveCategoryPipeline } from "./CategoryPipelineProfiles";

export type ContentStructure =
  | "breaking"
  | "listicle"
  | "quiz"
  | "beforeafter"
  | "brainrot"
  | "explainer"
  | "marketing"
  | "story";

export type TemplateChromeKind = "none" | "step-chip" | "countdown" | "split-label";

/** Determines where chrome sits so it never collides with captions. */
export type ChromeAnchor = "top-left" | "top-right" | "top-center" | "bottom-left";

export interface ContentTemplate {
  id: string;
  label: string;
  structure: ContentStructure;
  chromeKind: TemplateChromeKind;
  chromeAnchor: ChromeAnchor;
  chromeLabel: string;
  /** Render a full-frame intro flash on scene 0 (e.g. "BREAKING"). */
  introFlash: boolean;
  introFlashText?: string;
  /** Role guide consumed by pipeline/renders (informational here). */
  roleGuide: string[];
  /** Keyword signals used for content auto-detection. */
  signals: string[];
}

const TEMPLATES: ContentTemplate[] = [
  {
    id: "breaking",
    label: "Breaking Desk",
    structure: "breaking",
    chromeKind: "none",
    chromeAnchor: "top-left",
    chromeLabel: "LIVE",
    introFlash: true,
    introFlashText: "BREAKING",
    roleGuide: ["hook", "context", "impact", "cta"],
    signals: [
      "breaking",
      "breaking news",
      "just in",
      "latest update",
      "urgent",
      "live update",
      "developing",
      "alert",
      "emergency",
      "confirmed",
    ],
  },
  {
    id: "listicle",
    label: "Countdown List",
    structure: "listicle",
    chromeKind: "step-chip",
    chromeAnchor: "top-right",
    chromeLabel: "TOP",
    introFlash: true,
    introFlashText: "TOP",
    roleGuide: ["hook", "point", "point", "point", "payoff"],
    signals: [
      "top 5",
      "top 10",
      "top 3",
      "five ways",
      "10 ways",
      "3 reasons",
      "5 signs",
      "7 tips",
      "10 tips",
      "countdown",
      "ranked",
      "best of",
      "here are",
      "number one",
      "number 1",
    ],
  },
  {
    id: "quiz",
    label: "Quiz Mode",
    structure: "quiz",
    chromeKind: "countdown",
    chromeAnchor: "top-center",
    chromeLabel: "QUIZ",
    introFlash: true,
    introFlashText: "QUIZ",
    roleGuide: ["question", "think", "reveal", "explain"],
    signals: [
      "quiz",
      "guess",
      "can you guess",
      "test your",
      "true or false",
      "do you know",
      "answer",
      "reveal",
      "what is the correct",
    ],
  },
  {
    id: "beforeafter",
    label: "Before / After",
    structure: "beforeafter",
    chromeKind: "split-label",
    chromeAnchor: "bottom-left",
    chromeLabel: "BEFORE / AFTER",
    introFlash: false,
    roleGuide: ["before", "after", "comparison", "transformation"],
    signals: [
      "before",
      "after",
      "before and after",
      "transformation",
      "comparison",
      "vs",
      "versus",
      "old vs new",
      "then vs now",
      "what changed",
    ],
  },
  {
    id: "brainrot",
    label: "Addictive Loop",
    structure: "brainrot",
    chromeKind: "none",
    chromeAnchor: "top-left",
    chromeLabel: "LOOP",
    introFlash: true,
    introFlashText: "GO",
    roleGuide: ["hook", "repeat", "repeat", "reward"],
    signals: [
      "brainrot",
      "satisfying",
      "oddly satisfying",
      "addictive",
      "remix",
      "meme",
      "loop",
    ],
  },
  {
    id: "explainer",
    label: "Explain It",
    structure: "explainer",
    chromeKind: "none",
    chromeAnchor: "top-left",
    chromeLabel: "EXPLAINED",
    introFlash: false,
    roleGuide: ["hook", "what", "why", "how", "takeaway"],
    signals: [
      "how it works",
      "why is",
      "why does",
      "how does",
      "explain",
      "explained",
      "science of",
      "how to",
      "tutorial",
      "guide",
      "deep dive",
    ],
  },
  {
    id: "marketing",
    label: "Brand Showcase",
    structure: "marketing",
    chromeKind: "none",
    chromeAnchor: "top-left",
    chromeLabel: "BRAND",
    introFlash: false,
    roleGuide: ["brand hook", "proof", "service/value", "trust", "cta"],
    signals: [
      "marketing",
      "brand showcase",
      "service highlight",
      "business profile",
      "company profile",
      "product showcase",
      "why choose us",
      "contact us",
      "visit our website",
    ],
  },
  {
    id: "story",
    label: "Story Flow",
    structure: "story",
    chromeKind: "none",
    chromeAnchor: "top-left",
    chromeLabel: "STORY",
    introFlash: false,
    roleGuide: ["hook", "setup", "turn", "payoff", "cta"],
    signals: [],
  },
];

const normalize = (value: string | null | undefined): string =>
  String(value || "").toLowerCase().replace(/[^a-z0-9\s.-]+/g, " ").replace(/\s+/g, " ").trim();

/** Detect a numbered list pattern ("1.", "2)", "Number 3:") in text. */
const looksNumbered = (text: string): boolean =>
  /(^|\s)\d{1,2}[.)]\s/.test(text) || /\bnumber\s+\d{1,2}\b/.test(text);

/** Minimal shape used so both Scene and SceneInput satisfy the input type. */
export interface TemplateScene {
  text?: string | null;
  headline?: string | null;
  subcategory?: string | null;
}

const buildHaystack = (scenes: TemplateScene[]): string => {
  const parts: string[] = [];
  for (const scene of scenes) {
    const text = normalize(scene.text);
    const headline = normalize(scene.headline);
    const subcategory = normalize(scene.subcategory);
    if (text) parts.push(text);
    if (headline) parts.push(headline);
    if (subcategory) parts.push(subcategory);
    if (looksNumbered(text)) parts.push("__numbered__");
  }
  return parts.join(" ");
};

const familyPreferences: Record<string, string[]> = {
  News: ["breaking", "explainer", "story"],
  Sports: ["listicle", "story", "beforeafter"],
  Finance: ["explainer", "listicle", "breaking", "beforeafter"],
  Tech: ["explainer", "listicle", "story"],
  Entertainment: ["brainrot", "quiz", "listicle", "story"],
  Science: ["explainer", "story", "listicle"],
  Health: ["explainer", "listicle", "beforeafter"],
  Motivation: ["story", "brainrot", "listicle"],
  Politics: ["breaking", "explainer", "story"],
  Education: ["explainer", "quiz", "listicle"],
  Marketing: ["marketing", "story", "explainer"],
  Business: ["marketing", "explainer", "story"],
};

const templateById = (id: string): ContentTemplate | undefined =>
  TEMPLATES.find((template) => template.id === id);

export function listContentTemplates(): ContentTemplate[] {
  return TEMPLATES.map((template) => ({ ...template }));
}

export function resolveContentTemplate(options: {
  category: string;
  scenes: TemplateScene[];
  family?: string;
  override?: string;
}): ContentTemplate {
  const { category, scenes, family, override } = options;

  if (override) {
    const forced = templateById(override);
    if (forced) return forced;
  }

  const profileTemplate = templateById(resolveCategoryPipeline(family || category).template);
  const haystack = buildHaystack(scenes);

  // Order matters: more specific structures scored before generic ones.
  const signalOrder: ContentStructure[] = [
    "breaking",
    "quiz",
    "beforeafter",
    "brainrot",
    "marketing",
    "listicle",
    "explainer",
  ];

  for (const structure of signalOrder) {
    const template = templateById(structure);
    if (!template) continue;
    if (template.signals.some((signal) => signal && haystack.includes(signal))) {
      return template;
    }
  }

  if (haystack.includes("__numbered__")) {
    return templateById("listicle") || TEMPLATES[0];
  }

  if (profileTemplate && (family || category)) {
    return profileTemplate;
  }

  const preferenceKey = family || category || "News";
  const preferences = familyPreferences[preferenceKey];
  if (preferences && preferences.length) {
    const matched = preferences.map(templateById).find((template): template is ContentTemplate => Boolean(template));
    if (matched) return matched;
  }

  return templateById("story") || TEMPLATES[TEMPLATES.length - 1];
}

export function pickTemplateChrome(
  template: ContentTemplate,
  sceneIndex: number,
  totalScenes: number,
): {
  showChip: boolean;
  chipText: string;
  introFlashText: string | null;
} {
  const step = template.chromeKind === "step-chip";
  const split = template.chromeKind === "split-label";

  return {
    showChip: step || split,
    chipText: step ? `${template.chromeLabel} ${Math.min(sceneIndex + 1, totalScenes)}/${totalScenes}` : template.chromeLabel,
    introFlashText:
      template.introFlash && sceneIndex === 0 ? template.introFlashText || template.label : null,
  };
}

export { templateById, TEMPLATES };