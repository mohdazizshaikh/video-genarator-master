import z from "zod";

export enum MusicMoodEnum {
  sad = "sad",
  melancholic = "melancholic",
  happy = "happy",
  euphoric = "euphoric/high",
  excited = "excited",
  chill = "chill",
  uneasy = "uneasy",
  angry = "angry",
  dark = "dark",
  hopeful = "hopeful",
  contemplative = "contemplative",
  funny = "funny/quirky",
}

export enum CaptionPositionEnum {
  top = "top",
  center = "center",
  bottom = "bottom",
}

export enum LanguageEnum {
  en = "en",
  hi = "hi",
  fr = "fr",
  es = "es",
  auto = "auto",
}

export type Scene = {
  captions: Caption[];
  headline?: string;
  subcategory?: string;
  video?: string;
  imageUrl?: string;
  visualPrompt?: string;
  audio: {
    url: string;
    duration: number;
  };
};

export const sceneInput = z.object({
  text: z.string()
    .min(10, "Scene text must be at least 10 characters")
    .max(500, "Scene text must not exceed 500 characters")
    .describe("Text to be spoken in the video - should be conversational and engaging"),
  searchTerms: z
    .array(z.string().min(1).max(50))
    .min(2, "At least 2 search terms required per scene")
    .max(10, "Maximum 10 search terms per scene")
    .describe(
      "Search terms for video content. Provide 2-5 relevant keywords that match the scene's context and visual theme.",
    ),
  subcategory: z.string()
    .min(2, "Subcategory must be at least 2 characters")
    .max(60, "Subcategory must not exceed 60 characters")
    .optional()
    .describe("Optional finer-grained classification under the selected category"),
  keywords: z
    .array(z.string().min(1).max(50))
    .max(12, "Maximum 12 keywords allowed per scene")
    .optional()
    .describe("Optional keyword metadata used for media selection, prompt enrichment, and SEO"),
  headline: z.string()
    .min(5, "Headline must be at least 5 characters")
    .max(100, "Headline must not exceed 100 characters")
    .optional()
    .describe("Compelling headline for the scene that captures attention"),
  visualPrompt: z.string()
    .min(10, "Visual prompt must be at least 10 characters")
    .max(200, "Visual prompt must not exceed 200 characters")
    .optional()
    .describe("Detailed description for AI image generation - include style, mood, and specific visual elements"),
  language: z
    .nativeEnum(LanguageEnum)
    .default(LanguageEnum.en)
    .describe("Narration/audio language for the scene"),
  sourceLanguage: z
    .nativeEnum(LanguageEnum)
    .optional()
    .describe("Original script language before optional translation to narration language"),
  narrationText: z
    .string()
    .min(1)
    .max(1000)
    .optional()
    .describe("Precomputed narration text in the target audio language"),
  captionText: z
    .string()
    .min(1)
    .max(1000)
    .optional()
    .describe("Precomputed caption text in the target caption language"),
  overlayText: z
    .string()
    .min(1)
    .max(200)
    .optional()
    .describe("Precomputed editorial overlay text in the target overlay language"),
  translationTarget: z
    .nativeEnum(LanguageEnum)
    .optional()
    .describe("Legacy translation target field retained for compatibility"),
  cues: z
    .array(
      z.object({
        startMs: z.number().min(0),
        endMs: z.number().min(0),
        label: z.string().min(1).max(120).optional(),
        brollSearchTerms: z.array(z.string().min(1).max(50)).optional(),
      }),
    )
    .optional()
    .describe("Optional scene timing cues for chaptering and B-roll hints"),
});
export type SceneInput = z.infer<typeof sceneInput>;

export enum VoiceEnum {
  af_heart = "af_heart",
  af_alloy = "af_alloy",
  af_aoede = "af_aoede",
  af_bella = "af_bella",
  af_jessica = "af_jessica",
  af_kore = "af_kore",
  af_nicole = "af_nicole",
  af_nova = "af_nova",
  af_river = "af_river",
  af_sarah = "af_sarah",
  af_sky = "af_sky",
  am_adam = "am_adam",
  am_echo = "am_echo",
  am_eric = "am_eric",
  am_fenrir = "am_fenrir",
  am_liam = "am_liam",
  am_michael = "am_michael",
  am_onyx = "am_onyx",
  am_puck = "am_puck",
  am_santa = "am_santa",
  bf_emma = "bf_emma",
  bf_isabella = "bf_isabella",
  bm_george = "bm_george",
  bm_lewis = "bm_lewis",
  bf_alice = "bf_alice",
  bf_lily = "bf_lily",
  bm_daniel = "bm_daniel",
  bm_fable = "bm_fable",
  en_IN_prabhat = "en_IN_prabhat",
  en_IN_neeerja = "en_IN_neeerja",
  hi_IN_madhur = "hi_IN_madhur",
  hi_IN_swara = "hi_IN_swara",
}

export enum OrientationEnum {
  landscape = "landscape",
  portrait = "portrait",
}

export enum TextModeEnum {
  overlay = "overlay",
  captions = "captions",
  hybrid = "hybrid",
}

export enum VideoTypeEnum {
  short = "short",
  long = "long",
}

export type VideoType = `${VideoTypeEnum}`;

export enum MusicVolumeEnum {
  muted = "muted",
  low = "low",
  medium = "medium",
  high = "high",
}

export const renderConfig = z.object({
  paddingBack: z
    .number()
    .min(0, "Padding must be non-negative")
    .max(10000, "Padding must not exceed 10 seconds")
    .default(1500)
    .describe(
      "Duration in milliseconds to continue video after speech ends. Recommended: 1500ms.",
    ),
  music: z
    .nativeEnum(MusicMoodEnum)
    .default(MusicMoodEnum.chill)
    .describe("Music mood that matches the video's emotional tone"),
  captionPosition: z
    .nativeEnum(CaptionPositionEnum)
    .default(CaptionPositionEnum.center)
    .describe("Caption placement for optimal readability"),
  captionBackgroundColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$|^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$|^rgba\(\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*[0-1]?\.?\d*\)$|^[a-zA-Z]+$/, "Invalid color format - use hex (#FFF), rgb(), rgba(), or color name")
    .default("#0066CC")
    .describe("Caption background color for better text visibility"),
  voice: z
    .nativeEnum(VoiceEnum)
    .default(VoiceEnum.af_heart)
    .describe("Voice actor for natural speech synthesis"),
  scriptLanguage: z
    .nativeEnum(LanguageEnum)
    .default(LanguageEnum.en)
    .describe("Language used for the written script before audio/subtitle translation"),
  audioLanguage: z
    .nativeEnum(LanguageEnum)
    .default(LanguageEnum.en)
    .describe("Target language used for narration audio generation"),
  overlayLanguage: z
    .nativeEnum(LanguageEnum)
    .default(LanguageEnum.en)
    .describe("Target language used for headline, ticker, and editorial overlay text"),
  captionLanguage: z
    .nativeEnum(LanguageEnum)
    .default(LanguageEnum.en)
    .describe("Target language used for on-screen caption text"),
  textMode: z
    .nativeEnum(TextModeEnum)
    .default(TextModeEnum.hybrid)
    .describe("Determines whether the video shows overlays, captions, or both"),
  subtitleLanguage: z
    .nativeEnum(LanguageEnum)
    .default(LanguageEnum.en)
    .describe("Legacy compatibility alias for caption language"),
  subtitleLineCount: z
    .number()
    .int()
    .min(1)
    .max(3)
    .default(2)
    .describe("Maximum subtitle lines shown at once"),
  subtitleFontScale: z
    .number()
    .min(0.8)
    .max(1.4)
    .default(1)
    .describe("Scale factor for subtitle size in the rendered video"),
  orientation: z
    .nativeEnum(OrientationEnum)
    .default(OrientationEnum.portrait)
    .describe("Video aspect ratio - portrait for mobile, landscape for desktop"),
  musicVolume: z
    .nativeEnum(MusicVolumeEnum)
    .default(MusicVolumeEnum.medium)
    .describe("Background music volume level"),
  useAiImages: z
    .boolean()
    .default(false)
    .describe("Use AI-generated images instead of stock videos for custom visuals"),
  videoType: z
    .nativeEnum(VideoTypeEnum)
    .default(VideoTypeEnum.short)
    .describe("Render mode: short or long"),
  durationLimit: z
    .number()
    .min(15)
    .max(3600)
    .default(180)
    .describe("Target maximum output duration in seconds before auto-splitting"),
  category: z
    .string()
    .max(60)
    .default("News")
    .describe("Content category/genre - drives theme, template variant, and music selection"),
  templateVariant: z
    .string()
    .max(40)
    .optional()
    .describe("Optional template variant override (auto-picked by genre when unset)"),
  contentTemplate: z
    .string()
    .max(40)
    .optional()
    .describe("Optional content-structure template override (breaking, listicle, quiz, beforeafter, brainrot, explainer, story)"),
});
export type RenderConfig = z.infer<typeof renderConfig>;

export type Voices = `${VoiceEnum}`;

export type Video = {
  id: string;
  url: string;
  width: number;
  height: number;
};
export type Caption = {
  text: string;
  startMs: number;
  endMs: number;
};

export type CaptionLine = {
  texts: Caption[];
};
export type CaptionPage = {
  startMs: number;
  endMs: number;
  lines: CaptionLine[];
};

export const createShortInput = z.object({
  scenes: z.array(sceneInput)
    .min(1, "At least 1 scene required")
    .max(32, "Maximum 32 scenes allowed for current video length constraints")
    .describe("Video scenes in sequential order - each scene should flow naturally to the next"),
  config: renderConfig.describe("Video rendering configuration - affects style, audio, and presentation"),
  contentCategory: z
    .string()
    .max(60)
    .optional()
    .describe("Legacy alias for the category selection from the UI creator (mapped onto config.category)"),
  category: z
    .string()
    .max(60)
    .optional()
    .describe("Category/genre selection from the UI creator (primary source)"),
  platformPsychology: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Optional platform psychology output stored alongside the video"),
}).refine((data) => {
  // Business logic validation: ensure total text length is reasonable for video duration
  const totalTextLength = data.scenes.reduce((sum, scene) => sum + scene.text.length, 0);
  const estimatedDuration = totalTextLength * 0.05; // Rough estimate: 50ms per character for speech

  const effectiveLimit = data.config.videoType === VideoTypeEnum.long
    ? Math.max(data.config.durationLimit, 300)
    : Math.min(data.config.durationLimit, 180);

  if (estimatedDuration > effectiveLimit) {
    return false;
  }

  return true;
}, {
  message: "Total video content is too long for the selected video mode and duration limit. Reduce scene count, shorten scene text, or raise the duration target.",
});
export type CreateShortInput = z.infer<typeof createShortInput>;

export type VideoStatus = "processing" | "ready" | "failed";

export type Music = {
  file: string;
  start: number;
  end: number;
  mood: string;
};
export type MusicForVideo = Music & {
  url: string;
};

export type MusicTag = `${MusicMoodEnum}`;

export type kokoroModelPrecision = "fp32" | "fp16" | "q8" | "q4" | "q4f16";

export const videoIdSchema = z.string()
  .regex(/^[a-zA-Z0-9_-]{8,}$/, "Video ID must be at least 8 characters with only letters, numbers, hyphens, and underscores")
  .describe("Unique identifier for video processing jobs");

export const statusRequestSchema = z.object({
  videoId: videoIdSchema,
});

export type StatusRequest = z.infer<typeof statusRequestSchema>;

// ─── Phase 4: Queue Job Status Types ────────────────────────────────────────
export type RenderJobStatus =
  | "scheduled"
  | "queued"
  | "processing"
  | "ready"
  | "rendered"
  | "failed"
  | "skipped";

export type PublishJobStatus =
  | "scheduled"
  | "queued"
  | "publishing"
  | "published"
  | "failed"
  | "skipped";

// ─── Phase 5: Platform Publisher Types ──────────────────────────────────────
export type PlatformType = "youtube" | "telegram" | "instagram" | "facebook" | "linkedin" | "x";

// ─── Phase 4/5: Render Job DB Record ─────────────────────────────────────────
export interface RenderJobRecord {
  /** Auth-derived owner. Legacy records without this field are not tenant-visible. */
  tenantId?: string;
  id: string;
  scriptPlanId: string;
  videoType: VideoType;
  language: string;
  subtitleLanguage: string;
  orientation: OrientationEnum;
  category: string;
  status: RenderJobStatus;
  attemptCount: number;
  outputPath: string | null;
  namingKey: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Phase 5: Publish Job DB Record ──────────────────────────────────────────
export interface PublishJobRecord {
  /** Auth-derived owner. Legacy records without this field are not tenant-visible. */
  tenantId?: string;
  id: string;
  renderOutputPath: string;
  platform: PlatformType;
  channelId: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  language: string;
  thumbnailPath?: string;
  scheduleAt: string | null;
  status: PublishJobStatus;
  attemptCount: number;
  externalId: string | null;
  publishedUrl: string | null;
  error: string | null;
  accountId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublishAttemptRecord {
  id: string;
  publishJobId: string;
  attemptNumber: number;
  status: "success" | "failed";
  responseCode: number | null;
  responseBody: string | null;
  attemptedAt: string;
}

export interface VideoMetadataRecord {
  /** Auth-derived owner. Legacy records without this field are not tenant-visible. */
  tenantId?: string;
  videoId: string;
  signature?: string | null;
  topic: string;
  summary: string;
  category: string | null;
  subcategory: string | null;
  keywords: string[];
  headlines: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Phase 5: Channel Config ──────────────────────────────────────────────────
export interface ChannelConfig {
  id: string;
  platform: PlatformType;
  channelName: string;
  credentialsKey: string;
  categories: string[];
  languageProfiles: LanguageProfile[];
  active: boolean;
}

export interface LanguageProfile {
  audio: string;
  subtitle: string;
  voice: string;
  whisperModel: string;
}

// ─── Phase 6: Category Rules ──────────────────────────────────────────────────
export interface CategoryRule {
  id: string;
  category: string;
  channels: string[];
  languageProfiles: LanguageProfile[];
  videoTypes: VideoType[];
  maxDurationShortSec: number;
  maxDurationLongSec: number;
  active: boolean;
}

export type whisperModels = "tiny" | "tiny.en" | "base" | "base.en" | "small" | "small.en" | "medium" | "medium.en" | "large-v1" | "large-v2" | "large-v3" | "large-v3-turbo";
