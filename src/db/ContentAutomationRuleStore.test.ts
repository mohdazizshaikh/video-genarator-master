import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ContentAutomationRuleStore } from "./ContentAutomationRuleStore";

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) fs.removeSync(dir); });

describe("ContentAutomationRuleStore", () => {
  it("keeps rules tenant-scoped and clamps per-tick draft limits", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "automation-rules-"));
    dirs.push(dir);
    const store = new ContentAutomationRuleStore(dir);
    const rule = store.create({
      tenantId: "tenant-a", name: "Aaditech technology feed", sourceIds: ["bbc", "bbc"],
      category: "Technology", niche: "IT products", platform: "youtube_shorts", tone: "informative",
      videoType: "short", enabled: true, maxDraftsPerTick: 99,
    });
    expect(rule.sourceIds).toEqual(["bbc"]);
    expect(rule.maxDraftsPerTick).toBe(10);
    expect(store.listForTenant("tenant-a")).toHaveLength(1);
    expect(store.listForTenant("tenant-b")).toEqual([]);
    expect(store.listEnabled().map((item) => item.tenantId)).toEqual(["tenant-a"]);
    expect(store.setEnabled("tenant-b", rule.id, false)).toBeUndefined();
    expect(store.setEnabled("tenant-a", rule.id, false)?.enabled).toBe(false);
    expect(store.listEnabled()).toEqual([]);
  });
});
