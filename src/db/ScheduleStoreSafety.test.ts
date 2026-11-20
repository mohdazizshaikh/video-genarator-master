import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ScheduleStore } from "./ScheduleStore";
let directory: string;
const input = { name: "Safe schedule", videoId: "", platforms: [], categories: [], languages: ["en"], engines: {}, quality: {}, cronExpression: "0 9 * * *", publishAt: "2099-01-01T09:00:00Z", status: "active", metadata: {} } as Parameters<ScheduleStore["createForTenant"]>[1];
beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), "schedule-integrity-")); });
afterEach(() => { vi.restoreAllMocks(); fs.removeSync(directory); });
it.each(["", "{private-payload", "{}", "[null]", "[[]]", '[{"id":""}]'])("preserves invalid store bytes and refuses reads/writes: %j", async (content) => {
  const store = new ScheduleStore(directory), file = path.join(directory, "schedules.json");
  fs.writeFileSync(file, content); new ScheduleStore(directory);
  await expect(store.list()).rejects.toThrow();
  await expect(store.createForTenant("A", input)).rejects.toThrow();
  await expect(store.delete("any")).rejects.toThrow();
  expect(fs.readFileSync(file, "utf8")).toBe(content);
});
it.each(["duplicate", "counter", "execution", "owner"] as const)("blocks %s corruption without removing the original records", async (kind) => {
  const store = new ScheduleStore(directory), record = await store.createForTenant("A", input), file = path.join(directory, "schedules.json");
  const rows = [record] as Array<Record<string, unknown>>;
  if (kind === "duplicate") rows.push({ ...record, tenantId: "B" });
  if (kind === "counter") rows[0].runCount = -1;
  if (kind === "execution") rows[0].execution = { id: "token", state: "unknown", runCountAtClaim: 0 };
  if (kind === "owner") rows[0].tenantId = "";
  fs.writeJsonSync(file, rows); const before = fs.readFileSync(file);
  await expect(store.getForTenant("A", record.id)).rejects.toThrow("Invalid schedule");
  await expect(store.updateStatus(record.id, "paused")).rejects.toThrow("Invalid schedule");
  expect(fs.readFileSync(file)).toEqual(before);
});
it("keeps prior schedules and removes private staging after replacement failure", async () => {
  const store = new ScheduleStore(directory), record = await store.createForTenant("A", input), file = path.join(directory, "schedules.json"), before = fs.readFileSync(file);
  vi.spyOn(fs, "renameSync").mockImplementation(() => { throw new Error("replace failed"); });
  await expect(store.updateStatusForTenant("A", record.id, "paused")).rejects.toThrow("replace failed");
  expect(fs.readFileSync(file)).toEqual(before);
  expect(fs.readdirSync(directory)).toEqual(["schedules.json"]);
  expect(fs.statSync(file).mode & 0o777).toBe(0o600);
});
