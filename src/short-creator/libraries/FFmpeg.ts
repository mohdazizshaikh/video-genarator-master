import ffmpeg from "fluent-ffmpeg";
import { execFile } from "node:child_process";
import { Readable } from "node:stream";
import { logger } from "../../logger";

export class FFMpeg {
  static async init(): Promise<FFMpeg> {
    return import("@ffmpeg-installer/ffmpeg").then((ffmpegInstaller) => {
      ffmpeg.setFfmpegPath(ffmpegInstaller.path);
      logger.info(`FFmpeg path set to: ${ffmpegInstaller.path}`);
      return new FFMpeg(ffmpegInstaller.path);
    });
  }

  private constructor(private readonly ffmpegBinPath: string) {}

  async saveNormalizedAudio(
    audio: ArrayBuffer,
    outputPath: string,
  ): Promise<string> {
    logger.debug("Normalizing audio for Whisper");
    const inputStream = new Readable();
    inputStream.push(Buffer.from(audio));
    inputStream.push(null);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(inputStream)
        .audioCodec("pcm_s16le")
        .audioChannels(1)
        .audioFrequency(16000)
        .toFormat("wav")
        .on("end", () => {
          logger.debug("Audio normalization complete");
          resolve(outputPath);
        })
        .on("error", (error: unknown) => {
          logger.error(error, "Error normalizing audio:");
          reject(error);
        })
        .save(outputPath);
    });
  }

  async createMp3DataUri(audio: ArrayBuffer): Promise<string> {
    const inputStream = new Readable();
    inputStream.push(Buffer.from(audio));
    inputStream.push(null);
    return new Promise((resolve, reject) => {
      const chunk: Buffer[] = [];

      ffmpeg()
        .input(inputStream)
        .audioCodec("libmp3lame")
        .audioBitrate(128)
        .audioChannels(2)
        .toFormat("mp3")
        .on("error", (err) => {
          reject(err);
        })
        .pipe()
        .on("data", (data: Buffer) => {
          chunk.push(data);
        })
        .on("end", () => {
          const buffer = Buffer.concat(chunk);
          resolve(`data:audio/mp3;base64,${buffer.toString("base64")}`);
        })
        .on("error", (err) => {
          reject(err);
        });
    });
  }

  async saveToMp3(audio: ArrayBuffer, filePath: string): Promise<string> {
    const inputStream = new Readable();
    inputStream.push(Buffer.from(audio));
    inputStream.push(null);
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(inputStream)
        .audioCodec("libmp3lame")
        .audioBitrate(128)
        .audioChannels(2)
        .toFormat("mp3")
        .save(filePath)
        .on("end", () => {
          logger.debug("Audio conversion complete");
          resolve(filePath);
        })
        .on("error", (err) => {
          reject(err);
        });
    });
  }

  async concatVideos(inputPaths: string[], outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const concatInput = `concat:${inputPaths.join("|")}`;
      ffmpeg()
        .input(concatInput)
        .videoCodec("copy")
        .audioCodec("copy")
        .on("end", () => {
          logger.info({ outputPath, parts: inputPaths.length }, "Video parts concatenated");
          resolve(outputPath);
        })
        .on("error", (error: unknown) => {
          logger.error(error, "Error concatenating video parts");
          reject(error);
        })
        .save(outputPath);
    });
  }

  async assessVideoFlatness(filePath: string): Promise<{
    flat: boolean;
    yavgRange: number;
    frames: number;
  }> {
    return new Promise((resolve) => {
      execFile(
        this.ffmpegBinPath,
        [
          "-y",
          "-i",
          filePath,
          "-vf",
          "fps=2,signalstats,metadata=print",
          "-f",
          "null",
          "-",
        ],
        {
          timeout: 15000,
          maxBuffer: 8 * 1024 * 1024,
        },
        (error, _stdout, stderr) => {
          if (error) {
            logger.warn({ error: error.message, filePath }, "Failed to assess video flatness");
            resolve({ flat: false, yavgRange: 0, frames: 0 });
            return;
          }
          const yavgRegex = /lavfi\.signalstats\.YAVG=([0-9.]+)/g;
          const yavgValues: number[] = [];
          let match: RegExpExecArray | null;
          while ((match = yavgRegex.exec(stderr)) !== null) {
            yavgValues.push(parseFloat(match[1]));
          }

          if (yavgValues.length === 0) {
            resolve({ flat: false, yavgRange: 0, frames: 0 });
            return;
          }
          const min = Math.min(...yavgValues);
          const max = Math.max(...yavgValues);
          const yavgRange = max - min;
          // A video with barely any luma change across sampled frames is
          // visually static/flat (dark frame or a solid-color scene).
          resolve({ flat: yavgRange < 5, yavgRange, frames: yavgValues.length });
        },
      );
    });
  }

  async getAudioDuration(filePath: string): Promise<number> {
    try {
      return await this.probeDurationWithFfprobe(filePath);
    } catch (ffprobeError) {
      logger.warn(
        { ffprobeError, filePath },
        "ffprobe unavailable, falling back to ffmpeg stderr duration parsing",
      );
      return this.probeDurationWithFfmpeg(filePath);
    }
  }

  private async probeDurationWithFfprobe(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (error, metadata) => {
        if (error) {
          reject(error);
          return;
        }

        const duration = metadata.format.duration;
        if (!duration || Number.isNaN(duration) || duration <= 0) {
          reject(new Error(`Invalid audio duration for ${filePath}`));
          return;
        }

        resolve(duration);
      });
    });
  }

  private async probeDurationWithFfmpeg(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      execFile(
        this.ffmpegBinPath,
        ["-i", filePath],
        { timeout: 30_000 },
        (error, _stdout, stderr) => {
          if (!stderr) {
            reject(new Error(`No ffmpeg output for ${filePath}`));
            return;
          }

          const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
          if (!match) {
            reject(new Error(`Could not parse duration from ffmpeg output for ${filePath}`));
            return;
          }

          const hours = Number(match[1]);
          const minutes = Number(match[2]);
          const seconds = Number(match[3]);
          const duration = hours * 3600 + minutes * 60 + seconds;
          if (duration <= 0) {
            reject(new Error(`Invalid audio duration for ${filePath}`));
            return;
          }

          resolve(duration);
        },
      );
    });
  }
}
