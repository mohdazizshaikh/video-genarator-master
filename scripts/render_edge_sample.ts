/**
 * Render reference scenes through the real EdgeTts prosody engine and save WAVs.
 * Run: npx ts-node -T scripts/render_edge_sample.ts [outdir]
 */
import { promises as fs } from "node:fs";
import { EdgeTts } from "../src/short-creator/libraries/EdgeTts";
import { VoiceEnum } from "../src/types/shorts";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const OUTDIR = process.argv[2] ?? "voice-analysis/renders";

const TEXTS: Array<[string, string]> = [
  ["q_question", "क्या तुम मुझ से नफरत करते हो?"],
  ["plain_long", "इतालवी भाषा में उच्चारण करना तुलनात्मक रूप से आसान है क्योंकि ज़्यादातर शब्दों का उच्चारण वैसे ही किया जाता है जैसे उन्हें लिखा जाता है।"],
  ["dramatic_short", "यह आदमी झूठ बोल रहा है!"],
  ["news_statement", "वाराणसी लोकसभा चुनाव पर डॉक्यूमेंट्री को सेंसर बोर्ड की मंजूरी नहीं मिली।"],
  ["hook_hindi", "क्या आप जानते हैं यह सच्चाई क्या है?"],
];
const VOICES: Array<[string, string]> = [
  ["madhur", VoiceEnum.hi_IN_madhur],
  ["swara", VoiceEnum.hi_IN_swara],
];

async function main() {
  await fs.mkdir(OUTDIR, { recursive: true });
  for (const [vid, voice] of VOICES) {
    const edge = new EdgeTts();
    for (const [tag, text] of TEXTS) {
      const res = await edge.generate(text, voice as any);
      const base = `${OUTDIR}/${vid}_${tag}`;
      await fs.writeFile(`${base}.mp3`, Buffer.from(res.audio));
      await execFileAsync(ffmpegInstaller.path, ["-y", "-i", `${base}.mp3`, "-ac", "1", "-ar", "16000", `${base}.wav`]);
      console.log(`${vid}/${tag} duration=${res.audioLength}s chunks-done`);
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });