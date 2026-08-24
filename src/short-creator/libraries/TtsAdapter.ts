import { Kokoro } from "./Kokoro";
import { EdgeTts } from "./EdgeTts";
import { Chatterbox } from "./Chatterbox";
import { LanguageEnum, type SceneInput, type Voices } from "../../types/shorts";
import { AiLlmGenerator } from "../../script-generator/AiLlmGenerator";
import { defaultVoiceForLanguage } from "../../config/languageSupport";
import { logger } from "../../logger";

export class TtsAdapter {
  private translator: AiLlmGenerator;
  private edgeTts: EdgeTts;
  private chatterbox: Chatterbox;

  constructor(
    private kokoro: Kokoro,
    aiLlmUrl?: string,
    aiLlmModel?: string,
  ) {
    this.translator = new AiLlmGenerator(aiLlmUrl, aiLlmModel);
    this.edgeTts = new EdgeTts();
    this.chatterbox = new Chatterbox();
  }

  private languageNeedsTransliteration(language: LanguageEnum): boolean {
    return language === LanguageEnum.hi;
  }

  private async translateIfNeeded(
    scene: SceneInput,
    sourceLanguage?: LanguageEnum,
  ): Promise<string> {
    if (scene.narrationText?.trim()) {
      return scene.narrationText.trim();
    }

    const source = sourceLanguage ?? scene.sourceLanguage ?? scene.language;
    const targetLanguage = scene.language;

    if (!targetLanguage || targetLanguage === LanguageEnum.auto) {
      return scene.text;
    }

    try {
      if (this.languageNeedsTransliteration(targetLanguage)) {
        const trimmedText = scene.text.trim();
        const containsDevangari = /[\u0900-\u097F]/.test(trimmedText);
        if (source === targetLanguage) {
          if (containsDevangari) {
            const transliterated = await this.translator.transliterateText(trimmedText, targetLanguage);
            logger.debug({ source, targetLanguage, transliterated: true }, "TTS text transliterated for same source/target language");
            return transliterated;
          }
          logger.debug({ source, targetLanguage, transliterated: false }, "TTS text requires no transliteration for same source/target language");
          return trimmedText;
        }

        const translatedText = await this.translator.translateText(scene.text, source, targetLanguage);
        const transliterated = await this.translator.transliterateText(translatedText, targetLanguage);
        logger.debug({ source, targetLanguage, transliterated: true }, "TTS text translated and transliterated for target Hindi language");
        return transliterated;
      }

      if (source === targetLanguage) {
        logger.debug({ source, targetLanguage, transliterated: false }, "TTS source and target are identical, no translation needed");
        return scene.text;
      }

      return await this.translator.translateText(scene.text, source, targetLanguage);
    } catch {
      if (source !== targetLanguage && targetLanguage !== LanguageEnum.en) {
        throw new Error(`Narration translation failed for ${source} -> ${targetLanguage}`);
      }
      return scene.text;
    }
  }

  private async prepareTextForSpeech(text: string): Promise<string> {
    if (!text.trim()) {
      return text;
    }

    return text;
  }

  async synthesize(
    scene: SceneInput,
    preferredVoice?: Voices,
    sourceLanguage?: LanguageEnum,
  ): Promise<{ audio: ArrayBuffer; audioLength: number }> {
    const targetLanguage = scene.language || LanguageEnum.en;
    const voiceKey = preferredVoice || defaultVoiceForLanguage(targetLanguage);
    const translatedText = await this.translateIfNeeded(scene, sourceLanguage);
    const speechReadyText = await this.prepareTextForSpeech(translatedText);
    if (Chatterbox.isChatterboxVoice(voiceKey)) {
      try {
        const result = await this.chatterbox.generate(speechReadyText, voiceKey);
        if (result.audio.byteLength > 0) {
          return result;
        }
        logger.warn({ voiceKey }, "Chatterbox returned empty audio, falling back to Edge TTS");
      } catch (error) {
        logger.warn({ error, voiceKey }, "Chatterbox synthesis failed, falling back to Edge TTS");
      }
    }
    if (EdgeTts.isEdgeVoice(voiceKey)) {
      const result = await this.edgeTts.generate(speechReadyText, voiceKey);
      if (result.audio.byteLength > 0) {
        return result;
      }
      logger.warn({ voiceKey }, "Edge TTS returned empty audio, falling back to Kokoro");
    }
    return this.kokoro.generate(speechReadyText, voiceKey);
  }
}
