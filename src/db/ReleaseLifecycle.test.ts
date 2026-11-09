import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ReleaseStore } from "./ReleaseStore";
let directory: string;
let store: ReleaseStore;
beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), "release-lifecycle-")); store = new ReleaseStore(directory); });
afterEach(() => fs.removeSync(directory));
describe("release parent state and storage", () => {
  it("rolls target states into queued, partial, published and reconciliation status", () => {
    const release = store.createRelease({ workspaceId: "A", contentVersionId: "v", approvalStatus: "approved" });
    const input = { workspaceId: "A", releaseId: release.id, connectorId: "c" };
    const first = store.createTarget({ ...input, destinationId: "d1", idempotencyKey: "key1" });
    const second = store.createTarget({ ...input, destinationId: "d2", idempotencyKey: "key2" });
    expect(store.getRelease("A", release.id)?.status).toBe("queued");
    store.updateTarget("A", first.id, { status: "publishing" });
    store.updateTarget("A", first.id, { status: "published", externalId: "1" });
    expect(store.getRelease("A", release.id)?.status).toBe("partially_published");
    store.updateTarget("A", second.id, { status: "publishing" });
    store.updateTarget("A", second.id, { status: "reconciling" });
    expect(store.getRelease("A", release.id)?.status).toBe("reconciling");
    store.updateTarget("A", second.id, { status: "published", externalId: "2" });
    expect(store.getRelease("A", release.id)?.status).toBe("published");
    expect(() => store.updateTarget("A", first.id, { status: "queued" })).toThrow("transition");
  });
  it("rejects duplicate destinations and approval changes after targets exist", () => {
    const release = store.createRelease({ workspaceId: "A", contentVersionId: "v", approvalStatus: "approved" });
    const input = { workspaceId: "A", releaseId: release.id, connectorId: "c", destinationId: "d", idempotencyKey: "first" };
    store.createTarget(input);
    expect(() => store.createTarget({ ...input, idempotencyKey: "second" })).toThrow("already has a target");
    expect(() => store.approveRelease("A", release.id, "actor")).toThrow("Approval cannot be changed");
  });
  it("preserves corrupt release files rather than overwriting them", () => {
    const file = path.join(directory, "releases.json");
    fs.writeFileSync(file, "{broken");
    expect(() => store.createRelease({ workspaceId: "A", contentVersionId: "v", approvalStatus: "pending" })).toThrow();
    expect(fs.readFileSync(file, "utf8")).toBe("{broken");
  });
});
