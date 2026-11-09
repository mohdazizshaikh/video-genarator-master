import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CustomNewsSourceStore } from "./CustomNewsSourceStore";
import { ContentAutomationRuleStore } from "./ContentAutomationRuleStore";

let directory: string;
beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), "source-store-safety-")); });
afterEach(() => { vi.restoreAllMocks(); fs.removeSync(directory); });
const source = { name: "Private source", url: "https://example.com/Feed?Key=A", category: "Tech", tenantId: "a" };
const rule = { tenantId: "a", name: "Rule", sourceIds: ["source"], category: "Tech", niche: "news", platform: "youtube", tone: "plain", videoType: "short" as const, enabled: true, maxDraftsPerTick: 1 };

it.each(["{broken", "", "{}", "[null]", "[[]]"])("preserves invalid files during reads, construction and rejected mutations: %j", async (content) => {
  const sources = new CustomNewsSourceStore(directory);
  const rules = new ContentAutomationRuleStore(directory);
  const sourceFile = path.join(directory, "customNewsSources.json");
  const ruleFile = path.join(directory, "contentAutomationRules.json");
  fs.writeFileSync(sourceFile, content);
  fs.writeFileSync(ruleFile, content);
  new CustomNewsSourceStore(directory);
  new ContentAutomationRuleStore(directory);
  expect(() => sources.listSync("a")).toThrow("Invalid JSON array store");
  await expect(sources.add(source)).rejects.toThrow("Invalid JSON array store");
  expect(() => rules.create(rule)).toThrow("Invalid JSON array store");
  expect(() => rules.setEnabled("a", "missing", false)).toThrow("Invalid JSON array store");
  expect(fs.readFileSync(sourceFile, "utf-8")).toBe(content);
  expect(fs.readFileSync(ruleFile, "utf-8")).toBe(content);
});

it("limits URL duplicates to their owner and preserves case-sensitive paths and queries", async () => {
  const store = new CustomNewsSourceStore(directory);
  await store.add(source);
  await store.add({ ...source, tenantId: "b" });
  await store.add({ ...source, url: "https://example.com/feed?Key=A" });
  await store.add({ ...source, url: "https://example.com/Feed?Key=a" });
  await expect(store.add({ ...source, url: "https://EXAMPLE.com:443/Feed?Key=A#fragment" })).rejects.toThrow("Source already exists");
  expect(store.listSync("a")).toHaveLength(3);
  expect(store.listSync("b")).toHaveLength(1);
});

it("retains independent instance writes and unique IDs within one process", async () => {
  const first = new CustomNewsSourceStore(directory), second = new CustomNewsSourceStore(directory);
  const records = await Promise.all([first.add(source), second.add({ ...source, tenantId: "b" })]);
  expect(new Set(records.map((record) => record.id)).size).toBe(2);
  expect(first.listSync()).toHaveLength(2);
  const rules = new ContentAutomationRuleStore(directory), other = new ContentAutomationRuleStore(directory);
  const created = rules.create(rule);
  other.create({ ...rule, tenantId: "b" });
  rules.setEnabled("a", created.id, false);
  expect(other.listForTenant("b")).toHaveLength(1);
  expect(other.listEnabled()).toHaveLength(1);
  expect(fs.readdirSync(directory).filter((file) => file.endsWith(".tmp"))).toEqual([]);
});

it("preserves existing records and removes temporary files when replacement fails", async () => {
  const store = new CustomNewsSourceStore(directory);
  await store.add(source);
  const file = path.join(directory, "customNewsSources.json");
  const original = fs.readFileSync(file, "utf-8");
  vi.spyOn(fs, "renameSync").mockImplementation(() => { throw new Error("replacement failed"); });
  await expect(store.add({ ...source, tenantId: "b" })).rejects.toThrow("replacement failed");
  expect(fs.readFileSync(file, "utf-8")).toBe(original);
  expect(fs.readdirSync(directory).filter((entry) => entry.endsWith(".tmp"))).toEqual([]);
});
