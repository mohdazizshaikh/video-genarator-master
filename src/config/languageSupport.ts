import { LanguageEnum, VoiceEnum, type Voices } from "../types/shorts";

export type SupportedLanguageOption = {
  code: LanguageEnum;
  label: string;
  defaultVoice: Voices;
};

export const supportedCreateLanguages: SupportedLanguageOption[] = [
  { code: LanguageEnum.en, label: "English", defaultVoice: VoiceEnum.af_heart },
  { code: LanguageEnum.hi, label: "Hindi (Hinglish fallback)", defaultVoice: VoiceEnum.hi_IN_madhur },
  { code: LanguageEnum.fr, label: "French", defaultVoice: VoiceEnum.bf_emma },
  { code: LanguageEnum.es, label: "Spanish", defaultVoice: VoiceEnum.af_sarah },
];

export const supportedLanguageCodes = supportedCreateLanguages.map((item) => item.code);

export const defaultVoiceForLanguage = (language: LanguageEnum): Voices => {
  return supportedCreateLanguages.find((item) => item.code === language)?.defaultVoice || VoiceEnum.af_heart;
};

export const labelForLanguage = (language: LanguageEnum): string => {
  return supportedCreateLanguages.find((item) => item.code === language)?.label || language;
};

export const toSpeechSynthesisLocale = (language: LanguageEnum): string => {
  switch (language) {
    case LanguageEnum.hi:
      return "hi-IN";
    case LanguageEnum.fr:
      return "fr-FR";
    case LanguageEnum.es:
      return "es-ES";
    case LanguageEnum.auto:
      return "en-US";
    case LanguageEnum.en:
    default:
      return "en-US";
  }
};
