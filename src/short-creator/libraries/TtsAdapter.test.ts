/* eslint-disable @typescript-eslint/no-explicit-any */

import { test, expect, vi, beforeEach } from "vitest";
import { TtsAdapter } from "./TtsAdapter";
import { Kokoro } from "./Kokoro";
import { LanguageEnum, SceneInput } from "../../types/shorts";

vi.mock("../../script-generator/AiLlmGenerator", () => {
  return {
    AiLlmGenerator: vi.fn().mockImplementation(() => ({
      translateText: vi.fn().mockResolvedValue("Translated text"),
      transliterateText: vi.fn().mockResolvedValue("Transliterated text"),
    })),
  };
});

vi.mock("./EdgeTts", () => {
  const EdgeTts = vi.fn();
  EdgeTts.isEdgeVoice = vi.fn((voice: string) =>
    ["en_IN_prabhat", "en_IN_neeerja", "hi_IN_madhur", "hi_IN_swara"].includes(voice),
  );
  EdgeTts.prototype.generate = vi.fn().mockResolvedValue({
    audio: new ArrayBuffer(8),
    audioLength: 3,
  });
  return { EdgeTts };
});

vi.mock("./Chatterbox", () => {
  const Chatterbox = vi.fn();
  Chatterbox.isChatterboxVoice = vi.fn((voice: string) =>
    ["en_IN_prabhat"].includes(voice),
  );
  Chatterbox.prototype.generate = vi.fn().mockResolvedValue({
    audio: new ArrayBuffer(16),
    audioLength: 4,
  });
  return { Chatterbox };
});

import { EdgeTts } from "./EdgeTts";
import { Chatterbox } from "./Chatterbox";

beforeEach(() => {
  vi.clearAllMocks();
});

test("TtsAdapter should translate text when translationTarget differs from language", async () => {
  const kokoro = {
    generate: vi.fn().mockResolvedValue({ audio: new ArrayBuffer(4), audioLength: 2 }),
  } as any as Kokoro;

  const adapter = new TtsAdapter(kokoro, "http://mocked", "model");

  const scene: SceneInput = {
    text: "Hello world",
    searchTerms: ["hello", "world"],
    language: LanguageEnum.fr,
    sourceLanguage: LanguageEnum.en,
  };

  const result = await adapter.synthesize(scene);

  expect(result.audioLength).toBe(2);
  expect(kokoro.generate).toHaveBeenCalledWith("Translated text", "bf_emma");
});

test("TtsAdapter should transliterate Hindi text for Hinglish audio fallback", async () => {
  const kokoro = {
    generate: vi.fn().mockResolvedValue({ audio: new ArrayBuffer(4), audioLength: 2 }),
  } as any as Kokoro;

  const adapter = new TtsAdapter(kokoro, "http://mocked", "model");

  const scene: SceneInput = {
    text: "This is a test for Hindi audio",
    searchTerms: ["test", "Hindi"],
    language: LanguageEnum.hi,
    sourceLanguage: LanguageEnum.en,
  };

  const result = await adapter.synthesize(scene);

  expect(result.audioLength).toBe(3);
  expect(EdgeTts.prototype.generate).toHaveBeenCalledWith("Transliterated text", "hi_IN_madhur");
});

test("TtsAdapter should transliterate Devanagari Hindi text when source and target match", async () => {
  const kokoro = {
    generate: vi.fn().mockResolvedValue({ audio: new ArrayBuffer(4), audioLength: 2 }),
  } as any as Kokoro;

  const adapter = new TtsAdapter(kokoro, "http://mocked", "model");

  const scene: SceneInput = {
    text: "यह एक परीक्षण है",
    searchTerms: ["परीक्षण", "हिंदी"],
    language: LanguageEnum.hi,
    sourceLanguage: LanguageEnum.hi,
  };

  const result = await adapter.synthesize(scene);

  expect(result.audioLength).toBe(3);
  expect(EdgeTts.prototype.generate).toHaveBeenCalledWith("Transliterated text", "hi_IN_madhur");
});

test("TtsAdapter should use config scriptLanguage when scene sourceLanguage is absent", async () => {
  const kokoro = {
    generate: vi.fn().mockResolvedValue({ audio: new ArrayBuffer(3), audioLength: 2 }),
  } as any as Kokoro;

  const adapter = new TtsAdapter(kokoro, "http://mocked", "model");

  const scene: SceneInput = {
    text: "Hello world",
    searchTerms: ["news", "world"],
    language: LanguageEnum.es,
  };

  const result = await adapter.synthesize(scene, undefined, LanguageEnum.en);

  expect(result.audioLength).toBe(2);
  expect(kokoro.generate).toHaveBeenCalledWith("Translated text", "af_sarah");
});

test("TtsAdapter should fallback to source text when translation target matches language", async () => {
  const kokoro = {
    generate: vi.fn().mockResolvedValue({ audio: new ArrayBuffer(2), audioLength: 1 }),
  } as any as Kokoro;

  const adapter = new TtsAdapter(kokoro, "http://mocked", "model");

  const scene: SceneInput = {
    text: "Hola mundo",
    searchTerms: ["hola", "mundo"],
    language: LanguageEnum.es,
    translationTarget: LanguageEnum.es,
  };

  const result = await adapter.synthesize(scene);

  expect(result.audioLength).toBe(1);
  expect(kokoro.generate).toHaveBeenCalledWith("Hola mundo", "af_sarah");
});

test("TtsAdapter should route Indian voices through Edge TTS", async () => {
  const kokoro = {
    generate: vi.fn().mockResolvedValue({ audio: new ArrayBuffer(4), audioLength: 2 }),
  } as any as Kokoro;

  const adapter = new TtsAdapter(kokoro, "http://mocked", "model");

  const scene: SceneInput = {
    text: "Zaroor suno, ye video sach khol degi.",
    searchTerms: ["test", "AI"],
    language: LanguageEnum.en,
  };

  const result = await adapter.synthesize(scene, "en_IN_neeerja");

  expect(result.audioLength).toBe(3);
  expect(EdgeTts.prototype.generate).toHaveBeenCalledWith(
    "Zaroor suno, ye video sach khol degi.",
    "en_IN_neeerja",
  );
  expect(kokoro.generate).not.toHaveBeenCalled();
});

test("TtsAdapter should route Prabhat voice through Chatterbox", async () => {
  const kokoro = {
    generate: vi.fn().mockResolvedValue({ audio: new ArrayBuffer(4), audioLength: 2 }),
  } as any as Kokoro;

  const adapter = new TtsAdapter(kokoro, "http://mocked", "model");

  const scene: SceneInput = {
    text: "Zaroor suno, ye video sach khol degi.",
    searchTerms: ["test", "AI"],
    language: LanguageEnum.en,
  };

  const result = await adapter.synthesize(scene, "en_IN_prabhat");

  expect(result.audioLength).toBe(4);
  expect(Chatterbox.prototype.generate).toHaveBeenCalledWith(
    "Zaroor suno, ye video sach khol degi.",
    "en_IN_prabhat",
  );
  expect(EdgeTts.prototype.generate).not.toHaveBeenCalled();
  expect(kokoro.generate).not.toHaveBeenCalled();
});
