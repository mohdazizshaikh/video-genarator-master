import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { RenderJobStore } from "./RenderJobStore";

describe("RenderJobStore tenant isolation", () => {
  const createParams = (tenantId: string, namingKey: string) => ({
    tenantId,
    scriptPlanId: "",
    videoType: "short" as const,
    language: "en",
    subtitleLanguage: "en",
    orientation: "portrait" as const,
    category: "tech",
    namingKey,
  });

  it("does not expose or mutate another tenant's render job", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "render-job-isolation-"));
    const store = new RenderJobStore(base);
    const first = await store.create(createParams("tenant-first", "first-key"));
    const second = await store.create(createParams("tenant-second", "second-key"));

    expect((await store.listForTenant("tenant-first")).map((job) => job.id)).toEqual([first.id]);
    expect(await store.getForTenant("tenant-first", second.id)).toBeUndefined();
    expect(await store.updateStatusForTenant("tenant-first", second.id, "rendered")).toBeUndefined();
    expect((await store.get(second.id))?.status).toBe("queued");
    expect(await store.findByNamingKeyForTenant("tenant-first", "second-key")).toBeUndefined();
  });

  it("keeps legacy render jobs without tenant ownership out of scoped reads", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "render-job-legacy-"));
    const store = new RenderJobStore(base);
    await fsp.writeFile(
      path.join(base, "renderJobs.json"),
      JSON.stringify([{ id: "legacy", namingKey: "legacy-key", status: "queued", createdAt: "2026-01-01T00:00:00.000Z" }]),
      "utf8",
    );

    expect(await store.getForTenant("tenant-first", "legacy")).toBeUndefined();
    expect(await store.listForTenant("tenant-first")).toEqual([]);
  });
});

