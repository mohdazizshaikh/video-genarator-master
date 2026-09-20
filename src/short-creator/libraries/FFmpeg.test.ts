import { test, expect, vi, afterEach } from "vitest";
import { execFile } from "node:child_process";

vi.mock("node:child_process", async () => {
  const actual = await vi.importActual<typeof import("node:child_process")>(
    "node:child_process",
  );
  return {
    ...actual,
    execFile: vi.fn(),
  };
});

import { FFMpeg } from "./FFmpeg";

afterEach(() => {
  vi.clearAllMocks();
});

const mockExecFile = execFile as unknown as ReturnType<typeof vi.fn>;

function instantiate(): FFMpeg {
  // Bypass the async init() (which uses @ffmpeg-installer) by exploiting the
  // private constructor via casting.
  return new (FFMpeg as unknown as new (bin: string) => FFMpeg)("ffmpeg");
}

function makeFfmpegStderr(yavgValues: number[]): string {
  return yavgValues
    .map((v, i) => `[Parsed_metadata_${i} @ 0x0] frame:${i}  lavfi.signalstats.YAVG=${v}.0`)
    .join("\n");
}

test("assessVideoFlatness flags a static/solid-color video as flat", async () => {
  mockExecFile.mockImplementation((_bin, _args, _opts, cb: (err: null, stdout: string, stderr: string) => void) => {
    cb(null, "", makeFfmpegStderr([169.49, 169.52, 169.55, 169.5, 169.51]));
  });
  const result = await instantiate().assessVideoFlatness("/tmp/whatever.mp4");
  expect(result).toMatchObject({ flat: true, frames: 5 });
  expect(result.yavgRange).toBeLessThan(5);
});

test("assessVideoFlatness keeps a video with real motion as non-flat", async () => {
  mockExecFile.mockImplementation((_bin, _args, _opts, cb: (err: null, stdout: string, stderr: string) => void) => {
    cb(null, "", makeFfmpegStderr([100.0, 105.0, 112.0, 118.0, 125.0, 133.0]));
  });
  const result = await instantiate().assessVideoFlatness("/tmp/whatever.mp4");
  expect(result).toMatchObject({ flat: false, frames: 6 });
  expect(result.yavgRange).toBeGreaterThanOrEqual(5);
});

test("assessVideoFlatness resolves non-flat without throwing when ffmpeg errors", async () => {
  mockExecFile.mockImplementation((_bin, _args, _opts, cb: (err: Error) => void) => {
    cb(new Error("ffmpeg crashed"));
  });
  const result = await instantiate().assessVideoFlatness("/tmp/missing.mp4");
  expect(result).toEqual({ flat: false, yavgRange: 0, frames: 0 });
});

test("assessVideoFlatness resolves safely when no YAVG frames are parsed", async () => {
  mockExecFile.mockImplementation((_bin, _args, _opts, cb: (err: null, stdout: string, stderr: string) => void) => {
    cb(null, "", "no metadata here");
  });
  const result = await instantiate().assessVideoFlatness("/tmp/whatever.mp4");
  expect(result).toEqual({ flat: false, yavgRange: 0, frames: 0 });
});