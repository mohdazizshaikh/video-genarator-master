/* eslint-disable @typescript-eslint/no-explicit-any */

import { OrientationEnum } from "./../types/shorts";
/* eslint-disable @remotion/deterministic-randomness */
import fs from "fs-extra";
import cuid from "cuid";
import path from "path";
import https from "https";
import http from "http";
import crypto from "crypto";

import { Kokoro } from "./libraries/Kokoro";
import { Remotion } from "./libraries/Remotion";
import { Whisper } from "./libraries/Whisper";
import { FFMpeg } from "./libraries/FFmpeg";
import { PexelsAPI } from "./libraries/Pexels";
import { TtsAdapter } from "./libraries/TtsAdapter";
import { SubtitleBuilder } from "./libraries/SubtitleBuilder";
import { Config } from "../config";
import { logger } from "../logger";
import { MusicManager } from "./music";
import { VideoMetadataStore } from "../db/VideoMetadataStore";
import { AiLlmGenerator } from "../script-generator/AiLlmGenerator";
import { resolveTheme } from "../components/videos/ThemeEngine";
import type {
  SceneInput,
  RenderConfig,
  Scene,
  Caption,
  VideoStatus,
  MusicTag,
  MusicForVideo,
} from "../types/shorts";
import { LanguageEnum, TextModeEnum, MusicMoodEnum } from "../types/shorts";

const ignoredCapitalizedSearchPhrases = new Set([
  "this",
  "that",
  "these",
  "those",
  "here",
  "there",
  "breaking",
  "latest",
]);

export class ShortCreator {
  private queue: {
    sceneInput: SceneInput[];
    config: RenderConfig;
    id: string;
    videoType: "short" | "long";
    subtitleLanguage?: string;
  }[] = [];
  private ttsAdapter: TtsAdapter;
  private videoMetadataStore: VideoMetadataStore;
  private translator: AiLlmGenerator;

  constructor(
    private config: Config,
    private remotion: Remotion,
    private kokoro: Kokoro,
    private whisper: Whisper,
    private ffmpeg: FFMpeg,
    private pexelsApi: PexelsAPI,
    private musicManager: MusicManager,
  ) {
    this.ttsAdapter = new TtsAdapter(kokoro, config.aiLlmUrl, config.aiLlmModel);
    this.videoMetadataStore = new VideoMetadataStore(config.dataDirPath);
    this.translator = new AiLlmGenerator(config.aiLlmUrl, config.aiLlmModel);
  }

  private normalizeSearchPhrase(value?: string): string {
    return (value || "")
      .replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private normalizeSignatureValue(value?: string | null): string {
    return (value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  private extractCapitalizedPhrases(text?: string): string[] {
    const source = text || "";
    const matches = source.match(/\b(?:[A-Z]{2,}|[A-Z][a-z]+)(?:\s+(?:[A-Z]{2,}|[A-Z][a-z]+)){0,3}\b/g) || [];
    return matches
      .map((match) => this.normalizeSearchPhrase(match))
      .filter((match) => match.length >= 4)
      .filter((match) => !ignoredCapitalizedSearchPhrases.has(match.toLowerCase()));
  }

  private inferVisualAnchors(scene: SceneInput, terms: string[]): string[] {
    const haystack = [
      scene.subcategory,
      scene.headline,
      scene.text,
      ...(scene.searchTerms || []),
      ...(scene.keywords || []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const anchors = new Set<string>();
    const addAnchors = (...values: string[]) => values.forEach((value) => anchors.add(value));

    if (/(cricket|ipl|pcb|icc|batsman|bowler|wicket|odi|t20)/.test(haystack)) {
      addAnchors("cricket stadium", "cricket player", "cricket fans");
    }
    if (/(nba|basketball|playoff|hoops)/.test(haystack)) {
      addAnchors("basketball court", "basketball player", "arena crowd");
    }
    if (/(football|soccer|premier league|goal)/.test(haystack)) {
      addAnchors("football stadium", "soccer player", "match crowd");
    }
    if (/(market|stocks|earnings|tariff|economy|business|trade|investor)/.test(haystack)) {
      addAnchors("stock market", "trading screen", "business district");
    }
    if (/(election|president|prime minister|parliament|war|conflict|diplomacy|summit|government|world)/.test(haystack)) {
      addAnchors("press conference", "parliament building", "world leaders");
    }
    if (/(science|research|lab|laboratory|nasa|space|rocket|climate|satellite)/.test(haystack)) {
      addAnchors("science laboratory", "space launch", "scientist research");
    }
    if (/(ai|technology|tech|startup|software|robot|chip|semiconductor)/.test(haystack)) {
      addAnchors("technology lab", "computer server", "circuit board");
    }

    return Array.from(anchors).filter((anchor) => !terms.includes(anchor));
  }

  private buildMediaSearchTerms(scene: SceneInput): string[] {
    const keywordTerms = [...(scene.keywords || [])]
      .map((term) => this.normalizeSearchPhrase(term))
      .filter(Boolean);
    const baseTerms = [
      ...(scene.cues?.flatMap((cue) => cue.brollSearchTerms || []) || []),
      ...(scene.subcategory ? [scene.subcategory] : []),
      ...keywordTerms,
      ...(scene.searchTerms || []),
      ...(scene.headline ? [scene.headline] : []),
      ...this.extractCapitalizedPhrases(scene.headline),
      ...this.extractCapitalizedPhrases(scene.text),
    ]
      .map((term) => this.normalizeSearchPhrase(term))
      .filter(Boolean);

    const anchorTerms = this.inferVisualAnchors(scene, baseTerms);
    const uniqueTerms = Array.from(new Set([...baseTerms, ...anchorTerms]));

    const specificityScore = (term: string): number => {
      const normalized = term.trim();
      const wordCount = normalized.split(/\s+/).filter(Boolean).length;
      const keywordBoost = keywordTerms.includes(normalized) ? 250 : 0;
      const subcategoryBoost = scene.subcategory && normalized === this.normalizeSearchPhrase(scene.subcategory) ? 180 : 0;
      const cueBoost = scene.cues?.some((cue) => (cue.brollSearchTerms || []).includes(normalized)) ? 220 : 0;
      return (wordCount * 100) + normalized.length + keywordBoost + subcategoryBoost + cueBoost;
    };

    return uniqueTerms
      .sort((a, b) => specificityScore(b) - specificityScore(a))
      .slice(0, 12);
  }

  private buildVideoSignature(
    sceneInput: SceneInput[],
    config: RenderConfig,
    videoType: "short" | "long",
    subtitleLanguage?: string,
  ): string {
    const normalizedScenes = sceneInput.map((scene) => ({
      text: this.normalizeSignatureValue(scene.text),
      searchTerms: [...(scene.searchTerms || [])].map((term) => this.normalizeSignatureValue(term)).sort(),
      keywords: [...(scene.keywords || [])].map((term) => this.normalizeSignatureValue(term)).sort(),
      subcategory: this.normalizeSignatureValue(scene.subcategory),
      headline: this.normalizeSignatureValue(scene.headline),
      visualPrompt: this.normalizeSignatureValue(scene.visualPrompt),
      sourceLanguage: scene.sourceLanguage || LanguageEnum.en,
      language: scene.language || LanguageEnum.en,
      translationTarget: this.normalizeSignatureValue(scene.translationTarget || null),
    }));

    const payload = {
      scenes: normalizedScenes,
      config,
      videoType,
      subtitleLanguage: subtitleLanguage || null,
    };

    return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  }

  private async translateCaptions(
    captions: Caption[],
    sourceLanguage: LanguageEnum,
    targetLanguage: LanguageEnum,
  ): Promise<Caption[]> {
    if (!captions.length || sourceLanguage === targetLanguage) {
      return captions;
    }

    const translated = await Promise.all(captions.map(async (caption) => {
      if (!caption.text.trim()) {
        return caption;
      }

      try {
        const text = await this.translator.translateText(caption.text, sourceLanguage, targetLanguage);
        return {
          ...caption,
          text: text.trim() || caption.text,
        };
      } catch (error) {
        logger.warn({ error, sourceLanguage, targetLanguage, caption: caption.text }, "Caption translation failed, keeping source text");
        return caption;
      }
    }));

    return translated;
  }

  private async translateOverlayText(
    text: string | undefined,
    sourceLanguage: LanguageEnum,
    targetLanguage: LanguageEnum,
    precomputedText?: string,
  ): Promise<string | undefined> {
    if (precomputedText?.trim()) {
      return precomputedText.trim();
    }

    if (!text?.trim()) {
      return text;
    }

    if (sourceLanguage === targetLanguage) {
      return text;
    }

    try {
      const translated = await this.translator.translateText(text, sourceLanguage, targetLanguage);
      return translated.trim() || text;
    } catch (error) {
      logger.warn(
        { error, sourceLanguage, targetLanguage, text },
        "Overlay translation failed, keeping source text",
      );
      return text;
    }
  }

  private buildSyntheticCaptions(
    text: string,
    durationSeconds: number,
  ): Caption[] {
    const words = text
      .trim()
      .split(/\s+/)
      .map((word) => word.trim())
      .filter(Boolean);

    if (words.length === 0) {
      return [];
    }

    const totalDurationMs = Math.max(1200, Math.round(durationSeconds * 1000));
    const wordDurationMs = Math.max(120, Math.floor(totalDurationMs / words.length));

    return words.map((word, index) => {
      const startMs = index * wordDurationMs;
      const endMs = index === words.length - 1
        ? totalDurationMs
        : Math.min(totalDurationMs, startMs + wordDurationMs);
      return {
        text: word,
        startMs,
        endMs,
      };
    });
  }

  private async resolveCaptionTrack(
    scene: SceneInput,
    sourceLanguage: LanguageEnum,
    targetLanguage: LanguageEnum,
    whisperCaptions: Caption[],
    audioDurationSeconds: number,
  ): Promise<Caption[]> {
    if (sourceLanguage === targetLanguage && whisperCaptions.length > 0) {
      return whisperCaptions;
    }

    try {
      const translatedFullText = scene.captionText?.trim()
        || (sourceLanguage === targetLanguage
          ? scene.text
          : await this.translator.translateText(scene.text, sourceLanguage, targetLanguage));
      const synthetic = this.buildSyntheticCaptions(translatedFullText, audioDurationSeconds);
      if (synthetic.length > 0) {
        return synthetic;
      }
    } catch (error) {
      logger.warn(
        { error, sourceLanguage, targetLanguage, sceneText: scene.text },
        "Caption translation fallback failed",
      );
    }

    if (whisperCaptions.length > 0) {
      return await this.translateCaptions(whisperCaptions, scene.language, targetLanguage);
    }

    return this.buildSyntheticCaptions(scene.text, audioDurationSeconds);
  }

  public status(id: string): VideoStatus {
    const videoPath = this.getVideoPath(id);
    if (this.queue.find((item) => item.id === id)) {
      return "processing";
    }
    if (fs.existsSync(videoPath)) {
      return "ready";
    }
    return "failed";
  }

  public addToQueue(
    sceneInput: SceneInput[],
    config: RenderConfig,
    videoType: "short" | "long" = "short",
    subtitleLanguage?: string,
    tenantId?: string,
  ): string {
    const signature = this.buildVideoSignature(sceneInput, config, videoType, subtitleLanguage);
    const queuedMatch = this.queue.find((item) =>
      this.buildVideoSignature(item.sceneInput, item.config, item.videoType, item.subtitleLanguage) === signature);
    if (queuedMatch) {
      return queuedMatch.id;
    }

    const existingRecord = this.videoMetadataStore.findBySignatureSync(signature, tenantId);
    if (existingRecord && fs.existsSync(this.getVideoPath(existingRecord.videoId))) {
      return existingRecord.videoId;
    }

    const id = cuid();
    this.videoMetadataStore.upsertFromScenesSync({
      tenantId,
      videoId: id,
      scenes: sceneInput,
      signature,
    });
    this.queue.push({
      sceneInput,
      config,
      id,
      videoType,
      subtitleLanguage,
    });
    if (this.queue.length === 1) {
      this.processQueue();
    }
    return id;
  }

  private async processQueue(): Promise<void> {
    // todo add a semaphore
    if (this.queue.length === 0) {
      return;
    }
    const { sceneInput, config, id, videoType, subtitleLanguage } = this.queue[0];
    console.log(`[ShortCreator] Starting to process video ${id} with ${sceneInput.length} scenes.`);
    logger.debug(
      { sceneInput, config, id },
      "Processing video item in the queue",
    );
    try {
      await this.createShort(id, sceneInput, config, videoType, subtitleLanguage);
      console.log(`[ShortCreator] Video ${id} created successfully.`);
    } catch (error: any) {
      console.error(`[ShortCreator] Error creating video ${id}: ${error.message}`);
      logger.error(error, "Error creating video");
    } finally {
      this.queue.shift();
      this.processQueue();
    }
  }

  private async createShort(
    videoId: string,
    inputScenes: SceneInput[],
    config: RenderConfig,
    videoType: "short" | "long" = "short",
    subtitleLanguage?: string,
  ): Promise<string> {
    if (!subtitleLanguage) {
      subtitleLanguage = inputScenes[0]?.language ?? LanguageEnum.en;
    }

    // Phase 3.3: split long scripts into chunks by duration limit.
    const chunkedScenes = this.splitScenesByDuration(
      inputScenes,
      config.durationLimit,
      videoType,
    );
    if (chunkedScenes.length > 1) {
      const partIds: string[] = [];
      for (let i = 0; i < chunkedScenes.length; i++) {
        const chunkId = `${videoId}_part${i + 1}`;
        partIds.push(chunkId);
        await this.createShort(
          chunkId,
          chunkedScenes[i],
          config,
          videoType,
          subtitleLanguage,
        );
      }
      // Render the parent video as the concatenation of all parts so the
      // requested videoId always resolves to a playable file.
      const partPaths = partIds.map((partId) => this.getVideoPath(partId));
      await this.ffmpeg.concatVideos(partPaths, this.getVideoPath(videoId));
      return videoId;
    }

    logger.debug(
      {
        inputScenes,
        config,
        videoType,
        subtitleLanguage,
      },
      "Creating short video",
    );
    const scenes: Scene[] = [];
    let totalDuration = 0;
    const excludeVideoIds = [];
    const tempFiles = [];

    const orientation: OrientationEnum =
      config.orientation || OrientationEnum.portrait;
    const textMode = config.textMode || TextModeEnum.hybrid;

    let index = 0;
    for (const scene of inputScenes) {
      const sceneNum = index + 1;
      console.log(`[ShortCreator] [Scene ${sceneNum}/${inputScenes.length}] Generating audio...`);
      const sourceScriptLanguage = scene.sourceLanguage || config.scriptLanguage || scene.language || LanguageEnum.en;
      const audio = await this.ttsAdapter.synthesize(scene, config.voice, sourceScriptLanguage);
      let { audioLength } = audio;
      const { audio: audioStream } = audio;

      const effectiveCaptionLanguage =
        config.captionLanguage ||
        (subtitleLanguage as LanguageEnum | undefined) ||
        scene.language;
      const effectiveOverlayLanguage =
        config.overlayLanguage ||
        sourceScriptLanguage;
      logger.debug(
        {
          sceneNum,
          sourceScriptLanguage,
          sceneLanguage: scene.language,
          configScriptLanguage: config.scriptLanguage,
          captionLanguage: config.captionLanguage,
          effectiveCaptionLanguage,
          overlayLanguage: config.overlayLanguage,
          effectiveOverlayLanguage,
          useAiImages: config.useAiImages || this.config.useAiImages,
        },
        "Resolved scene language and rendering settings",
      );

      const tempId = cuid();
      const tempWavFileName = `${tempId}.wav`;
      const tempMp3FileName = `${tempId}.mp3`;
      const tempVideoFileName = `${tempId}.mp4`;
      const tempWavPath = path.join(this.config.tempDirPath, tempWavFileName);
      const tempMp3Path = path.join(this.config.tempDirPath, tempMp3FileName);
      const tempVideoPath = path.join(
        this.config.tempDirPath,
        tempVideoFileName,
      );
      tempFiles.push(tempVideoPath);
      tempFiles.push(tempWavPath, tempMp3Path);

      await this.ffmpeg.saveNormalizedAudio(audioStream, tempWavPath);
      
      console.log(`[ShortCreator] [Scene ${sceneNum}/${inputScenes.length}] Transcribing with Whisper...`);
      let captions: Caption[] = [];
      try {
        captions = await this.whisper.CreateCaption(tempWavPath, scene.language);
      } catch (captionErr) {
        logger.warn(
          { captionErr, sceneNum, tempWavPath, language: scene.language },
          "Caption generation failed, continuing without captions",
        );
      }

      await this.ffmpeg.saveToMp3(audioStream, tempMp3Path);

      // Prefer the actual encoded file duration over model-reported duration.
      try {
        audioLength = await this.ffmpeg.getAudioDuration(tempMp3Path);
      } catch (error) {
        logger.warn(
          { error, tempMp3Path, fallbackAudioLength: audioLength },
          "Failed to probe MP3 duration, using synthesizer duration",
        );
      }

      const baseAudioLength = audioLength;
      const displayCaptions = await this.resolveCaptionTrack(
        scene,
        sourceScriptLanguage,
        effectiveCaptionLanguage,
        captions,
        baseAudioLength,
      );

      // Build and save subtitle files if subtitleLanguage specified (Phase 2.5)
      if (effectiveCaptionLanguage && displayCaptions.length > 0) {
        try {
          await SubtitleBuilder.buildAndSave(
            displayCaptions,
            { audioLanguage: scene.language, subtitleLanguage: effectiveCaptionLanguage },
            this.config.tempDirPath,
            `${tempId}_sub`,
          );
        } catch (subErr) {
          logger.warn({ subErr }, "Subtitle generation failed, continuing without subtitles");
        }
      }

      // add the paddingBack in seconds to the last scene after actual duration probe
      if (index + 1 === inputScenes.length && config.paddingBack) {
        audioLength += config.paddingBack / 1000;
      }

      const isAiImage = config.useAiImages || this.config.useAiImages;
      const mediaSearchTerms = this.buildMediaSearchTerms(scene);
      let mediaExt = ".mp4"; // Default generic extension, will be updated
      if (isAiImage) {
        mediaExt = ".jpg"; 
      }
      let tempMediaFileName = `${cuid()}${mediaExt}`;
      let tempMediaPath = path.join(this.config.tempDirPath, tempMediaFileName);
      tempFiles.push(tempMediaPath);

      let mediaUrl = "";
      if (isAiImage) {
        if (!this.config.pollinationsApiKey) {
          console.error(`[ShortCreator] [Scene ${sceneNum}/${inputScenes.length}] Pollinations API key is missing. Now required by Pollinations.ai. Falling back to Pexels video.`);
          logger.warn("POLLINATIONS_API_KEY is not set in environment. Falling back to stock video.");
        }
        
        // Use AI image from Pollinations.ai if key is available
        const keywordFocus = (scene.keywords || []).slice(0, 4).join(", ");
        const aiPrompt = (
          scene.visualPrompt
            ? `${scene.visualPrompt}${keywordFocus ? `. Focus on ${keywordFocus}.` : ""}`
            : [scene.headline, scene.subcategory, ...(scene.keywords || []), scene.text]
              .filter(Boolean)
              .join(", ")
        ).slice(0, 240);
        const apiKeyParam = this.config.pollinationsApiKey ? `&key=${this.config.pollinationsApiKey}` : '';
        const pollinationsUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(aiPrompt)}?width=${orientation === OrientationEnum.landscape ? 1920 : 1080}&height=${orientation === OrientationEnum.landscape ? 1080 : 1920}&nologo=true${apiKeyParam}`;
        
        console.log(`[ShortCreator] [Scene ${sceneNum}/${inputScenes.length}] Fetching AI image: ${pollinationsUrl.replace(/key=[^&]*/, 'key=***')}`);
        try {
          await this.downloadFile(pollinationsUrl, tempMediaPath);
          mediaUrl = `http://localhost:${this.config.port}/api/tmp/${tempMediaFileName}`;
        } catch (err: any) {
          console.error(`[ShortCreator] [Scene ${sceneNum}/${inputScenes.length}] AI image failed (${pollinationsUrl}): ${err.message}. Falling back to Pexels video.`);
          logger.error(err, `Error downloading AI image for scene ${sceneNum}`);
          // If AI image fails, we fallback to Pexels video
          const video = await this.pexelsApi.findVideo(
            mediaSearchTerms,
            audioLength,
            excludeVideoIds,
            orientation,
          );
          console.log(`[ShortCreator] [Scene ${sceneNum}/${inputScenes.length}] Fallback video found: ${video.url}`);
          // Delete the old .jpg temp path from the tempFiles array
          const oldIndex = tempFiles.indexOf(tempMediaPath);
          if (oldIndex > -1) {
             tempFiles.splice(oldIndex, 1);
          }
          mediaExt = ".mp4";
          tempMediaFileName = `${cuid()}${mediaExt}`;
          tempMediaPath = path.join(this.config.tempDirPath, tempMediaFileName);
          tempFiles.push(tempMediaPath);
          await this.downloadFile(video.url, tempMediaPath);
          excludeVideoIds.push(video.id);
          mediaUrl = `http://localhost:${this.config.port}/api/tmp/${tempMediaFileName}`;
        }
      } else {
        console.log(`[ShortCreator] [Scene ${sceneNum}/${inputScenes.length}] Searching Pexels for: ${mediaSearchTerms.join(", ")}`);
        const video = await this.pexelsApi.findVideo(
          mediaSearchTerms,
          audioLength,
          excludeVideoIds,
          orientation,
        );

        console.log(`[ShortCreator] [Scene ${sceneNum}/${inputScenes.length}] Downloading video: ${video.url}`);
        await this.downloadFile(video.url, tempMediaPath);
        excludeVideoIds.push(video.id);
        mediaUrl = `http://localhost:${this.config.port}/api/tmp/${tempMediaFileName}`;

        // Detect visually flat/static stock clips (dark screens, solid-color
        // shots, no motion) and replace them with an AI image so the scene
        // keeps the viewer engaged instead of reading as a blank frame.
        if (this.config.pollinationsApiKey && scene.visualPrompt) {
          const { flat, yavgRange, frames } = await this.ffmpeg.assessVideoFlatness(
            tempMediaPath,
          );
          if (flat) {
            logger.info(
              { sceneNum, yavgRange, frames, sceneId: sceneNum },
              `Scene ${sceneNum}/${inputScenes.length} stock video is flat, generating AI image instead`,
            );
            console.log(`[ShortCreator] [Scene ${sceneNum}/${inputScenes.length}] Flat stock clip detected (YAVG range ${yavgRange.toFixed(1)}), generating AI image`);

            const keywordFocus = (scene.keywords || []).slice(0, 4).join(", ");
            const aiPrompt = (
              scene.visualPrompt
                ? `${scene.visualPrompt}${keywordFocus ? `. Focus on ${keywordFocus}.` : ""}`
                : [scene.headline, scene.subcategory, ...(scene.keywords || []), scene.text]
                  .filter(Boolean)
                  .join(", ")
            ).slice(0, 240);
            const apiKeyParam = `&key=${this.config.pollinationsApiKey}`;
            const pollinationsUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(aiPrompt)}?width=${orientation === OrientationEnum.landscape ? 1920 : 1080}&height=${orientation === OrientationEnum.landscape ? 1080 : 1920}&nologo=true${apiKeyParam}`;
            const aiFileName = `${cuid()}.jpg`;
            const aiMediaPath = path.join(this.config.tempDirPath, aiFileName);
            tempFiles.push(aiMediaPath);

            console.log(`[ShortCreator] [Scene ${sceneNum}/${inputScenes.length}] Fetching AI replacement image: ${pollinationsUrl.replace(/key=[^&]*/, 'key=***')}`);
            try {
              await this.downloadFile(pollinationsUrl, aiMediaPath);
              mediaUrl = `http://localhost:${this.config.port}/api/tmp/${aiFileName}`;
              tempMediaPath = aiMediaPath;
              tempMediaFileName = aiFileName;
              console.log(`[ShortCreator] [Scene ${sceneNum}/${inputScenes.length}] AI replacement image ready`);
            } catch (aiErr: any) {
              console.error(`[ShortCreator] [Scene ${sceneNum}/${inputScenes.length}] AI replacement image failed (${pollinationsUrl}): ${aiErr.message}. Keeping stock video.`);
              logger.error(aiErr, `Error downloading flat-scene AI image for scene ${sceneNum}`);
              const aiIndex = tempFiles.indexOf(aiMediaPath);
              if (aiIndex > -1) {
                tempFiles.splice(aiIndex, 1);
              }
            }
          } else {
            logger.debug(
              { sceneNum, yavgRange, frames },
              `Scene ${sceneNum}/${inputScenes.length} stock video has visual detail, keeping as-is`,
            );
          }
        }
      }

      const baseHeadline =
        scene.cues?.[0]?.label ||
        scene.headline ||
        scene.text.split(" ").slice(0, 5).join(" ") + "...";
      const overlayHeadline = await this.translateOverlayText(
        baseHeadline,
        sourceScriptLanguage,
        effectiveOverlayLanguage,
        scene.overlayText,
      );

      scenes.push({
        captions: displayCaptions,
        headline: overlayHeadline,
        subcategory: scene.subcategory,
        [mediaUrl.endsWith(".mp4") ? "video" : "imageUrl"]: mediaUrl,
        visualPrompt: scene.visualPrompt,
        audio: {
          url: `http://localhost:${this.config.port}/api/tmp/${tempMp3FileName}`,
          duration: audioLength,
        },
      });

      totalDuration += audioLength;
      index++;
    }

    const selectedMusic = this.findMusic(totalDuration, config.music, config.category);
    logger.debug({ selectedMusic }, "Selected music for the video");

    console.log(`[ShortCreator] Final rendering with Remotion for video ${videoId}...`);
    await this.remotion.render(
      {
        music: selectedMusic,
        scenes,
        config: {
          durationMs: totalDuration * 1000,
          paddingBack: config.paddingBack,
          ...{
            scriptLanguage: config.scriptLanguage,
            audioLanguage: config.audioLanguage,
            overlayLanguage: config.overlayLanguage,
            captionLanguage: config.captionLanguage,
            textMode,
            captionBackgroundColor: config.captionBackgroundColor,
            captionPosition: config.captionPosition,
            subtitleLineCount: config.subtitleLineCount,
            subtitleFontScale: config.subtitleFontScale,
            subtitleLanguage: config.captionLanguage || config.subtitleLanguage,
          },
          musicVolume: config.musicVolume,
          category: config.category,
          templateVariant: config.templateVariant,
        },
      },
      videoId,
      orientation,
      videoType,
    );

    for (const file of tempFiles) {
      fs.removeSync(file);
    }

    return videoId;
  }

  private estimateSceneDurationSeconds(scene: SceneInput): number {
    // Practical estimate for speech generation pace.
    return Math.max(2.5, scene.text.length * 0.06);
  }

  private splitScenesByDuration(
    scenes: SceneInput[],
    durationLimit: number,
    videoType: "short" | "long",
  ): SceneInput[][] {
    const effectiveLimit = videoType === "short" ? Math.min(durationLimit, 180) : Math.max(durationLimit, 300);
    const chunks: SceneInput[][] = [];
    let current: SceneInput[] = [];
    let currentDuration = 0;

    for (const scene of scenes) {
      const est = this.estimateSceneDurationSeconds(scene);
      if (current.length > 0 && currentDuration + est > effectiveLimit) {
        chunks.push(current);
        current = [];
        currentDuration = 0;
      }
      current.push(scene);
      currentDuration += est;
    }

    if (current.length > 0) {
      chunks.push(current);
    }
    return chunks;
  }

  public getVideoPath(videoId: string): string {
    return path.join(this.config.videosDirPath, `${videoId}.mp4`);
  }

  private async downloadFile(url: string, outputPath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const fileStream = fs.createWriteStream(outputPath);
      https
        .get(url, (response: http.IncomingMessage) => {
          if (response.statusCode === 302 || response.statusCode === 301) {
            // handle redirect
            this.downloadFile(response.headers.location as string, outputPath)
              .then(resolve)
              .catch(reject);
            return;
          }
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download file: ${response.statusCode}`));
            return;
          }

          response.pipe(fileStream);

          fileStream.on("finish", () => {
            fileStream.close();
            resolve();
          });
        })
        .on("error", (err: Error) => {
          fs.unlink(outputPath, () => {});
          reject(err);
        });
    });
  }

  public deleteVideo(videoId: string): void {
    const videoPath = this.getVideoPath(videoId);
    fs.removeSync(videoPath);
    logger.debug({ videoId }, "Deleted video file");
  }

  public getVideo(videoId: string): Buffer {
    const videoPath = this.getVideoPath(videoId);
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video ${videoId} not found`);
    }
    return fs.readFileSync(videoPath);
  }

  private findMusic(
    videoDuration: number,
    tag?: MusicMoodEnum,
    category?: string,
  ): MusicForVideo {
    let effectiveTag = tag;
    if (!effectiveTag || effectiveTag === MusicMoodEnum.chill) {
      const themeMood = resolveTheme(category || "News").musicMood;
      effectiveTag = themeMood;
    }
    const musicFiles = this.musicManager.musicList().filter((music) => {
      if (effectiveTag) {
        return music.mood === effectiveTag;
      }
      return true;
    });
    const pool = musicFiles.length > 0 ? musicFiles : this.musicManager.musicList();
    return pool[Math.floor(Math.random() * pool.length)];
  }

  public ListAvailableMusicTags(): MusicTag[] {
    const tags = new Set<MusicTag>();
    this.musicManager.musicList().forEach((music) => {
      tags.add(music.mood as MusicTag);
    });
    return Array.from(tags.values());
  }

  public listAllVideos(): { id: string; status: VideoStatus }[] {
    const videos: { id: string; status: VideoStatus }[] = [];

    // Check if videos directory exists
    if (!fs.existsSync(this.config.videosDirPath)) {
      return videos;
    }

    // Read all files in the videos directory
    const files = fs.readdirSync(this.config.videosDirPath);

    // Filter for MP4 files and extract video IDs
    for (const file of files) {
      if (file.endsWith(".mp4")) {
        const videoId = file.replace(".mp4", "");

        let status: VideoStatus = "ready";
        const inQueue = this.queue.find((item) => item.id === videoId);
        if (inQueue) {
          status = "processing";
        }

        videos.push({ id: videoId, status });
      }
    }

    // Add videos that are in the queue but not yet rendered
    for (const queueItem of this.queue) {
      const existingVideo = videos.find((v) => v.id === queueItem.id);
      if (!existingVideo) {
        videos.push({ id: queueItem.id, status: "processing" });
      }
    }

    return videos;
  }

  public ListAvailableVoices(): string[] {
    return this.kokoro.listAvailableVoices();
  }
}
