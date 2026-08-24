import fs from "fs-extra";
import path from "path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { Config } from "../config";
import { Whisper } from "../short-creator/libraries/Whisper";
import { selectTopClips, type ClipWindow } from "../short-creator/libraries/VideoSegmenter";
import { logger } from "../logger";

const execFileAsync = promisify(execFile);

export interface RepurposeClip {
  index: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  text: string;
  score: number;
  outputPath: string;
  fileName: string;
}

export interface RepurposeOptions {
  /** Auth-derived owner for generated artifacts. */
  tenantId?: string;
  /** Target clip length in seconds. */
  clipSeconds?: number;
  /** Number of clips to produce. */
  maxClips?: number;
  /** Overwrite existing clips for this source. */
  force?: boolean;
}

export class RepurposeEngine {
  constructor(
    private config: Config,
    private whisper: Whisper,
    private ffmpegBinPath: string,
  ) {}

  static async create(config: Config): Promise<RepurposeEngine> {
    const whisper = await Whisper.init(config);
    const { default: ffmpegInstaller } = await import("@ffmpeg-installer/ffmpeg");
    const ffmpegBinPath = ffmpegInstaller.path;
    return new RepurposeEngine(config, whisper, ffmpegBinPath);
  }

  private async extractAudio(videoPath: string, outputPath: string): Promise<void> {
    await execFileAsync(
      this.ffmpegBinPath,
      [
        "-y",
        "-i",
        videoPath,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "pcm_s16le",
        outputPath,
      ],
      { timeout: 180000, maxBuffer: 8 * 1024 * 1024 },
    );
  }

  async repurpose(
    videoPath: string,
    options: RepurposeOptions = {},
  ): Promise<RepurposeClip[]> {
    const fileBase = path.basename(videoPath, path.extname(videoPath));
    const ownerPrefix = options.tenantId ? `${options.tenantId.replace(/[^a-zA-Z0-9_-]/g, "-")}__` : "legacy__";
    const outDir = path.join(this.config.videosDirPath, "repurposed", fileBase);
    fs.ensureDirSync(outDir);

    const clipSeconds = options.clipSeconds ?? 20;
    const maxClips = options.maxClips ?? 3;

    const wavPath = path.join(outDir, `${ownerPrefix}${fileBase}.wav`);
    logger.info({ videoPath }, "Repurposing: extracting normalized audio for Whisper");
    await this.extractAudio(videoPath, wavPath);

    logger.info({ videoPath, wavPath }, "Repurposing: transcribing with Whisper");
    const captions = await this.whisper.CreateCaption(wavPath);
    logger.info({ videoPath, captionWords: captions.length }, "Repurposing: transcript ready");

    const windows = selectTopClips(captions, { clipSeconds, maxClips });
    logger.info(
      { videoPath, windows: windows.length },
      "Repurposing: segmented into candidate clips",
    );

    const clips: RepurposeClip[] = [];
    for (let i = 0; i < windows.length; i++) {
      const window = windows[i];
      const fileTitle = (fileBase + "-" + (i + 1)).replace(/[^a-zA-Z0-9-_]/g, "-");
      const outputName = `${ownerPrefix}${fileTitle}.mp4`;
      const outputPath = path.join(outDir, outputName);

      if (!options.force && fs.existsSync(outputPath)) {
        logger.info({ outputPath }, "Repurposing: clip exists, skipping");
      } else {
        await this.cutClip(videoPath, window, outputPath);
      }

      clips.push({
        index: i + 1,
        startMs: window.startMs,
        endMs: window.endMs,
        durationMs: window.endMs - window.startMs,
        text: window.text,
        score: window.score,
        outputPath,
        fileName: outputName,
      });
    }

    fs.removeSync(wavPath);
    return clips;
  }

  private async cutClip(
    videoPath: string,
    window: ClipWindow,
    outputPath: string,
  ): Promise<void> {
    const startSec = (window.startMs / 1000).toFixed(3);
    const durationSec = ((window.endMs - window.startMs) / 1000).toFixed(3);

    await execFileAsync(
      this.ffmpegBinPath,
      [
        "-y",
        "-ss",
        startSec,
        "-i",
        videoPath,
        "-t",
        durationSec,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "18",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-movflags",
        "+faststart",
        outputPath,
      ],
      { timeout: 300000, maxBuffer: 16 * 1024 * 1024 },
    );
    logger.info({ outputPath, startMs: window.startMs, endMs: window.endMs }, "Repurposing: clip cut");
  }
}