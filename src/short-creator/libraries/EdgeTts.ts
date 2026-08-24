import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { VoiceEnum, type Voices } from "../../types/shorts";
import { logger } from "../../logger";

const execFileAsync = promisify(execFile);

export const EDGE_VOICE_MAP: Record<string, string> = {
  [VoiceEnum.en_IN_prabhat]: "en-IN-PrabhatNeural",
  [VoiceEnum.en_IN_neeerja]: "en-IN-NeerjaNeural",
  [VoiceEnum.hi_IN_madhur]: "hi-IN-MadhurNeural",
  [VoiceEnum.hi_IN_swara]: "hi-IN-SwaraNeural",
};

type ProsodyChunk = {
  text: string;
  rate: string;
  pitch: string;
  volume: string;
  pause_ms: number;
};

const DRAMATIC_WORDS = [
  "sach", "jaadu", "chhupa", "chhup", "ghatna", "khabar", "darr", "khatra",
  "sirf", "real", "true", "secret", "inside", "actually", "asli", "khel",
  "zero", "ardha", "sabse",
];

const QUESTION_WORDS = ["kya", "kaise", "kyun", "kaun", "kab", "kahan", "who", "why", "how", "what"];

/**
 * Split scene narration into speakable clauses at sentence and comma
 * boundaries, preserving each clause as its own prosody unit.
 * Recognizes Devanagari danda (।) / double-danda (॥) so real Hindi
 * narration splits per sentence (space required after the boundary).
 */
export function splitClauses(text: string): string[] {
  const cleaned = text.trim();
  if (!cleaned) {
    return [];
  }

  const parts: string[] = [];
  const segments = cleaned.split(/(?<=[.!?…।॥])\s+/);
  for (const segment of segments) {
    const subClauses = segment
      .split(/,\s*|:\s+|-{2,}|\.\.\./)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (subClauses.length === 0) {
      continue;
    }

    // Re-attach trailing punctuation to the last sub-clause of the segment.
    for (let i = 0; i < subClauses.length; i++) {
      let clause = subClauses[i];
      if (i === subClauses.length - 1) {
        const trailingPunct = segment.match(/[.!?…।॥]+\s*$/)?.[0] ?? "";
        if (trailingPunct && !clause.endsWith(trailingPunct)) {
          clause = `${clause}${trailingPunct}`;
        }
      }
      parts.push(clause);
    }
  }
  return parts.filter((s) => s.trim().length > 0);
}

function isQuestion(clause: string): boolean {
  return clause.trim().endsWith("?");
}

function hasDramaticWord(clause: string): boolean {
  const lower = clause.toLowerCase();
  return DRAMATIC_WORDS.some((w) => lower.includes(w));
}

function isHookClause(clause: string): boolean {
  const lower = clause.toLowerCase();
  return QUESTION_WORDS.some((w) => lower.startsWith(w)) && clause.length < 80;
}

function classifyClause(clause: string): { rate: string; pitch: string; volume: string; pause_ms: number } {
  const wordCount = clause.trim().split(/\s+/).length;
  const dramatic = hasDramaticWord(clause);
  const question = isQuestion(clause);

  if (question) {
    // Mild lift, human questions stay near-flat terminal — no big cadence swing
    return { rate: "+0%", pitch: "+5Hz", volume: "+0%", pause_ms: 160 };
  }
  if (dramatic && wordCount <= 6) {
    // Punchy emphasis — moderate, humans don't over-slow
    return { rate: "-14%", pitch: "-6Hz", volume: "+0%", pause_ms: 280 };
  }
  if (dramatic) {
    return { rate: "-12%", pitch: "-5Hz", volume: "+0%", pause_ms: 220 };
  }
  if (isHookClause(clause)) {
    // Conversational opener — gentle
    return { rate: "-6%", pitch: "+3Hz", volume: "+0%", pause_ms: 160 };
  }
  if (wordCount <= 4) {
    // Short connective — light
    return { rate: "+1%", pitch: "+1Hz", volume: "+0%", pause_ms: 120 };
  }
  if (wordCount >= 18) {
    // Long sentence — slight slowdown for clarity
    return { rate: "-8%", pitch: "+0Hz", volume: "+0%", pause_ms: 160 };
  }
  // Near-human baseline: Madhur single-shot runs ~8-12% fast, -6% lands ~190 wpm.
  return { rate: "-6%", pitch: "+0Hz", volume: "+0%", pause_ms: 120 };
}

export function buildProsodyChunks(text: string): ProsodyChunk[] {
  if (!text.trim()) {
    return [];
  }
  const clauses = splitClauses(text);
  if (clauses.length <= 1) {
    return [{ text, ...classifyClause(text) }];
  }
  return clauses.map((clause) => {
    const prosody = classifyClause(clause);
    return { text: clause, ...prosody };
  });
}

export class EdgeTts {
  static isEdgeVoice(voice: Voices): boolean {
    return Boolean(EDGE_VOICE_MAP[voice]);
  }

  async generate(
    text: string,
    voice: Voices,
  ): Promise<{
    audio: ArrayBuffer;
    audioLength: number;
  }> {
    const edgeVoiceId = EDGE_VOICE_MAP[voice];
    if (!edgeVoiceId) {
      throw new Error(`Voice ${voice} is not an Edge TTS voice`);
    }

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "edge-tts-"));
    const outputPath = path.join(tmpDir, "audio.mp3");
    const specPath = path.join(tmpDir, "spec.json");
    try {
      const chunks = buildProsodyChunks(text);
      const scriptPath = path.join(__dirname, "edge_tts_prosody.py");
      if (!(await fs.access(scriptPath).then(() => true).catch(() => false))) {
        throw new Error(`Edge TTS prosody script not found at ${scriptPath}`);
      }
      await fs.writeFile(
        specPath,
        JSON.stringify({
          voice: edgeVoiceId,
          chunks,
          output: outputPath,
          ffmpeg: ffmpegInstaller.path,
        }),
        "utf-8",
      );

      const { stdout } = await execFileAsync("python3", [scriptPath, specPath], {
        timeout: 120_000,
      });

      let audioLength = 0;
      try {
        const result = JSON.parse(stdout.trim().split("\n").pop() ?? "{}");
        audioLength = Number(result.duration_sec ?? 0);
      } catch {
        logger.warn({ stdout }, "Failed to parse Edge TTS prosody duration");
      }

      const buffer = await fs.readFile(outputPath);
      logger.debug(
        { text, voice: edgeVoiceId, bytes: buffer.length, audioLength, chunkCount: chunks.length },
        "Audio generated with Edge TTS prosody engine",
      );
      return {
        audio: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
        audioLength,
      };
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
