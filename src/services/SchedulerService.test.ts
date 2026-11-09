import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { SchedulerService } from "./SchedulerService";
import { ContentAutomationRuleStore } from "../db/ContentAutomationRuleStore";
import type { Config } from "../config";
import type { ShortCreator } from "../short-creator/ShortCreator";
import { renderConfig } from "../types/shorts";

let directory: string;
let service: SchedulerService;
const params = { tenantId: "a", sceneInput: [{ text: "hello", searchTerms: ["a"], language: "en" }], config: renderConfig.parse({}), orientation: "portrait", category: "World", videoType: "short" as const, subtitleLanguage: "en", namingKey: "same" };
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "scheduler-service-"));
  service = new SchedulerService({ redisEnabled: false, dataDirPath: directory, cronInterval: "*/30 * * * *" } as Config, {} as ShortCreator);
});
afterEach(async () => { await service.close(); vi.restoreAllMocks(); fs.removeSync(directory); });
describe("SchedulerService in-flight and shutdown guards", () => {
  it("rejects duplicate category-slot enqueue requests only inside the same workspace", async () => {
    const first = service.enqueueRenderJob(params);
    await expect(service.enqueueRenderJob({ ...params, namingKey: "second" })).rejects.toThrow("Duplicate in-flight category slot");
    const other = service.enqueueRenderJob({ ...params, tenantId: "b" });
    const ids = await Promise.all([first, other]);
    expect(ids[0]).not.toBe(ids[1]);
  });
  it("keeps an empty source-driven tick review-safe", async () => {
    await expect(service.runOnce()).resolves.toEqual({ rules: 0, drafts: 0, skipped: 0 });
  });
  it("waits for an active source task and skips further rules after stop", async () => {
    const rules = new ContentAutomationRuleStore(directory);
    const rule = { tenantId: "a", name: "Test", sourceIds: ["bbc"], category: "Tech", niche: "tech", platform: "youtube", tone: "neutral", videoType: "short" as const, enabled: true, maxDraftsPerTick: 1 };
    rules.create(rule); rules.create({ ...rule, name: "Second" });
    let release!: () => void;
    const process = vi.spyOn(service as unknown as { processRule(): Promise<{ drafts: number; skipped: number }> }, "processRule").mockImplementation(() => new Promise((resolve) => { release = () => resolve({ drafts: 0, skipped: 0 }); }));
    const tick = service.runOnce();
    let closed = false;
    const close = service.close().then(() => { closed = true; });
    expect(closed).toBe(false);
    release(); await tick; await close;
    expect(process).toHaveBeenCalledTimes(1);
    expect(closed).toBe(true);
    await expect(service.enqueueRenderJob(params)).rejects.toThrow("shutting down");
    await expect(service.runOnce()).resolves.toEqual({ rules: 0, drafts: 0, skipped: 0 });
  });
});
