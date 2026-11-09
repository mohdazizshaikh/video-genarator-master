import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScheduleStore, type ScheduleRecord } from "./ScheduleStore";

let directory: string;
let store: ScheduleStore;
const input = { name: "Daily generation", videoId: "", platforms: [], categories: [], languages: ["en"], engines: {}, quality: {}, cronExpression: "0 9 * * *", publishAt: "2026-10-24T09:00:00Z", status: "active", metadata: {} } as Parameters<ScheduleStore["createForTenant"]>[1];
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "schedule-recurrence-"));
  store = new ScheduleStore(directory);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-25T10:00:00Z"));
});
afterEach(() => { vi.useRealTimers(); fs.removeSync(directory); });
describe("persisted recurrence and due selection", () => {
  it("advances from completion and uses nextRun after a missed occurrence", async () => {
    const schedule = await store.createForTenant("a", input);
    expect(await store.getDueSchedulesForTenant("a")).toHaveLength(1);
    const run = await store.recordRunForTenant("a", schedule.id, true);
    expect(run).toMatchObject({ runCount: 1, nextRun: "2026-10-26T09:00:00.000Z", lastRun: "2026-10-25T10:00:00.000Z", timezone: "UTC" });
    expect(await store.getDueSchedules()).toEqual([]);
    vi.setSystemTime(new Date("2026-10-26T09:00:00Z"));
    expect(await store.getDueSchedules()).toHaveLength(1);
  });
  it("waits for the next cron occurrence after a failed run", async () => {
    const schedule = await store.createForTenant("a", { ...input, cronExpression: "0 9 * * MON" });
    expect(await store.recordRunForTenant("a", schedule.id, false)).toMatchObject({ runCount: 1, failureCount: 1, status: "active", nextRun: "2026-10-26T09:00:00.000Z" });
    expect(await store.getDueSchedules()).toEqual([]);
  });
  it.each([true, false])("finishes a one-shot after success=%s without another due run", async (success) => {
    const schedule = await store.createForTenant("a", { ...input, recurrence: "once", cronExpression: "" });
    const record = await store.recordRunForTenant("a", schedule.id, success);
    expect(record).toMatchObject({ status: success ? "completed" : "failed", runCount: 1 });
    expect(record?.nextRun).toBeUndefined();
    vi.setSystemTime(new Date("2026-11-25T10:00:00Z"));
    expect(await store.getDueSchedules()).toEqual([]);
  });
  it("updates recurrence after execution and resets first time only when requested", async () => {
    const schedule = await store.createForTenant("a", input);
    await store.recordRunForTenant("a", schedule.id, true);
    const updated = await store.updateForTenant("a", schedule.id, { timezone: "Asia/Kolkata" });
    expect(updated?.nextRun).toBe("2026-10-26T03:30:00.000Z");
    expect((await store.updateForTenant("a", schedule.id, { publishAt: "2026-10-27T00:00:00Z" }))?.nextRun).toBe("2026-10-27T00:00:00.000Z");
  });
  it("preserves counters across interleaved store instances", async () => {
    const schedule = await store.createForTenant("a", input);
    const second = new ScheduleStore(directory);
    await Promise.all([store.recordRunForTenant("a", schedule.id, true), second.recordRunForTenant("a", schedule.id, false)]);
    expect(await store.get(schedule.id)).toMatchObject({ runCount: 2, failureCount: 1 });
  });
  it("rejects invalid dates/cron/timezones without modifying the file", async () => {
    for (const update of [{ publishAt: "not-a-date" }, { cronExpression: "invalid" }, { timezone: "not/a/timezone" }]) {
      const before = fs.readFileSync(path.join(directory, "schedules.json"), "utf8");
      await expect(store.createForTenant("a", { ...input, ...update })).rejects.toThrow();
      expect(fs.readFileSync(path.join(directory, "schedules.json"), "utf8")).toBe(before);
    }
  });
  it("never resets malformed schedule storage", async () => {
    const file = path.join(directory, "schedules.json");
    fs.writeFileSync(file, "{broken");
    await expect(store.createForTenant("a", input)).rejects.toThrow();
    expect(fs.readFileSync(file, "utf8")).toBe("{broken");
  });
  it("uses persisted legacy nextRun and quarantines ownerless records", async () => {
    const created = await store.createForTenant("a", input);
    const records: ScheduleRecord[] = [{ ...created, runCount: 3, nextRun: "2026-10-26T09:00:00Z", timezone: undefined, recurrence: undefined }, { ...created, id: "legacy", tenantId: undefined }];
    fs.writeJsonSync(path.join(directory, "schedules.json"), records);
    expect(await store.getDueSchedules()).toEqual([]);
    expect((await store.recordRun(created.id, true))?.nextRun).toBe("2026-10-26T09:00:00.000Z");
  });
});
