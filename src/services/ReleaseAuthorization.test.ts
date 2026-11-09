import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { ArtifactManifestStore } from "../db/ArtifactManifestStore";
import { ContentVersionStore } from "../db/ContentVersionStore";
import { ReleaseStore } from "../db/ReleaseStore";
import { ReleaseAuthorization } from "./ReleaseAuthorization";

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "release-authority-"));
});
afterEach(() => fs.removeSync(dir));
async function fixture() {
  const file = path.join(dir, "video.mp4");
  fs.writeFileSync(file, "fixture media bytes");
  const artifact = await new ArtifactManifestStore(dir).register({
    tenantId: "A",
    kind: "video",
    localPath: file,
    mimeType: "video/mp4",
    lifecycle: "active",
  });
  const versions = new ContentVersionStore(dir);
  const input = {
    workspaceId: "A",
    title: "Approved title",
    script: "Approved script",
    scenes: [{ text: "Approved script" }],
    metadata: { tags: ["approved"], language: "en" },
    sourceUrls: [],
    contentSignature: "approved-signature",
  };
  const version = versions.create(input);
  versions.updateRender("A", version.id, {
    status: "ready",
    renderOutputPath: file,
    renderError: undefined,
  });
  const releases = new ReleaseStore(dir);
  const release = releases.createRelease({
    workspaceId: "A",
    contentVersionId: version.id,
    approvalStatus: "pending",
  });
  const authority = new ReleaseAuthorization(dir);
  return {
    file,
    artifact,
    versions,
    input,
    version,
    releases,
    release,
    authority,
  };
}

describe("publish approval authority", () => {
  it("resolves owned media and metadata only after explicit bound approval", async () => {
    const f = await fixture();
    expect(() => f.authority.authorize("A", f.release.id)).toThrow(/approval/);
    f.releases.approveRelease(
      "A",
      f.release.id,
      "owner",
      f.authority.snapshot("A", f.version.id),
    );
    const resolved = f.authority.authorize("A", f.release.id);
    expect(resolved.localPath).toBe(f.file);
    expect(resolved.snapshot).toMatchObject({
      artifactId: f.artifact.id,
      title: "Approved title",
      tags: ["approved"],
    });
    expect(() => f.authority.authorize("B", f.release.id)).toThrow();
  });
  it("rejects a valid-looking version path without an owned artifact", async () => {
    const f = await fixture();
    const outsider = f.versions.create({
      ...f.input,
      workspaceId: "B",
      contentSignature: "other",
    });
    f.versions.updateRender("B", outsider.id, {
      status: "ready",
      renderOutputPath: f.file,
      renderError: undefined,
    });
    expect(() => f.authority.snapshot("B", outsider.id)).toThrow(
      /owned video artifact/,
    );
  });
  it("blocks silent file changes after approval and requires a fresh artifact", async () => {
    const f = await fixture();
    f.releases.approveRelease(
      "A",
      f.release.id,
      "owner",
      f.authority.snapshot("A", f.version.id),
    );
    fs.writeFileSync(f.file, "changed payload");
    expect(() => f.authority.authorize("A", f.release.id)).toThrow(/checksum/);
  });
  it("prevents script or render mutation of content referenced by an approved release", async () => {
    const f = await fixture();
    f.releases.approveRelease(
      "A",
      f.release.id,
      "owner",
      f.authority.snapshot("A", f.version.id),
    );
    expect(() =>
      f.versions.updateDraft("A", f.version.id, {
        ...f.input,
        script: "replacement",
      }),
    ).toThrow(/immutable/);
    expect(() =>
      f.versions.updateRender("A", f.version.id, {
        status: "failed",
        renderOutputPath: undefined,
        renderError: "replacement",
      }),
    ).toThrow(/immutable/);
  });
  it("fails closed for previously approved releases without a content binding", async () => {
    const f = await fixture();
    f.releases.approveRelease("A", f.release.id, "owner");
    expect(() => f.authority.authorize("A", f.release.id)).toThrow(
      /bound content approval/,
    );
  });
});
