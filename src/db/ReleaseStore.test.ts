import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ReleaseStore } from "./ReleaseStore.js";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function makeStore(): ReleaseStore {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "release-store-"));
  dirs.push(dir);
  return new ReleaseStore(dir);
}

const baseRelease = {
  workspaceId: "workspace-a",
  contentVersionId: "content-v1",
  approvalStatus: "approved" as const,
  approvedBy: "owner-a",
  approvedAt: new Date().toISOString(),
};

describe("ReleaseStore", () => {
  it("requires approved content before creating a release target", () => {
    const store = makeStore();
    const release = store.createRelease({ ...baseRelease, approvalStatus: "pending" });
    expect(() => store.createTarget({
      workspaceId: "workspace-a",
      releaseId: release.id,
      connectorId: "connector-a",
      destinationId: "destination-a",
      idempotencyKey: "release-a-target-a",
    })).toThrow("Release approval is required");
  });

  it("keeps release reads and target updates workspace-scoped", () => {
    const store = makeStore();
    const release = store.createRelease(baseRelease);
    const target = store.createTarget({
      workspaceId: "workspace-a",
      releaseId: release.id,
      connectorId: "connector-a",
      destinationId: "destination-a",
      idempotencyKey: "release-a-target-a",
    });
    expect(store.getRelease("workspace-b", release.id)).toBeUndefined();
    expect(store.listTargets("workspace-b", release.id)).toEqual([]);
    expect(store.updateTarget("workspace-b", target.id, { status: "published" })).toBeUndefined();
  });

  it("rejects a duplicate idempotency key", () => {
    const store = makeStore();
    const release = store.createRelease(baseRelease);
    const target = {
      workspaceId: "workspace-a",
      releaseId: release.id,
      connectorId: "connector-a",
      destinationId: "destination-a",
      idempotencyKey: "release-a-target-a",
    };
    store.createTarget(target);
    expect(() => store.createTarget(target)).toThrow("Duplicate idempotency key");
  });

  it("lists releases only for the owning workspace, newest first", () => {
    const store = makeStore();
    const first = store.createRelease({ ...baseRelease, contentVersionId: "content-v1" });
    const second = store.createRelease({ ...baseRelease, contentVersionId: "content-v2" });
    store.createRelease({ ...baseRelease, workspaceId: "workspace-b", contentVersionId: "content-v3" });

    const listed = store.listReleases("workspace-a");
    expect(listed.map((release) => release.id).sort()).toEqual([first.id, second.id].sort());
    expect(listed.every((release) => release.workspaceId === "workspace-a")).toBe(true);
    expect(store.listReleases("workspace-b")).toHaveLength(1);
    expect(store.listReleases("workspace-c")).toEqual([]);
  });

  it("counts publish attempts only when a target starts publishing", () => {
    const store = makeStore();
    const release = store.createRelease(baseRelease);
    const first = store.createTarget({
      workspaceId: "workspace-a",
      releaseId: release.id,
      connectorId: "connector-a",
      destinationId: "destination-a",
      idempotencyKey: "release-a-target-a",
    });
    expect(first.attempts).toBe(0);

    store.updateTarget("workspace-a", first.id, { status: "publishing" });
    store.updateTarget("workspace-a", first.id, { status: "published", externalId: "msg-1" });
    expect(store.getTarget("workspace-a", first.id)?.attempts).toBe(1);

    const second = store.createTarget({
      workspaceId: "workspace-a",
      releaseId: release.id,
      connectorId: "connector-a",
      destinationId: "destination-a",
      idempotencyKey: "release-a-target-b",
    });
    store.updateTarget("workspace-a", second.id, { status: "publishing" });
    store.updateTarget("workspace-a", second.id, { status: "retryable", lastErrorCode: "timeout" });
    store.updateTarget("workspace-a", second.id, { status: "publishing" });
    store.updateTarget("workspace-a", second.id, { status: "published", externalId: "msg-2" });
    expect(store.getTarget("workspace-a", second.id)?.attempts).toBe(2);
  });

  it("resets a failed target to queued without inflating attempts or keeping the error", () => {
    const store = makeStore();
    const release = store.createRelease(baseRelease);
    const target = store.createTarget({
      workspaceId: "workspace-a",
      releaseId: release.id,
      connectorId: "connector-a",
      destinationId: "destination-a",
      idempotencyKey: "release-a-target-a",
    });
    store.updateTarget("workspace-a", target.id, { status: "publishing" });
    store.updateTarget("workspace-a", target.id, { status: "failed", lastErrorCode: "credentials invalid" });

    const recovered = store.updateTarget("workspace-a", target.id, { status: "queued", lastErrorCode: undefined });
    expect(recovered?.status).toBe("queued");
    expect(recovered?.attempts).toBe(1);
    expect(recovered?.lastErrorCode).toBeUndefined();
    expect(store.getTarget("workspace-a", target.id)?.lastErrorCode).toBeUndefined();
  });
});
