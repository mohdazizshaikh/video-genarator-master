import { describe, expect, it } from "vitest";
import { compareReadModels, shadowWriteAndReadVerify } from "./DualWriteReadVerify";

describe("DualWriteReadVerify", () => {
  it("treats object key order as equivalent", () => {
    const result = compareReadModels({ tenantId: "a", value: 1 }, { value: 1, tenantId: "a" });
    expect(result.match).toBe(true);
    expect(result.differences).toEqual([]);
  });

  it("fails closed when shadow reads diverge", async () => {
    await expect(shadowWriteAndReadVerify({
      fileWrite: () => ({ id: "one" }),
      durableWrite: () => ({ id: "one" }),
      fileRead: () => ({ id: "one", status: "ready" }),
      durableRead: () => ({ id: "one", status: "stale" }),
    })).rejects.toThrow("Dual-write read-verify mismatch");
  });

  it("surfaces durable write failures instead of reporting success", async () => {
    await expect(shadowWriteAndReadVerify({
      fileWrite: () => ({ id: "one" }),
      durableWrite: () => { throw new Error("durable unavailable"); },
      fileRead: () => ({ id: "one" }),
      durableRead: () => ({ id: "one" }),
    })).rejects.toThrow("durable unavailable");
  });
});
