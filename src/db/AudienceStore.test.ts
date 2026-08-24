import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { AudienceStore } from "./AudienceStore";

describe("AudienceStore tenant isolation", () => {
  it("lists only the authenticated tenant’s audience targets", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "audience-isolation-"));
    const store = new AudienceStore(base);
    await store.add({ tenantId: "tenant-first", category: "Tech", location: "US", ageGroup: "25-34", interests: ["AI"], score: 80 });
    await store.add({ tenantId: "tenant-second", category: "Finance", location: "UK", ageGroup: "35-44", interests: ["Markets"], score: 90 });
    expect((await store.listForTenant("tenant-first")).map((record) => record.category)).toEqual(["Tech"]);
    expect((await store.listForTenant("tenant-second")).map((record) => record.category)).toEqual(["Finance"]);
  });

  it("hides legacy unowned audience targets from scoped reads", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "audience-legacy-"));
    const store = new AudienceStore(base);
    await fsp.writeFile(path.join(base, "audienceTargets.json"), JSON.stringify([{ id: "legacy", category: "General", location: "Global", ageGroup: "all", interests: [], score: 1, createdAt: "2026-01-01" }]), "utf8");
    expect(await store.listForTenant("tenant-first")).toEqual([]);
  });
});

