import fs from "fs-extra";
import os from "os";
import path from "path";
import { afterEach, describe, expect, test } from "vitest";

import { CustomNewsSourceStore } from "./CustomNewsSourceStore";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length) {
    const dir = tempDirs.pop();
    if (dir) {
      fs.removeSync(dir);
    }
  }
});

describe("CustomNewsSourceStore", () => {
  test("rejects duplicate feed URLs", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "custom-source-store-"));
    tempDirs.push(tempDir);
    const store = new CustomNewsSourceStore(tempDir);

    await store.add({
      name: "Example Feed",
      url: "https://example.com/rss.xml",
      category: "World",
    });

    await expect(store.add({
      name: "Example Feed Mirror",
      url: "https://example.com/rss.xml/",
      category: "World",
    })).rejects.toThrow("Source already exists");
  });

  test("lists custom sources only for their owning tenant", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "custom-source-tenant-"));
    tempDirs.push(tempDir);
    const store = new CustomNewsSourceStore(tempDir);

    await store.add({ name: "Tenant A Feed", url: "https://a.example.com/rss.xml", category: "Technology", tenantId: "tenant-a" });
    await store.add({ name: "Tenant B Feed", url: "https://b.example.com/rss.xml", category: "Technology", tenantId: "tenant-b" });

    expect(store.listSync("tenant-a").map((source) => source.name)).toEqual(["Tenant A Feed"]);
    expect(store.listSync("tenant-b").map((source) => source.name)).toEqual(["Tenant B Feed"]);
    expect(store.listSync("tenant-c")).toEqual([]);
  });
});
