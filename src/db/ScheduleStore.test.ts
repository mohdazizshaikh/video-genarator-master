import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { ScheduleStore } from "./ScheduleStore";

const scheduleInput = { name: "Tenant schedule", videoId: "video-1", platforms: ["youtube"], categories: ["Tech"], languages: ["en"], engines: { enableTranslation: false, enableCommentCTA: false, enablePlatformPsych: false, enableSeries: false, enableHumanMimicry: false, enableHashtagOptimization: true, enableEngagementOptimization: true }, quality: { targetLUFS: -14, sharpnessLevel: 5, visualQualityTier: "standard" as const }, cronExpression: "0 9 * * *", publishAt: new Date(Date.now() - 1000).toISOString(), status: "active" as const, nextRun: new Date(Date.now() - 1000).toISOString(), metadata: {} };

describe("ScheduleStore tenant isolation", () => {
  it("isolates schedule reads, mutations, stats, and due execution by tenant", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "schedule-isolation-"));
    const store = new ScheduleStore(base);
    const first = await store.createForTenant("tenant-first", scheduleInput);
    const second = await store.createForTenant("tenant-second", { ...scheduleInput, name: "Second schedule" });
    expect((await store.listForTenant("tenant-first")).schedules.map((record) => record.id)).toEqual([first.id]);
    expect(await store.getForTenant("tenant-first", second.id)).toBeUndefined();
    expect(await store.updateForTenant("tenant-first", second.id, { name: "blocked" })).toBeUndefined();
    expect(await store.deleteForTenant("tenant-first", second.id)).toBe(false);
    expect((await store.getDueSchedulesForTenant("tenant-first")).map((record) => record.id)).toEqual([first.id]);
    expect((await store.getStatsForTenant("tenant-first")).total).toBe(1);
    expect((await store.recordRunForTenant("tenant-first", first.id, true))?.runCount).toBe(1);
  });

  it("hides legacy schedules from scoped reads and due execution", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "schedule-legacy-"));
    const store = new ScheduleStore(base);
    await fsp.writeFile(path.join(base, "schedules.json"), JSON.stringify([{ id: "legacy", name: "Legacy", videoId: "v", platforms: [], categories: [], languages: ["en"], engines: {}, quality: {}, cronExpression: "* * * * *", publishAt: new Date(Date.now() - 1000).toISOString(), status: "active", runCount: 0, failureCount: 0, metadata: {}, createdAt: "2026-01-01", updatedAt: "2026-01-01" }]), "utf8");
    expect((await store.listForTenant("tenant-first")).schedules).toEqual([]);
    expect(await store.getDueSchedulesForTenant("tenant-first")).toEqual([]);
    expect(await store.getDueSchedules()).toEqual([]);
  });
});

