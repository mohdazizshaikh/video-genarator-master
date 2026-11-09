import { describe, expect, it } from "vitest";
import { WorkerTaskDrain } from "./WorkerTaskDrain";

describe("worker listener drain", () => {
  it("waits for asynchronous persistence listeners before resolving close", async () => {
    const tracker = new WorkerTaskDrain("test");
    let release!: () => void;
    let finished = false;
    tracker.track(async () => { await new Promise<void>((resolve) => { release = resolve; }); finished = true; });
    let closed = false;
    const drain = tracker.drain().then(() => { closed = true; });
    await Promise.resolve();
    expect(closed).toBe(false);
    release(); await drain;
    expect(finished).toBe(true);
    expect(closed).toBe(true);
  });
  it("consumes listener rejections but reports a failed drain", async () => {
    const tracker = new WorkerTaskDrain("test");
    tracker.track(async () => { throw new Error("write failed"); });
    await expect(tracker.drain()).rejects.toThrow("persistence");
  });
});
