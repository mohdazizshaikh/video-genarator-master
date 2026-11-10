import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Config } from "../../config";
import type { ShortCreator } from "../../short-creator/ShortCreator";
import { ScheduleStore } from "../../db/ScheduleStore";
import { ScheduleRouter } from "./schedule";
import { dispatch } from "../testing/dispatch";

let directory: string;
let service: ScheduleRouter;
let store: ScheduleStore;
const owner = { tenantId: "owner" };
const input = { name: "Daily content", platforms: ["youtube"], categories: ["Tech"], publishAt: "2026-10-25T09:00:00Z", cronExpression: "0 9 * * *" };
const enqueue = vi.fn(() => "video-id");
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "schedule-runner-"));
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-25T09:00:00Z"));
  enqueue.mockClear();
  service = new ScheduleRouter({ dataDirPath: directory } as Config);
  service.setShortCreator({ addToQueue: enqueue } as unknown as ShortCreator);
  store = new ScheduleStore(directory);
});
afterEach(() => { service.stop(); vi.useRealTimers(); vi.restoreAllMocks(); fs.removeSync(directory); });
async function create(fields: Record<string, unknown> = {}, auth = owner) {
  const response = await dispatch(service.router, "POST", "/", { auth, body: { ...input, ...fields } });
  expect(response.status).toBe(201);
  return (response.body as { schedule: { id: string } }).schedule.id;
}
describe("schedule runner recurrence integration", () => {
  it("runs a due schedule once and does not rerun every subsequent minute", async () => {
    const id = await create();
    await vi.advanceTimersByTimeAsync(3 * 60000);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0][4]).toBe("owner");
    expect(await store.getForTenant("owner", id)).toMatchObject({ runCount: 0, nextRun: "2026-10-25T09:00:00.000Z", execution: { pendingOutput: { state: "video-queued" } } });
    expect(await store.getDueSchedules()).toEqual([]);
  });
  it("requires workspace ownership and preserves server scheduling fields", async () => {
    expect((await dispatch(service.router, "POST", "/", { body: input })).status).toBe(401);
    const id = await create();
    const patched = await dispatch(service.router, "PATCH", `/${id}`, { auth: owner, body: { id: "forged", tenantId: "other", runCount: 600, nextRun: "2000-01-01", name: "Renamed" } });
    expect(patched.status).toBe(200);
    expect(await store.getForTenant("owner", id)).toMatchObject({ id, name: "Renamed", runCount: 0, nextRun: "2026-10-25T09:00:00.000Z" });
    expect((await dispatch(service.router, "POST", `/${id}/run`, { auth: { tenantId: "other" } })).status).toBe(404);
    expect(enqueue).not.toHaveBeenCalled();
  });
  it("rejects invalid recurrence dates, cron and timezone with 400", async () => {
    for (const fields of [{ publishAt: "not-a-date" }, { cronExpression: "nonsense" }, { timezone: "not/a/timezone" }]) {
      expect((await dispatch(service.router, "POST", "/", { auth: owner, body: { ...input, ...fields } })).status).toBe(400);
    }
    expect((await store.listForTenant("owner")).total).toBe(0);
  });
  it("avoids duplicate execution during overlapping manual requests", async () => {
    const id = await create();
    const results = await Promise.all([dispatch(service.router, "POST", `/${id}/run`, { auth: owner }), dispatch(service.router, "POST", `/${id}/run`, { auth: owner })]);
    expect(results.map((res) => (res.body as { success: boolean }).success).sort()).toEqual([false, true]);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect((await store.get(id))?.runCount).toBe(0);
  });
  it("persists one timing deferral across restart and does not randomize again", async () => {
    const id = await create({ engines: { enableHumanMimicry: true } });
    vi.spyOn(service as unknown as { deterministicRandom(seed: number): number }, "deterministicRandom").mockReturnValue(0.9);
    await vi.advanceTimersByTimeAsync(60000);
    expect(enqueue).not.toHaveBeenCalled();
    expect(await store.get(id)).toMatchObject({ nextRun: "2026-10-25T09:37:00.000Z", timingVariationApplied: true, runCount: 0 });
    service.stop();
    service = new ScheduleRouter({ dataDirPath: directory } as Config);
    service.setShortCreator({ addToQueue: enqueue } as unknown as ShortCreator);
    await vi.advanceTimersByTimeAsync(37 * 60000);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(await store.get(id)).toMatchObject({ runCount: 0, nextRun: "2026-10-25T09:37:00.000Z", execution: { pendingOutput: { state: "video-queued" } } });
  });
  it("respects pause while a deferred occurrence is pending", async () => {
    const id = await create({ engines: { enableHumanMimicry: true } });
    vi.spyOn(service as unknown as { deterministicRandom(seed: number): number }, "deterministicRandom").mockReturnValue(0.9);
    await vi.advanceTimersByTimeAsync(60000);
    await store.updateStatusForTenant("owner", id, "paused");
    await vi.advanceTimersByTimeAsync(40 * 60000);
    expect(enqueue).not.toHaveBeenCalled();
  });
  it("keeps a due occurrence available until the renderer becomes ready", async () => {
    service.stop();
    service = new ScheduleRouter({ dataDirPath: directory } as Config);
    const id = await create();
    await vi.advanceTimersByTimeAsync(60000);
    expect(await store.get(id)).toMatchObject({ runCount: 0, failureCount: 0, nextRun: "2026-10-25T09:00:00.000Z" });
    expect((await store.get(id))?.execution).toBeUndefined();
    service.setShortCreator({ addToQueue: enqueue } as unknown as ShortCreator);
    await vi.advanceTimersByTimeAsync(60000);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect((await store.get(id))?.execution?.pendingOutput?.state).toBe("video-queued");
  });
  it("keeps freshness decisions separate for two owners using the same topic", async () => {
    await create();
    await create({}, { tenantId: "other" });
    await vi.advanceTimersByTimeAsync(60000);
    expect(enqueue).toHaveBeenCalledTimes(2);
  });
});
