import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { AnalyticsStore } from "./AnalyticsStore";

describe("AnalyticsStore tenant isolation", () => {
  it("isolates analytics upserts and video reads by tenant", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "analytics-isolation-"));
    const store = new AnalyticsStore(base);
    const input = { publishJobId: "publish-1", renderOutputId: "video-1", platform: "youtube" as const, externalId: "external-1", views: 10, likes: 2, shares: 1, comments: 0, fetchedAt: "2026-01-01" };
    const first = await store.upsertForTenant("tenant-first", input);
    const second = await store.upsertForTenant("tenant-second", { ...input, externalId: "external-2" });
    expect((await store.getByVideoForTenant("tenant-first", "video-1")).map((record) => record.id)).toEqual([first.id]);
    expect((await store.listForTenant("tenant-second")).map((record) => record.id)).toEqual([second.id]);
  });

  it("hides legacy unowned analytics from scoped reads", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "analytics-legacy-"));
    const store = new AnalyticsStore(base);
    await fsp.writeFile(path.join(base, "analytics.json"), JSON.stringify([{ id: "legacy", publishJobId: "p", renderOutputId: "v", platform: "youtube", externalId: "e", views: 1, likes: 0, shares: 0, comments: 0, fetchedAt: "2026-01-01", createdAt: "2026-01-01" }]), "utf8");
    expect(await store.getByVideoForTenant("tenant-first", "v")).toEqual([]);
    expect(await store.listForTenant("tenant-first")).toEqual([]);
  });
});

