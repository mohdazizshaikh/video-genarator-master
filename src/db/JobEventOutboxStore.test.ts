import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { JobEventOutboxStore } from "./JobEventOutboxStore";

describe("JobEventOutboxStore", () => {
  it("deduplicates per tenant and hides other tenants", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "outbox-"));
    const store = new JobEventOutboxStore(dir);
    const first = store.enqueue({ tenantId: "tenant-a", eventId: "event-1" });
    expect(store.enqueue({ tenantId: "tenant-a", eventId: "event-1" }).id).toBe(first.id);
    store.enqueue({ tenantId: "tenant-b", eventId: "event-1" });
    expect(store.listPending("tenant-a")).toHaveLength(1);
    expect(store.listPending("tenant-b")).toHaveLength(1);
    expect(() => store.listPending("")).toThrow("tenantId is required");
  });

  it("moves failed delivery to dead letter and allows explicit requeue", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "outbox-"));
    const store = new JobEventOutboxStore(dir);
    const row = store.enqueue({ tenantId: "tenant-a", eventId: "event-1" });
    const failed = store.retry("tenant-a", row.id, "network", "2099-01-01T00:00:00.000Z", 1);
    expect(failed?.state).toBe("dead_letter");
    expect(store.listPending("tenant-a")).toHaveLength(0);
    expect(store.requeue("tenant-b", row.id)).toBeNull();
    expect(store.requeue("tenant-a", row.id)?.state).toBe("pending");
    expect(store.markDelivered("tenant-a", row.id)?.state).toBe("delivered");
  });
});
