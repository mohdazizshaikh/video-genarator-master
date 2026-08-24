import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { VideoLibraryStore } from "./VideoLibraryStore";

const videoData = (tenantId: string, title: string) => ({
  tenantId,
  title,
  description: `${title} description`,
  category: "technology",
  duration: 30,
  platform: "youtube",
  status: "draft" as const,
  videoPath: `/videos/${tenantId}.mp4`,
  thumbnailPath: `/thumbs/${tenantId}.jpg`,
  tags: ["tenant-safe"],
  engagementMetrics: { views: 0, likes: 0, comments: 0, shares: 0 },
});

describe("VideoLibraryStore tenant isolation", () => {
  it("does not expose or mutate another tenant's video artifact", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "video-library-isolation-"));
    const store = new VideoLibraryStore(base);
    const first = await store.create(videoData("tenant-first", "First video"));
    const second = await store.create(videoData("tenant-second", "Second video"));

    expect((await store.listForTenant("tenant-first")).videos.map((video) => video.id)).toEqual([first.id]);
    expect(await store.getForTenant("tenant-first", second.id)).toBeUndefined();
    expect(await store.updateStatusForTenant("tenant-first", second.id, "published")).toBeUndefined();
    expect(await store.deleteForTenant("tenant-first", second.id)).toBe(false);
    expect(await store.searchForTenant("tenant-first", "Second")).toEqual([]);
    expect((await store.get(second.id))?.status).toBe("draft");
  });

  it("keeps legacy video records without tenant ownership out of scoped reads", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "video-library-legacy-"));
    const store = new VideoLibraryStore(base);
    await fsp.writeFile(
      path.join(base, "videoLibrary.json"),
      JSON.stringify([{ id: "legacy", title: "Legacy", description: "", category: "general", duration: 0, platform: "youtube", status: "draft", tags: [], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }]),
      "utf8",
    );

    expect(await store.getForTenant("tenant-first", "legacy")).toBeUndefined();
    expect((await store.listForTenant("tenant-first")).videos).toEqual([]);
  });
});

