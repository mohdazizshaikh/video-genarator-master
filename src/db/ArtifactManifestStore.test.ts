import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ArtifactManifestStore } from "./ArtifactManifestStore";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.remove(dir)));
});

describe("ArtifactManifestStore", () => {
  it("registers artifacts with tenant object keys, checksums, and scoped reads", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "artifact-manifest-"));
    tempDirs.push(dir);
    const localPath = path.join(dir, "tenant-a__img_thumbnail.png");
    await fs.writeFile(localPath, "artifact-a");
    const store = new ArtifactManifestStore(dir);

    const manifest = await store.register({
      tenantId: "tenant-a",
      kind: "generated-image",
      localPath,
      mimeType: "image/png",
      lifecycle: "active",
    });

    expect(manifest.objectKey).toBe("tenant-a/generated-image/tenant-a__img_thumbnail.png");
    expect(manifest.checksumSha256).toHaveLength(64);
    expect(manifest.sizeBytes).toBe(10);
    expect(store.listForTenant("tenant-a")).toHaveLength(1);
    expect(store.listForTenant("tenant-b")).toHaveLength(0);
    expect(store.findForTenant("tenant-b", manifest.id)).toBeNull();
  });

  it("rejects missing ownership and ignores legacy records", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "artifact-manifest-"));
    tempDirs.push(dir);
    const localPath = path.join(dir, "legacy.png");
    await fs.writeFile(localPath, "legacy");
    await fs.writeJson(path.join(dir, "artifact-manifests.json"), [{ id: "legacy-1", kind: "generated-image", localPath, lifecycle: "active" }]);
    const store = new ArtifactManifestStore(dir);

    expect(() => store.listForTenant("")).toThrow("tenantId is required");
    expect(store.listForTenant("tenant-a")).toHaveLength(0);
    expect(store.quarantineLegacy()).toBe(0);
  });
});
