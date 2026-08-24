import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { ThrottlingEngine } from "./ThrottlingEngine";

describe("ThrottlingEngine tenant quota isolation", () => {
  it("keeps usage and plan state keyed to the owning tenant", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "throttle-isolation-"));
    const engine = new ThrottlingEngine(base);

    engine.check("tenant-first", "video", "pro");
    engine.setPlan("tenant-second", "enterprise");

    expect(engine.getQuota("tenant-first")?.plan).toBe("pro");
    expect(engine.getQuota("tenant-first")?.usage.videosThisDay).toBe(1);
    expect(engine.getQuota("tenant-second")?.plan).toBe("enterprise");
    expect(engine.getQuota("tenant-second")?.usage.videosThisDay).toBe(0);
  });

  it("does not create or expose a quota for an empty tenant identifier", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "throttle-empty-"));
    const engine = new ThrottlingEngine(base);
    expect(engine.getQuota("")).toBeUndefined();
    expect(engine.getAllQuotas()).toHaveLength(0);
  });
});
