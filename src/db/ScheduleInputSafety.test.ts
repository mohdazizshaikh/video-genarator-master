import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { ScheduleStore } from "./ScheduleStore";

let directory: string;
const input = { name: "Input-safe schedule", videoId: "", platforms: [], categories: [], languages: ["en"], engines: {}, quality: {}, cronExpression: "0 9 * * *", publishAt: "2099-01-01T09:00:00Z", status: "active", metadata: {} } as Parameters<ScheduleStore["createForTenant"]>[1];
beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), "schedule-input-")); });
afterEach(() => { fs.removeSync(directory); });

it("rejects whitespace ownership before writing a schedule that would break subsequent reads", async () => {
  const store = new ScheduleStore(directory), file = path.join(directory, "schedules.json"), before = fs.readFileSync(file);
  await expect(store.createForTenant("  ", input)).rejects.toThrow("tenantId");
  await expect(store.create({ ...input, tenantId: "  " })).rejects.toThrow("workspace");
  expect(fs.readFileSync(file)).toEqual(before);
  expect((await store.list()).total).toBe(0);
});

it.each([
  { name: "  " }, { name: null }, { videoId: 7 }, { platforms: null }, { categories: ["News", 3] }, { languages: [""] },
  { engines: [] }, { engines: { enableTranslation: "false" } }, { quality: null }, { quality: { targetLUFS: NaN } },
  { metadata: [] }, { metadata: { alsoGenerate: { thumbnail: "true" } } }, { metadata: { tags: [5] } },
  { publishAt: new Date("2099-01-01T09:00:00Z") },
])("rejects malformed create and update config without replacing good bytes: %j", async (patch) => {
  const store = new ScheduleStore(directory), record = await store.createForTenant("A", input), file = path.join(directory, "schedules.json"), before = fs.readFileSync(file);
  await expect(store.createForTenant("A", { ...input, ...patch } as typeof input)).rejects.toThrow();
  await expect(store.updateForTenant("A", record.id, patch as Parameters<ScheduleStore["updateForTenant"]>[2])).rejects.toThrow();
  expect(fs.readFileSync(file)).toEqual(before);
  expect((await store.getForTenant("A", record.id))?.name).toBe(input.name);
});

it("does not persist caller-supplied execution receipts, counters or timing markers on create/update", async () => {
  const store = new ScheduleStore(directory);
  const forged = { ...input, id: "forged-id", tenantId: "B", createdAt: "forged-date", runCount: 99, failureCount: 99, execution: { id: "forged", state: "completed", runCountAtClaim: 0 }, lastOutput: { recordedAt: "fake", state: "assets-persisted", artifacts: [] }, lastRun: "fake", timingVariationApplied: true, nextRun: "2000-01-01" };
  const record = await store.createForTenant("A", forged as typeof input);
  await store.updateForTenant("A", record.id, forged as Parameters<ScheduleStore["updateForTenant"]>[2]);
  expect(await store.getForTenant("A", record.id)).toMatchObject({ id: record.id, tenantId: "A", createdAt: record.createdAt, runCount: 0, failureCount: 0, nextRun: "2099-01-01T09:00:00.000Z" });
  const stored = fs.readJsonSync(path.join(directory, "schedules.json"))[0];
  for (const key of ["execution", "lastOutput", "lastRun", "timingVariationApplied"]) expect(stored).not.toHaveProperty(key);
});

it("preserves readable ownerless legacy rows during a valid owned create and update", async () => {
  const store = new ScheduleStore(directory), owned = await store.createForTenant("A", input), file = path.join(directory, "schedules.json");
  const legacy = { ...owned, id: "legacy", tenantId: undefined, privateLegacyField: "preserve" };
  fs.writeJsonSync(file, [legacy, owned]);
  await store.createForTenant("B", input);
  await store.updateForTenant("A", owned.id, { name: "Changed" });
  expect(fs.readJsonSync(file)[0]).toMatchObject({ id: "legacy", privateLegacyField: "preserve" });
  expect((await store.listForTenant("A")).total).toBe(1);
});
