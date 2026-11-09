/* eslint-disable @typescript-eslint/no-explicit-any */

process.env.LOG_LEVEL = "debug";

import { test, expect, vi } from "vitest";
import fs from "fs-extra";
import path from "path";

import { ShortCreator } from "./ShortCreator";
import { Kokoro } from "./libraries/Kokoro";
import { Remotion } from "./libraries/Remotion";
import { Whisper } from "./libraries/Whisper";
import { FFMpeg } from "./libraries/FFmpeg";
import { PexelsAPI } from "./libraries/Pexels";
import { Config } from "../config";
import { MusicManager } from "./music";
import { LanguageEnum } from "../types/shorts";

// The legacy render tests isolate filesystem-dependent publication metadata;
// the owned lifecycle integration is exercised with real stores separately.
vi.mock("../db/ArtifactManifestStore", () => ({
  ArtifactManifestStore: class {
    async register() {
      return { id: "artifact-test" };
    }
  },
}));
vi.mock("../db/ContentVersionStore", () => ({
  ContentVersionStore: class {
    create() {
      return { id: "version-test" };
    }
    updateRender() {}
  },
}));

// mock fs-extra
vi.mock("fs-extra", () => {
  const files = new Map<string, string | Buffer>([
    ["/static/music/happy-music.mp3", "mock music content"],
    ["/static/music/sad-music.mp3", "mock music content"],
    ["/static/music/chill-music.mp3", "mock music content"],
  ]);
  const directories = new Set<string>([
    "/Users/gyoridavid/.ai-agents-az-video-generator/videos",
    "/Users/gyoridavid/.ai-agents-az-video-generator/temp",
    "/Users/gyoridavid/.ai-agents-az-video-generator/libs",
    "/static",
    "/static/music",
  ]);

  const normalizePath = (filePath: string) => filePath.replace(/\\/g, "/");

  const fsExtra = {
    ensureDirSync: vi.fn((dirPath: string) => {
      directories.add(normalizePath(dirPath));
    }),
    ensureFileSync: vi.fn((targetPath: string) => {
      const normalizedPath = normalizePath(targetPath);
      const lastSlash = normalizedPath.lastIndexOf("/");
      if (lastSlash > 0) {
        directories.add(normalizedPath.slice(0, lastSlash));
      }
      if (!files.has(normalizedPath)) {
        files.set(normalizedPath, "");
      }
    }),
    existsSync: vi.fn((targetPath: string) => {
      const normalizedPath = normalizePath(targetPath);
      return files.has(normalizedPath) || directories.has(normalizedPath);
    }),
    writeFileSync: vi.fn((targetPath: string, content: string | Buffer, options?: { flag?: string } | string) => {
      const normalizedPath = normalizePath(targetPath);
      if (typeof options === "object" && options.flag === "wx" && files.has(normalizedPath)) throw Object.assign(new Error("File exists"), { code: "EEXIST" });
      files.set(normalizedPath, content);
      const lastSlash = normalizedPath.lastIndexOf("/");
      if (lastSlash > 0) {
        directories.add(normalizedPath.slice(0, lastSlash));
      }
    }),
    renameSync: vi.fn((from: string, to: string) => {
      const content = files.get(normalizePath(from));
      if (content === undefined) throw new Error("Rename source missing");
      files.set(normalizePath(to), content); files.delete(normalizePath(from));
    }),
    readFileSync: vi.fn((targetPath: string) => {
      const normalizedPath = normalizePath(targetPath);
      const content = files.get(normalizedPath);
      if (content === undefined) {
        throw new Error(`File not found: ${normalizedPath}`);
      }
      return content;
    }),
    readFile: vi.fn(async (targetPath: string) => {
      const normalizedPath = normalizePath(targetPath);
      const content = files.get(normalizedPath);
      if (content === undefined) {
        throw new Error(`File not found: ${normalizedPath}`);
      }
      return content;
    }),
    writeFile: vi.fn(async (targetPath: string, content: string | Buffer) => {
      const normalizedPath = normalizePath(targetPath);
      files.set(normalizedPath, content);
      const lastSlash = normalizedPath.lastIndexOf("/");
      if (lastSlash > 0) {
        directories.add(normalizedPath.slice(0, lastSlash));
      }
    }),
    readdirSync: vi.fn((dirPath: string) => {
      const normalizedPath = normalizePath(dirPath);
      const prefix = normalizedPath.endsWith("/")
        ? normalizedPath
        : `${normalizedPath}/`;
      return Array.from(files.keys())
        .filter((filePath) => filePath.startsWith(prefix))
        .map((filePath) => filePath.slice(prefix.length))
        .filter((fileName) => !fileName.includes("/"));
    }),
    unlink: vi.fn(
      (_targetPath: string, callback?: (error?: Error | null) => void) => {
        callback?.(null);
      },
    ),
    removeSync: vi.fn((targetPath: string) => {
      const normalizedPath = normalizePath(targetPath);
      files.delete(normalizedPath);
      directories.delete(normalizedPath);
    }),
    createWriteStream: vi.fn(() => ({
      on: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    })),
  };
  return {
    ...fsExtra,
    default: fsExtra,
  };
});

// Mock fluent-ffmpeg
vi.mock("fluent-ffmpeg", () => {
  const mockOn = vi.fn().mockReturnThis();
  const mockSave = vi.fn().mockReturnThis();
  const mockPipe = vi.fn().mockReturnThis();

  const ffmpegMock = vi.fn(() => ({
    input: vi.fn().mockReturnThis(),
    audioCodec: vi.fn().mockReturnThis(),
    audioBitrate: vi.fn().mockReturnThis(),
    audioChannels: vi.fn().mockReturnThis(),
    audioFrequency: vi.fn().mockReturnThis(),
    toFormat: vi.fn().mockReturnThis(),
    on: mockOn,
    save: mockSave,
    pipe: mockPipe,
  }));

  (ffmpegMock as any).setFfmpegPath = vi.fn();

  return { default: ffmpegMock };
});

// mock kokoro-js
vi.mock("kokoro-js", () => {
  class MockTextSplitterStream {
    push() {}
    close() {}
  }

  return {
    KokoroTTS: {
      from_pretrained: vi.fn().mockResolvedValue({
        stream: vi.fn(async function* () {
          yield {
            audio: {
              toWav: vi.fn().mockReturnValue(new ArrayBuffer(52)),
              audio: new Float32Array(44100),
              sampling_rate: 44100,
            },
          };
        }),
      }),
    },
    TextSplitterStream: MockTextSplitterStream,
  };
});

// mock remotion
vi.mock("@remotion/bundler", () => {
  return {
    bundle: vi.fn().mockResolvedValue("mocked-bundled-url"),
  };
});
vi.mock("@remotion/renderer", () => {
  return {
    renderMedia: vi.fn().mockResolvedValue(undefined),
    selectComposition: vi.fn().mockResolvedValue({
      width: 1080,
      height: 1920,
      fps: 30,
      durationInFrames: 300,
    }),
    ensureBrowser: vi.fn().mockResolvedValue(undefined),
  };
});

// mock whisper
vi.mock("@remotion/install-whisper-cpp", () => {
  return {
    downloadWhisperModel: vi.fn().mockResolvedValue(undefined),
    installWhisperCpp: vi.fn().mockResolvedValue(undefined),
    transcribe: vi.fn().mockResolvedValue({
      transcription: [
        {
          text: "This is a mock transcription.",
          offsets: { from: 0, to: 2000 },
          tokens: [
            { text: "This", timestamp: { from: 0, to: 500 } },
            { text: " is", timestamp: { from: 500, to: 800 } },
            { text: " a", timestamp: { from: 800, to: 1000 } },
            { text: " mock", timestamp: { from: 1000, to: 1500 } },
            { text: " transcription.", timestamp: { from: 1500, to: 2000 } },
          ],
        },
      ],
    }),
  };
});

test("ShortCreator basic current behavior", async () => {
  const kokoro = await Kokoro.init("fp16");
  const ffmpeg = await FFMpeg.init();

  vi.spyOn(ffmpeg, "saveNormalizedAudio").mockResolvedValue("mocked-path.wav");
  vi.spyOn(ffmpeg, "saveToMp3").mockResolvedValue("mocked-path.mp3");

  const pexelsAPI = new PexelsAPI("mock-api-key");
  vi.spyOn(pexelsAPI, "findVideo").mockResolvedValue({
    id: "mock-video-id-1",
    url: "https://example.com/mock-video-1.mp4",
    width: 1080,
    height: 1920,
  });

  const config = new Config();
  const remotion = await Remotion.init(config);

  // control the render promise resolution
  let resolveRenderPromise: () => void = () => undefined;
  const renderPromiseMock: Promise<void> = new Promise((resolve) => {
    resolveRenderPromise = resolve;
  });
  vi.spyOn(remotion, "render").mockReturnValue(renderPromiseMock);

  const whisper = await Whisper.init(config);

  vi.spyOn(whisper, "CreateCaption").mockResolvedValue([
    { text: "This", startMs: 0, endMs: 500 },
    { text: " is", startMs: 500, endMs: 800 },
    { text: " a", startMs: 800, endMs: 1000 },
    { text: " mock", startMs: 1000, endMs: 1500 },
    { text: " transcription.", startMs: 1500, endMs: 2000 },
  ]);

  const musicManager = new MusicManager(config);

  const shortCreator = new ShortCreator(
    config,
    remotion,
    kokoro,
    whisper,
    ffmpeg,
    pexelsAPI,
    musicManager,
  );
  vi.spyOn(shortCreator as any, "downloadFile").mockResolvedValue(undefined);

  const videoId = shortCreator.addToQueue(
    [
      {
        text: "test",
        searchTerms: ["test"],
        language: LanguageEnum.en,
      },
    ],
    {} as any,
    "short",
    "en",
    "test-workspace",
  );

  // list videos while the video is being processed
  let videos = shortCreator.listAllVideos("test-workspace");
  expect(videos.find((v) => v.id === videoId)?.status).toBe("processing");

  // create the video file on the file system and check the status again
  fs.writeFileSync(shortCreator.getVideoPath(videoId), "mock video content");
  videos = shortCreator.listAllVideos("test-workspace");
  expect(videos.find((v) => v.id === videoId)?.status).toBe("processing");

  // resolve the render promise to simulate the video being processed, and check the status again
  resolveRenderPromise();

  let attempts = 0;
  do {
    await new Promise((resolve) => setTimeout(resolve, 25));
    videos = shortCreator.listAllVideos("test-workspace");
    attempts += 1;
  } while (
    videos.find((v) => v.id === videoId)?.status !== "ready" &&
    attempts < 20
  );

  expect(videos.find((v) => v.id === videoId)?.status).toBe("ready");

  // check the status of the video directly
  const status = shortCreator.status(videoId);
  expect(status).toBe("ready");
});

test("ShortCreator renders the requested base video id when subtitleLanguage is omitted", async () => {
  const kokoro = await Kokoro.init("fp16");
  const ffmpeg = await FFMpeg.init();

  vi.spyOn(ffmpeg, "saveNormalizedAudio").mockResolvedValue("mocked-path.wav");
  vi.spyOn(ffmpeg, "saveToMp3").mockResolvedValue("mocked-path.mp3");

  const pexelsAPI = new PexelsAPI("mock-api-key");
  vi.spyOn(pexelsAPI, "findVideo").mockResolvedValue({
    id: "mock-video-id-2",
    url: "https://example.com/mock-video-2.mp4",
    width: 1080,
    height: 1920,
  });

  const config = new Config();
  const remotion = await Remotion.init(config);
  const renderSpy = vi
    .spyOn(remotion, "render")
    .mockImplementation(async (_data, id) => {
      fs.writeFileSync(
        path.normalize(`${config.videosDirPath}/${id}.mp4`),
        "mock video content",
      );
    });

  const whisper = await Whisper.init(config);
  vi.spyOn(whisper, "CreateCaption").mockResolvedValue([
    { text: "This", startMs: 0, endMs: 500 },
    { text: " is", startMs: 500, endMs: 800 },
  ]);

  const musicManager = new MusicManager(config);

  const shortCreator = new ShortCreator(
    config,
    remotion,
    kokoro,
    whisper,
    ffmpeg,
    pexelsAPI,
    musicManager,
  );
  vi.spyOn(shortCreator as any, "downloadFile").mockResolvedValue(undefined);

  const videoId = shortCreator.addToQueue(
    [
      {
        text: "This scene has enough content to pass validation.",
        searchTerms: ["markets", "economy"],
        language: LanguageEnum.en,
      },
    ],
    {} as any,
    "short",
    undefined,
    "test-workspace",
  );

  let attempts = 0;
  let status = shortCreator.status(videoId);
  while (status === "processing" && attempts < 20) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    status = shortCreator.status(videoId);
    attempts += 1;
  }

  expect(renderSpy).toHaveBeenCalledTimes(1);
  expect(renderSpy.mock.calls[0]?.[1]).toBe(videoId);
  expect(status).toBe("ready");
});

test("ShortCreator continues rendering when Whisper transcription fails", async () => {
  const kokoro = await Kokoro.init("fp16");
  const ffmpeg = await FFMpeg.init();

  vi.spyOn(ffmpeg, "saveNormalizedAudio").mockResolvedValue("mocked-path.wav");
  vi.spyOn(ffmpeg, "saveToMp3").mockResolvedValue("mocked-path.mp3");

  const pexelsAPI = new PexelsAPI("mock-api-key");
  vi.spyOn(pexelsAPI, "findVideo").mockResolvedValue({
    id: "mock-video-id-3",
    url: "https://example.com/mock-video-3.mp4",
    width: 1080,
    height: 1920,
  });

  const config = new Config();
  const remotion = await Remotion.init(config);
  const renderSpy = vi
    .spyOn(remotion, "render")
    .mockImplementation(async (_data, id) => {
      fs.writeFileSync(
        path.normalize(`${config.videosDirPath}/${id}.mp4`),
        "mock video content",
      );
    });

  const whisper = await Whisper.init(config);
  vi.spyOn(whisper, "CreateCaption").mockRejectedValue(
    new Error("Whisper unavailable"),
  );

  const musicManager = new MusicManager(config);
  const shortCreator = new ShortCreator(
    config,
    remotion,
    kokoro,
    whisper,
    ffmpeg,
    pexelsAPI,
    musicManager,
  );
  vi.spyOn(shortCreator as any, "downloadFile").mockResolvedValue(undefined);

  const videoId = shortCreator.addToQueue(
    [
      {
        text: "This render should still complete even without captions.",
        searchTerms: ["news", "studio"],
        language: LanguageEnum.en,
      },
    ],
    {} as any,
    "short",
    "en",
    "test-workspace",
  );

  let attempts = 0;
  let status = shortCreator.status(videoId);
  while (status === "processing" && attempts < 20) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    status = shortCreator.status(videoId);
    attempts += 1;
  }

  expect(renderSpy).toHaveBeenCalledTimes(1);
  expect(status).toBe("ready");
});

test("ShortCreator returns the existing video id for duplicate ready videos", async () => {
  const kokoro = await Kokoro.init("fp16");
  const ffmpeg = await FFMpeg.init();

  vi.spyOn(ffmpeg, "saveNormalizedAudio").mockResolvedValue("mocked-path.wav");
  vi.spyOn(ffmpeg, "saveToMp3").mockResolvedValue("mocked-path.mp3");

  const pexelsAPI = new PexelsAPI("mock-api-key");
  vi.spyOn(pexelsAPI, "findVideo").mockResolvedValue({
    id: "mock-video-id-4",
    url: "https://example.com/mock-video-4.mp4",
    width: 1080,
    height: 1920,
  });

  const config = new Config();
  const remotion = await Remotion.init(config);
  const renderSpy = vi
    .spyOn(remotion, "render")
    .mockImplementation(async (_data, id) => {
      fs.writeFileSync(
        path.normalize(`${config.videosDirPath}/${id}.mp4`),
        "mock video content",
      );
    });

  const whisper = await Whisper.init(config);
  vi.spyOn(whisper, "CreateCaption").mockResolvedValue([
    { text: "This", startMs: 0, endMs: 500 },
    { text: " story", startMs: 500, endMs: 900 },
  ]);

  const musicManager = new MusicManager(config);
  const shortCreator = new ShortCreator(
    config,
    remotion,
    kokoro,
    whisper,
    ffmpeg,
    pexelsAPI,
    musicManager,
  );
  vi.spyOn(shortCreator as any, "downloadFile").mockResolvedValue(undefined);

  const inputScenes = [
    {
      text: "This duplicate story should resolve to the same already rendered video.",
      searchTerms: ["markets", "earnings"],
      language: LanguageEnum.en,
      keywords: ["stocks", "quarterly"],
      subcategory: "Markets",
    },
  ];

  const firstVideoId = shortCreator.addToQueue(
    inputScenes,
    {} as any,
    "short",
    "en",
    "test-workspace",
  );

  let attempts = 0;
  let status = shortCreator.status(firstVideoId);
  while (status === "processing" && attempts < 20) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    status = shortCreator.status(firstVideoId);
    attempts += 1;
  }

  expect(status).toBe("ready");

  const duplicateVideoId = shortCreator.addToQueue(
    inputScenes,
    {} as any,
    "short",
    "en",
    "test-workspace",
  );

  expect(duplicateVideoId).toBe(firstVideoId);
  expect(renderSpy).toHaveBeenCalledTimes(1);
});

test("ShortCreator dedupes scenes with only formatting differences", async () => {
  const kokoro = await Kokoro.init("fp16");
  const ffmpeg = await FFMpeg.init();

  vi.spyOn(ffmpeg, "saveNormalizedAudio").mockResolvedValue("mocked-path.wav");
  vi.spyOn(ffmpeg, "saveToMp3").mockResolvedValue("mocked-path.mp3");

  const pexelsAPI = new PexelsAPI("mock-api-key");
  vi.spyOn(pexelsAPI, "findVideo").mockResolvedValue({
    id: "mock-video-id-5",
    url: "https://example.com/mock-video-5.mp4",
    width: 1080,
    height: 1920,
  });

  const config = new Config();
  const remotion = await Remotion.init(config);
  const renderSpy = vi
    .spyOn(remotion, "render")
    .mockImplementation(async (_data, id) => {
      fs.writeFileSync(
        path.normalize(`${config.videosDirPath}/${id}.mp4`),
        "mock video content",
      );
    });

  const whisper = await Whisper.init(config);
  vi.spyOn(whisper, "CreateCaption").mockResolvedValue([
    { text: "This", startMs: 0, endMs: 500 },
    { text: " story", startMs: 500, endMs: 900 },
  ]);

  const musicManager = new MusicManager(config);
  const shortCreator = new ShortCreator(
    config,
    remotion,
    kokoro,
    whisper,
    ffmpeg,
    pexelsAPI,
    musicManager,
  );
  vi.spyOn(shortCreator as any, "downloadFile").mockResolvedValue(undefined);

  const firstVideoId = shortCreator.addToQueue(
    [
      {
        text: "Markets react as investors digest the latest policy decision.",
        searchTerms: ["market reaction", "policy decision"],
        language: LanguageEnum.en,
        keywords: ["Investors", "Policy"],
        subcategory: "Markets",
        headline: "MARKETS REACT",
      },
    ],
    {} as any,
    "short",
    "en",
    "test-workspace",
  );

  let attempts = 0;
  let status = shortCreator.status(firstVideoId);
  while (status === "processing" && attempts < 20) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    status = shortCreator.status(firstVideoId);
    attempts += 1;
  }

  const duplicateVideoId = shortCreator.addToQueue(
    [
      {
        text: "  Markets react as investors digest the latest policy decision.  ",
        searchTerms: ["Policy Decision", "market reaction"],
        language: LanguageEnum.en,
        keywords: ["policy", "investors"],
        subcategory: "  markets ",
        headline: "markets react",
      },
    ],
    {} as any,
    "short",
    "en",
    "test-workspace",
  );

  expect(duplicateVideoId).toBe(firstVideoId);
  expect(renderSpy).toHaveBeenCalledTimes(1);
});

test("ShortCreator does not dedupe meaningful variants of the same topic", async () => {
  const kokoro = await Kokoro.init("fp16");
  const ffmpeg = await FFMpeg.init();

  vi.spyOn(ffmpeg, "saveNormalizedAudio").mockResolvedValue("mocked-path.wav");
  vi.spyOn(ffmpeg, "saveToMp3").mockResolvedValue("mocked-path.mp3");

  const pexelsAPI = new PexelsAPI("mock-api-key");
  vi.spyOn(pexelsAPI, "findVideo").mockResolvedValue({
    id: "mock-video-id-6",
    url: "https://example.com/mock-video-6.mp4",
    width: 1080,
    height: 1920,
  });

  const config = new Config();
  const remotion = await Remotion.init(config);
  const renderSpy = vi
    .spyOn(remotion, "render")
    .mockImplementation(async (_data, id) => {
      fs.writeFileSync(
        path.normalize(`${config.videosDirPath}/${id}.mp4`),
        "mock video content",
      );
    });

  const whisper = await Whisper.init(config);
  vi.spyOn(whisper, "CreateCaption").mockResolvedValue([
    { text: "This", startMs: 0, endMs: 500 },
    { text: " story", startMs: 500, endMs: 900 },
  ]);

  const musicManager = new MusicManager(config);
  const shortCreator = new ShortCreator(
    config,
    remotion,
    kokoro,
    whisper,
    ffmpeg,
    pexelsAPI,
    musicManager,
  );
  vi.spyOn(shortCreator as any, "downloadFile").mockResolvedValue(undefined);

  const firstVideoId = shortCreator.addToQueue(
    [
      {
        text: "Investors cheer the policy decision as markets rally sharply.",
        searchTerms: ["market rally", "policy decision"],
        language: LanguageEnum.en,
        keywords: ["stocks", "rally"],
        subcategory: "Markets",
        headline: "MARKET RELIEF",
      },
    ],
    {} as any,
    "short",
    "en",
    "test-workspace",
  );

  let attempts = 0;
  let status = shortCreator.status(firstVideoId);
  while (status === "processing" && attempts < 20) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    status = shortCreator.status(firstVideoId);
    attempts += 1;
  }

  const variantVideoId = shortCreator.addToQueue(
    [
      {
        text: "Analysts warn the same policy decision may still trigger a delayed selloff.",
        searchTerms: ["market selloff", "policy risk"],
        language: LanguageEnum.en,
        keywords: ["stocks", "selloff"],
        subcategory: "Markets",
        headline: "RALLY MAY FADE",
      },
    ],
    {} as any,
    "short",
    "en",
    "test-workspace",
  );

  attempts = 0;
  status = shortCreator.status(variantVideoId);
  while (status === "processing" && attempts < 20) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    status = shortCreator.status(variantVideoId);
    attempts += 1;
  }

  expect(variantVideoId).not.toBe(firstVideoId);
  expect(renderSpy).toHaveBeenCalledTimes(2);
});

test("ShortCreator builds richer media search terms from cues and domain anchors", async () => {
  const kokoro = await Kokoro.init("fp16");
  const ffmpeg = await FFMpeg.init();
  const pexelsAPI = new PexelsAPI("mock-api-key");
  const config = new Config();
  const remotion = await Remotion.init(config);
  const whisper = await Whisper.init(config);
  const musicManager = new MusicManager(config);

  const shortCreator = new ShortCreator(
    config,
    remotion,
    kokoro,
    whisper,
    ffmpeg,
    pexelsAPI,
    musicManager,
  );

  const terms = (shortCreator as any).buildMediaSearchTerms({
    text: "PCB confirms Moeen Ali is available for the IPL final after injury concerns eased.",
    headline: "PCB BACKS MOEEN ALI",
    searchTerms: ["cricket controversy", "sports"],
    language: LanguageEnum.en,
    keywords: ["PCB", "Moeen Ali", "IPL final"],
    subcategory: "Cricket",
    cues: [
      {
        startMs: 0,
        endMs: 1000,
        brollSearchTerms: ["stadium crowd"],
      },
    ],
  });

  expect(terms).toContain("stadium crowd");
  expect(terms).toContain("cricket stadium");
  expect(terms).toContain("cricket player");
  expect(terms).toContain("cricket controversy");
  expect(terms).toContain("PCB");
});
