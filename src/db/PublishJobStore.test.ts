import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { PublishJobStore } from "./PublishJobStore";

describe("PublishJobStore tenant isolation", () => {
  it("does not expose or mutate another tenant's job", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "publish-job-isolation-"));
    const store = new PublishJobStore(base);
    const first = await store.createJob({
      tenantId: "tenant-first",
      renderOutputPath: "/tmp/first.mp4",
      platform: "youtube",
      channelId: "channel-first",
      title: "First",
      description: "",
      tags: [],
      category: "Technology",
      language: "en",
    });
    const second = await store.createJob({
      tenantId: "tenant-second",
      renderOutputPath: "/tmp/second.mp4",
      platform: "youtube",
      channelId: "channel-second",
      title: "Second",
      description: "",
      tags: [],
      category: "Technology",
      language: "en",
    });

    expect((await store.listJobsForTenant("tenant-first")).map((job) => job.id)).toEqual([first.id]);
    expect(await store.getJobForTenant("tenant-first", second.id)).toBeUndefined();
    expect(await store.updateJobStatusForTenant("tenant-first", second.id, "published")).toBeUndefined();
    expect((await store.getJob(second.id))?.status).toBe("queued");
    expect(await store.findDuplicateForTenant("tenant-first", "/tmp/second.mp4", "youtube")).toBeUndefined();
  });

  it("keeps legacy jobs without tenant ownership out of scoped reads", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "publish-job-legacy-"));
    const store = new PublishJobStore(base);
    await fsp.writeFile(
      path.join(base, "publishJobs.json"),
      JSON.stringify([{ id: "legacy-job", status: "queued", createdAt: "2026-01-01T00:00:00.000Z" }]),
      "utf8",
    );

    expect(await store.getJobForTenant("tenant-first", "legacy-job")).toBeUndefined();
    expect(await store.listJobsForTenant("tenant-first")).toEqual([]);
  });
});

