import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { SkipAnalysisEngine } from "./SkipAnalysisEngine";

const skipData = { at3sec: 20, at10sec: 30, at30sec: 40, avgWatchPercent: 80 };

describe("SkipAnalysisEngine tenant isolation", () => {
  it("aggregates only the authenticated tenant's retention data", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "skip-isolation-"));
    const engine = new SkipAnalysisEngine(base);
    engine.recordForTenant("tenant-first", "video-1", "tech", "youtube", skipData);
    engine.recordForTenant("tenant-second", "video-2", "tech", "youtube", { ...skipData, at3sec: 90 });

    expect(engine.analyzeForTenant("tenant-first", "tech", "youtube").sampleCount).toBe(1);
    expect(engine.analyzeForTenant("tenant-first", "tech", "youtube").avgSkipAt3sec).toBe(20);
    expect(engine.getAllForTenant("tenant-second").map((point) => point.videoId)).toEqual(["video-2"]);
  });

  it("does not expose legacy unowned retention records", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "skip-legacy-"));
    fs.writeFileSync(path.join(base, "skip-analysis.json"), JSON.stringify([
      { videoId: "legacy", category: "tech", platform: "youtube", ...skipData, recordedAt: "2026-01-01" },
    ]));
    const engine = new SkipAnalysisEngine(base);

    expect(engine.getAllForTenant("tenant-first")).toEqual([]);
    expect(engine.analyzeForTenant("tenant-first", "tech", "youtube").sampleCount).toBe(0);
  });
});
