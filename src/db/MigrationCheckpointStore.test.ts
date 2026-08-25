import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MigrationCheckpointStore } from "./MigrationCheckpointStore";

describe("MigrationCheckpointStore", () => {
  it("reports pending, applied, and checksum drift states", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "migration-checkpoints-"));
    const store = new MigrationCheckpointStore(dir);
    expect(store.verify("001", "create table a").status).toBe("pending");
    store.recordApplied("001", "create table a", "2026-08-25T00:00:00.000Z");
    expect(store.verify("001", "create table a").status).toBe("applied");
    expect(store.verify("001", "create table b").status).toBe("drift");
    expect(() => store.recordApplied("001", "create table b")).toThrow("checksum drift");
  });

  it("is idempotent and persists checkpoints", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "migration-checkpoints-"));
    const first = new MigrationCheckpointStore(dir);
    const one = first.recordApplied("001", "create table a", "2026-08-25T00:00:00.000Z");
    const two = first.recordApplied("001", "create table a", "2026-08-26T00:00:00.000Z");
    expect(two).toEqual(one);
    expect(new MigrationCheckpointStore(dir).list()).toEqual([one]);
  });
});
