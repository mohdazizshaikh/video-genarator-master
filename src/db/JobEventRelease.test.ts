import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { JobEventStore } from "./JobEventStore";
import { ReleaseControlStore } from "./ReleaseControlStore";

const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((dir) => fs.remove(dir))); });

describe("job events and release control", () => {
  it("isolates events and deduplicates idempotency per tenant", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "job-events-")); dirs.push(dir);
    const store = new JobEventStore(dir);
    const first = store.append({ tenantId: "a", jobId: "job-1", type: "started", idempotencyKey: "start-1", payload: {} });
    expect(store.append({ tenantId: "a", jobId: "job-1", type: "started", idempotencyKey: "start-1", payload: { duplicate: true } })).toEqual(first);
    store.append({ tenantId: "a", jobId: "job-1", type: "completed", idempotencyKey: "done-1", payload: {} });
    store.append({ tenantId: "b", jobId: "job-1", type: "started", idempotencyKey: "start-1", payload: {} });
    expect(store.listForTenant("a", "job-1")).toHaveLength(2);
    expect(store.listForTenant("b", "job-1")).toHaveLength(1);
    expect(() => store.listForTenant("")).toThrow("tenantId is required");
  });

  it("enforces release transitions and tenant scope", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "releases-")); dirs.push(dir);
    const store = new ReleaseControlStore(dir);
    const release = store.create({ tenantId: "a", artifactId: "artifact-1" });
    expect(store.getForTenant("b", release.id)).toBeNull();
    expect(() => store.transitionForTenant("a", release.id, "released")).toThrow("invalid release transition");
    expect(store.transitionForTenant("a", release.id, "approved").state).toBe("approved");
    expect(store.transitionForTenant("a", release.id, "released").state).toBe("released");
    expect(() => store.transitionForTenant("a", release.id, "draft")).toThrow("invalid release transition");
  });
});
