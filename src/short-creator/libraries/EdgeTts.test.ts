import { describe, expect, it } from "vitest";
import { buildProsodyChunks, splitClauses } from "./EdgeTts";

describe("splitClauses", () => {
  it("splits on ASCII sentence punctuation followed by whitespace", () => {
    expect(splitClauses("Hello there. How are you? Fine!")).toEqual([
      "Hello there.",
      "How are you?",
      "Fine!",
    ]);
  });

  it("splits on the Devanagari danda so multi-sentence Hindi chunks per sentence", () => {
    const text = "वाराणसी में चुनाव हुए। डॉक्यूमेंट्री को मंजूरी नहीं मिली। क्या सच है?";
    const chunks = splitClauses(text);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toMatch(/हुए।$/);
    expect(chunks[1]).toMatch(/मिली।$/);
    expect(chunks[2]).toBe("क्या सच है?");
  });

  it("returns a single clause when the text ends without a trailing space", () => {
    expect(splitClauses("बस एक वाक्य।")).toEqual(["बस एक वाक्य।"]);
  });

  it("splits trailing comma clauses within a sentence", () => {
    expect(splitClauses("पहले, फिर सब, आखिर में।")).toEqual([
      "पहले",
      "फिर सब",
      "आखिर में।",
    ]);
  });

  it("returns an empty array for blank/whitespace-only input", () => {
    expect(splitClauses("   ")).toEqual([]);
    expect(splitClauses("")).toEqual([]);
  });
});

describe("buildProsodyChunks", () => {
  it("applies the near-human baseline for a single clause", () => {
    const chunks = buildProsodyChunks("वाराणसी लोकसभा चुनाव पर डॉक्यूमेंट्री को सेंसर बोर्ड की मंजूरी नहीं मिली।");
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ rate: "-6%", pitch: "+0Hz", pause_ms: 120 });
  });

  it("assigns a flat+bright prosody to a question clause", () => {
    const chunks = buildProsodyChunks("क्या तुम मुझ से नफरत करते हो?");
    expect(chunks[0]).toMatchObject({ rate: "+0%", pitch: "+5Hz", pause_ms: 160 });
  });

  it("applies per-clause prosody to multi-sentence Hindi", () => {
    const text = "यह सबसे बड़ा secret है! क्या तुम सच में यह मानते हो? वाराणसी में चुनाव हुए।";
    const chunks = buildProsodyChunks(text);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toMatchObject({ rate: "-14%", pitch: "-6Hz", pause_ms: 280 });
    expect(chunks[1]).toMatchObject({ rate: "+0%", pitch: "+5Hz", pause_ms: 160 });
    expect(chunks[2]).toMatchObject({ rate: "+1%", pitch: "+1Hz", pause_ms: 120 });
  });
});