import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { HumanEditorialEngine } from "./HumanEditorialEngine";

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) fs.removeSync(dir); });
function makeEngine() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "human-editorial-"));
  dirs.push(dir);
  return new HumanEditorialEngine(dir);
}

describe("HumanEditorialEngine", () => {
  it("requires source evidence for factual categories", () => {
    const review = makeEngine().review({
      tenantId: "t1", category: "News", title: "A factual update",
      script: "This is a factual update.",
    });
    expect(review.decision).toBe("needs_revision");
    expect(review.sourceCoverage.passed).toBe(false);
  });

  it("registers clean candidates and flags the same tenant's next attempt", () => {
    const engine = makeEngine();
    const input = {
      tenantId: "t1", category: "IT Services", title: "Build a secure web platform",
      script: "A practical overview of a secure web platform.",
      sources: [{ url: "https://example.com/facts" }],
      mediaAssetIds: ["a", "b"],
      captionLines: ["Build a secure web platform", "Review the workflow", "Choose the next step"],
      hasAudio: true, durationSeconds: 30, videoType: "short" as const,
      visualQualityScore: 90, audioQualityScore: 90,
    };
    const first = engine.review(input);
    const second = engine.review(input);
    expect(first.decision).toBe("ready_for_human_review");
    expect(second.decision).toBe("needs_revision");
    expect(second.duplication.isDuplicate).toBe(true);
  });

  it("flags repeated media and repeated caption lines for revision", () => {
    const review = makeEngine().review({
      tenantId: "t1", category: "Motivation", title: "Keep learning",
      script: "Keep learning. Keep learning. Keep learning.",
      mediaAssetIds: ["a", "a"],
      captionLines: ["Keep learning", "Keep learning", "Keep learning"],
      hasAudio: true, durationSeconds: 20, videoType: "short",
    });
    expect(review.decision).toBe("needs_revision");
    expect(review.originality.repeatedMediaCount).toBe(1);
    expect(review.originality.repeatedLineRatio).toBeGreaterThan(0.2);
  });
});
