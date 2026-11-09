import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { JobEventStore } from "./JobEventStore";
import { JobEventOutboxStore } from "./JobEventOutboxStore";
let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "lifecycle-freshness-"));
});
afterEach(() => fs.removeSync(dir));
it("retains events from separate same-process writers and refreshes long-lived readers", () => {
  const a = new JobEventStore(dir),
    b = new JobEventStore(dir),
    reader = new JobEventStore(dir);
  a.listForTenant("A");
  b.listForTenant("B");
  reader.listForTenant("A");
  a.append({
    tenantId: "A",
    jobId: "job",
    type: "queued",
    idempotencyKey: "queued",
    payload: {},
  });
  b.append({
    tenantId: "B",
    jobId: "job",
    type: "queued",
    idempotencyKey: "queued",
    payload: {},
  });
  expect(reader.listForTenant("A")).toHaveLength(1);
  expect(reader.listForTenant("B")).toHaveLength(1);
  expect(
    a.append({
      tenantId: "A",
      jobId: "job",
      type: "queued",
      idempotencyKey: "queued",
      payload: {},
    }).sequence,
  ).toBe(1);
});
it("refreshes outbox claims and delivered state across independent instances", () => {
  const a = new JobEventOutboxStore(dir),
    b = new JobEventOutboxStore(dir);
  expect(b.listForTenant("A")).toEqual([]);
  const row = a.enqueue({ tenantId: "A", eventId: "event-A" });
  b.enqueue({ tenantId: "B", eventId: "event-B" });
  expect(b.listPending("A")).toHaveLength(1);
  b.markDelivered("A", row.id);
  expect(a.listPending("A")).toEqual([]);
  expect(a.listForTenant("B")).toHaveLength(1);
});
it("preserves corrupt data instead of resetting it during a write", () => {
  const file = path.join(dir, "job-events.json");
  fs.writeFileSync(file, "corrupt-but-recoverable");
  expect(() =>
    new JobEventStore(dir).append({
      tenantId: "A",
      jobId: "job",
      type: "queued",
      idempotencyKey: "key",
      payload: {},
    }),
  ).toThrow();
  expect(fs.readFileSync(file, "utf8")).toBe("corrupt-but-recoverable");
});
