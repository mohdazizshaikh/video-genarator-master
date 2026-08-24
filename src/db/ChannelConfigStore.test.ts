import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { ChannelConfigStore } from "./ChannelConfigStore";

describe("ChannelConfigStore tenant isolation", () => {
  it("lists and deletes only mappings owned by the authenticated tenant", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "channel-config-isolation-"));
    const store = new ChannelConfigStore(base);
    const first = await store.create({ tenantId: "tenant-first", category: "tech", platform: "youtube", channelId: "first" });
    const second = await store.create({ tenantId: "tenant-second", category: "tech", platform: "youtube", channelId: "second" });

    expect((await store.listForTenant("tenant-first")).map((record) => record.id)).toEqual([first.id]);
    expect(await store.deleteForTenant("tenant-first", second.id)).toBe(false);
    expect((await store.listForTenant("tenant-second")).map((record) => record.id)).toEqual([second.id]);
  });

  it("does not expose legacy mappings without tenant ownership", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "channel-config-legacy-"));
    const store = new ChannelConfigStore(base);
    await fsp.writeFile(
      path.join(base, "channelConfigs.json"),
      JSON.stringify([{ id: "legacy", category: "tech", platform: "youtube", channelId: "legacy", createdAt: "2026-01-01T00:00:00.000Z" }]),
      "utf8",
    );

    expect(await store.listForTenant("tenant-first")).toEqual([]);
    expect(await store.deleteForTenant("tenant-first", "legacy")).toBe(false);
  });
});

