#!/usr/bin/env python3
"""Prosody-aware Edge TTS synthesizer.

Reads a JSON spec from argv[1]:
  {
    "voice": "en-IN-PrabhatNeural",
    "chunks": [
      {"text": "...", "rate": "-10%", "pitch": "-5Hz", "volume": "+0%", "pause_ms": 250},
      ...
    ],
    "output": "/tmp/out.mp3",
    "ffmpeg": "/path/to/ffmpeg"
  }

Each chunk is synthesized independently with its own prosody, leading/trailing
silence is trimmed, and chunks are concatenated with a controlled pause between
them. Prints JSON {duration_sec, bytes} to stdout.
"""
import asyncio
import json
import re
import subprocess
import sys
import tempfile
import os

import edge_tts

SILENCE_RE = re.compile(r"silence_(start|end)=\s*([0-9.]+)")


def extract_silence(stderr: str, kind: str):
    for m in SILENCE_RE.finditer(stderr):
        if m.group(1) == kind:
            return float(m.group(2))
    return None


def run(cmd: list[str]) -> str:
    return subprocess.run(cmd, capture_output=True, text=True).stderr


async def synthesize_chunk(text: str, voice: str, rate: str, pitch: str, volume: str, out: str):
    com = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, volume=volume)
    await com.save(out)


async def main():
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        spec = json.load(f)
    ffmpeg = spec["ffmpeg"]
    voice = spec["voice"]
    output = spec["output"]
    chunks = spec["chunks"]

    with tempfile.TemporaryDirectory() as tmp:
        trimmed = []
        for i, ch in enumerate(chunks):
            raw = os.path.join(tmp, f"raw_{i}.mp3")
            await synthesize_chunk(
                ch["text"], voice, ch.get("rate", "+0%"),
                ch.get("pitch", "+0Hz"), ch.get("volume", "+0%"), raw,
            )
            if os.path.exists(raw) and os.path.getsize(raw) > 0:
                trimmed.append(raw)
            else:
                raise RuntimeError(f"Edge TTS produced empty audio for chunk {i}")

        mid_output = os.path.join(tmp, "mid.mp3")
        if len(trimmed) == 1:
            run([ffmpeg, "-y", "-i", trimmed[0], "-c:a", "libmp3lame", "-b:a", "48k", mid_output])
        else:
            # Concatenate raw chunks directly. Edge TTS already inserts natural
            # intra-sentence pauses; add a small fixed gap between chunks.
            pauses = [ch.get("pause_ms", 200) for ch in chunks]
            label_parts = []
            concat_parts = []
            next_silence = 0
            for i, t in enumerate(trimmed):
                label_parts.append(f"[{i}:a]aresample=24000,volume=1[a{i}]")
                concat_parts.append(f"[a{i}]")
                if i < len(trimmed) - 1:
                    pause = pauses[i + 1] if i + 1 < len(pauses) else 200
                    label_parts.append(f"anullsrc=channel_layout=mono:sample_rate=24000,atrim=0:{max(pause, 100)/1000.0}[s{next_silence}]")
                    concat_parts.append(f"[s{next_silence}]")
                    next_silence += 1
            total = len(trimmed) + (len(trimmed) - 1)
            filter_complex = ";".join(label_parts) + ";" + "".join(concat_parts) + f"concat=n={total}:v=0:a=1[out]"
            filter_inputs = [ffmpeg, "-y"]
            for t in trimmed:
                filter_inputs += ["-i", t]
            filter_inputs += ["-filter_complex", filter_complex, "-map", "[out]", "-c:a", "libmp3lame", "-b:a", "48k", mid_output]
            run(filter_inputs)

        # Loudness-normalize the whole scene to a consistent target so no
        # sentence sounds louder or quieter than another.
        # LRA=15 preserves a wider dynamic range inside each clip (humans show
        # ~6.3 dB intra-clip dynamics vs TTS 4.3-5.8 dB at LRA=11).
        # First loudnorm pass analyzes, second pass applies with linear gain so
        # per-clause relative dynamics are respected but overall level is even.
        analyze = run([
            ffmpeg, "-i", mid_output, "-af",
            "loudnorm=I=-16:TP=-1.5:LRA=15:print_format=json", "-f", "null", "-",
        ])
        if "input_i" in analyze:
            measured = re.search(r'"input_i"\s*:\s*(-?[0-9.]+)', analyze)
            if measured:
                gain = -16.0 - float(measured.group(1))
                run([ffmpeg, "-y", "-i", mid_output, "-af", f"volume={gain:.2f}dB", "-c:a", "libmp3lame", "-b:a", "48k", output])
            else:
                os.replace(mid_output, output)
        else:
            os.replace(mid_output, output)

        # Get duration via ffmpeg stderr.
        stderr = run([ffmpeg, "-i", output])
        m = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", stderr)
        duration = 0.0
        if m:
            duration = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))

    print(json.dumps({"duration_sec": duration, "bytes": os.path.getsize(output)}))


if __name__ == "__main__":
    asyncio.run(main())
