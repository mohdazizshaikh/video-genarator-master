import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ApprovalEngine } from "./ApprovalEngine";

const tempDirs: string[] = [];
afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.removeSync(dir);
});

describe("ApprovalEngine human gate", () => {
  it("keeps an item pending when automated checks pass", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "approval-human-gate-"));
    tempDirs.push(dir);
    const engine = new ApprovalEngine(dir);
    const item = engine.submit("tenant-a", "content-a", "video", "Follow this practical guide", "system");
    const checked = engine.autoCheck("tenant-a", item.id, "Follow this practical guide");
    expect(checked.status).toBe("pending");
    expect(checked.reviewedBy).toBeUndefined();
    expect(checked.comments).toContain("human approval");
  });

  it("rejects human approval until required checks are passed", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "approval-human-gate-"));
    tempDirs.push(dir);
    const engine = new ApprovalEngine(dir);
    const item = engine.submit("tenant-a", "content-a", "video", "A factual video", "system");
    expect(() => engine.review("tenant-a", item.id, "approved", "owner")).toThrow("Required approval checks");
  });

  it("allows human approval after required checks are explicitly recorded", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "approval-human-gate-"));
    tempDirs.push(dir);
    const engine = new ApprovalEngine(dir);
    const item = engine.submit("tenant-a", "content-a", "video", "A factual video", "system");
    engine.updateChecklist("tenant-a", item.id, { no_hate_speech: true, no_explicit: true, no_misleading: true, copyright_clear: true });
    const approved = engine.review("tenant-a", item.id, "approved", "owner", "Reviewed source and render");
    expect(approved.status).toBe("approved");
    expect(approved.reviewedBy).toBe("owner");
  });
});
