import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ContentFreshnessEngine } from "./ContentFreshnessEngine";
let directory: string;
beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), "freshness-safety-")); });
afterEach(() => { vi.restoreAllMocks(); fs.removeSync(directory); });
it.each(["", "{private-broken", "{}", "[null]", '[{"keyword":"x"}]'])("preserves invalid data and refuses checks/writes: %j", (content) => {
  const engine = new ContentFreshnessEngine(directory), file = path.join(directory, "freshness-records.json");
  fs.writeFileSync(file, content);
  new ContentFreshnessEngine(directory);
  expect(() => engine.check("topic", "News")).toThrow();
  expect(() => engine.record("topic", "News")).toThrow();
  expect(() => engine.getRecentByCategory("News")).toThrow();
  expect(fs.readFileSync(file, "utf8")).toBe(content);
});
it("reloads independent writers and readers instead of losing cooldown history", () => {
  const first = new ContentFreshnessEngine(directory), second = new ContentFreshnessEngine(directory);
  first.record("ONE", "News"); second.record("Two", "News"); first.record("One", "News");
  expect(second.check("One", "News").allowed).toBe(false);
  expect(second.getRecentByCategory("News")).toHaveLength(2);
  expect(second.getRecentByCategory("News").find((row) => row.keyword === "one")?.useCount).toBe(2);
});
it("preserves prior bytes and cleans staging after a failed replacement", () => {
  const engine = new ContentFreshnessEngine(directory), file = path.join(directory, "freshness-records.json");
  engine.record("One", "News"); const before = fs.readFileSync(file);
  vi.spyOn(fs, "renameSync").mockImplementation(() => { throw new Error("replacement failed"); });
  expect(() => engine.record("Two", "News")).toThrow("replacement failed");
  expect(fs.readFileSync(file)).toEqual(before);
  expect(fs.readdirSync(directory)).toEqual(["freshness-records.json"]);
  expect(fs.statSync(file).mode & 0o777).toBe(0o600);
});
