import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { VideoMetadataStore } from "./VideoMetadataStore";
import { LanguageEnum } from "../types/shorts";

const scenes = [{
  text: "A sufficiently long technology scene for metadata extraction.",
  searchTerms: ["technology", "security"],
  language: LanguageEnum.en,
  headline: "Tenant-safe metadata",
  audio: { url: "", duration: 1 },
}];

describe("VideoMetadataStore tenant isolation", () => {
  it("keeps metadata lookups and deduplication tenant-scoped", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "video-metadata-isolation-"));
    const store = new VideoMetadataStore(base);
    const first = await store.upsertFromScenes({ tenantId: "tenant-first", videoId: "video-first", scenes, signature: "same-signature" });
    const second = await store.upsertFromScenes({ tenantId: "tenant-second", videoId: "video-second", scenes, signature: "same-signature" });

    expect(first.tenantId).toBe("tenant-first");
    expect(second.tenantId).toBe("tenant-second");
    expect(await store.get("video-second", "tenant-first")).toBeUndefined();
    expect(store.findBySignatureSync("same-signature", "tenant-first")?.videoId).toBe("video-first");
    expect(await store.listForTenant("tenant-first")).toHaveLength(1);
  });

  it("keeps legacy metadata without tenant ownership out of scoped reads", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "video-metadata-legacy-"));
    const store = new VideoMetadataStore(base);
    await fsp.writeFile(
      path.join(base, "videoMetadata.json"),
      JSON.stringify([{ videoId: "legacy", signature: "legacy", topic: "legacy", summary: "legacy", category: null, subcategory: null, keywords: [], headlines: [], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }]),
      "utf8",
    );

    expect(await store.get("legacy", "tenant-first")).toBeUndefined();
    expect(await store.listForTenant("tenant-first")).toEqual([]);
  });
});

