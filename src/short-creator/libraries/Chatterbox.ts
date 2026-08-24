import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { VoiceEnum, type Voices } from "../../types/shorts";
import { logger } from "../../logger";

const CHATTERBOX_REFERENCE_CLIP = path.join(
  os.tmpdir(),
  "chatterbox_ref_prabhat_10s.wav",
);

/**
 * Voice -> (language_id, reference clip) mapping for Chatterbox.
 * The reference clip is cloned by Chatterbox to produce the voice timbre.
 */
export const CHATTERBOX_VOICE_MAP: Record<string, { languageId: string; reference: string }> = {
  [VoiceEnum.en_IN_prabhat]: { languageId: "hi", reference: CHATTERBOX_REFERENCE_CLIP },
};

let pythonCommand: string | null = null;

/**
 * Resolve the Python interpreter used to launch the Chatterbox server.
 * Prefers the dedicated venv (with torch + chatterbox installed) via the
 * CHATTERBOX_PYTHON env var, falling back to plain `python3`.
 */
function resolvePython(): string {
  if (pythonCommand) {
    return pythonCommand;
  }
  pythonCommand =
    process.env.CHATTERBOX_PYTHON ||
    path.join(
      process.cwd(),
      "tts-env",
      "bin",
      "python",
    );
  return pythonCommand;
}

type ServerHandle = {
  port: number;
  child: ReturnType<typeof spawn>;
  done: Promise<void>;
};

let serverHandle: ServerHandle | null = null;

function waitForPort(child: ReturnType<typeof spawn>): Promise<number> {
  return new Promise((resolve, reject) => {
    let stdoutBuffer = "";
    const timeout = setTimeout(() => {
      reject(new Error("Timed out waiting for Chatterbox server port"));
    }, 180_000);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutBuffer += chunk.toString();
      const match = stdoutBuffer.match(/PORT=(\d+)/);
      if (match) {
        clearTimeout(timeout);
        resolve(Number(match[1]));
      }
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      const line = chunk.toString().trim();
      if (line) {
        logger.debug({ line }, "Chatterbox server stderr");
      }
    });
    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    child.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Chatterbox server exited early with code ${code}`));
    });
  });
}

async function ensureReferenceClip(): Promise<void> {
  const exists = await fs
    .access(CHATTERBOX_REFERENCE_CLIP)
    .then(() => true)
    .catch(() => false);
  if (!exists) {
    throw new Error(
      `Chatterbox reference clip not found at ${CHATTERBOX_REFERENCE_CLIP}. ` +
        `Generate it first (e.g. via edge-tts en-IN-PrabhatNeural) or set CHATTERBOX_REFERENCE_CLIP.`,
    );
  }
}

async function getServer(): Promise<ServerHandle> {
  if (serverHandle) {
    return serverHandle;
  }
  await ensureReferenceClip();
  const python = resolvePython();
  const scriptPath = path.join(__dirname, "chatterbox_server.py");
  if (!(await fs.access(scriptPath).then(() => true).catch(() => false))) {
    throw new Error(`Chatterbox server script not found at ${scriptPath}`);
  }

  const child = spawn(
    python,
    ["-u", scriptPath, "--device", "cpu", "--reference", CHATTERBOX_REFERENCE_CLIP],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  const port = await waitForPort(child);
  serverHandle = {
    port,
    child,
    done: new Promise((resolve) => {
      child.on("exit", () => resolve());
    }),
  };
  logger.info({ port, python }, "Chatterbox server started");
  return serverHandle;
}

export async function shutdownChatterbox(): Promise<void> {
  if (!serverHandle) {
    return;
  }
  const { port, child } = serverHandle;
  serverHandle = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    await fetch(`http://127.0.0.1:${port}/shutdown`, { signal: controller.signal }).catch(() => undefined);
    clearTimeout(timer);
  } catch {
    child.kill("SIGTERM");
  }
  child.kill("SIGTERM");
}

export class Chatterbox {
  static isChatterboxVoice(voice: Voices): boolean {
    return Boolean(CHATTERBOX_VOICE_MAP[voice]);
  }

  async generate(
    text: string,
    voice: Voices,
  ): Promise<{ audio: ArrayBuffer; audioLength: number }> {
    const mapping = CHATTERBOX_VOICE_MAP[voice];
    if (!mapping) {
      throw new Error(`Voice ${voice} is not a Chatterbox voice`);
    }

    const server = await getServer();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 600_000);
    try {
      const response = await fetch(`http://127.0.0.1:${server.port}/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language_id: mapping.languageId }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Chatterbox synthesis failed: ${response.status} ${body}`);
      }
      const durationUs = Number(response.headers.get("X-Duration-Us") ?? 0);
      const buffer = Buffer.from(await response.arrayBuffer());
      logger.debug(
        { text, voice, bytes: buffer.length, audioLength: durationUs / 1_000_000 },
        "Audio generated with Chatterbox",
      );
      return {
        audio: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
        audioLength: durationUs / 1_000_000,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
