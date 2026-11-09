import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkerHealthRegistry, observeWorker, workerHealth } from "./WorkerHealth";

afterEach(() => vi.useRealTimers());
describe("observed process-local worker health", () => {
  it("does not invent workers or equate Redis connectivity with a heartbeat", () => {
    const registry = new WorkerHealthRegistry();
    expect(registry.snapshot(true).items).toEqual([]);
    registry.register("render", "Render", "render_queue", 2);
    expect(registry.snapshot(true)).toMatchObject({ online: 0, total: 1, capacity: 0 });
  });
  it("expires heartbeats and makes paused/stopped/disconnected capacity unavailable", () => {
    let now = 0; const registry = new WorkerHealthRegistry(() => now, 100);
    const registration = registry.register("render", "Render", "render_queue", 2);
    registration.beat(); expect(registry.snapshot(true).online).toBe(1);
    expect(registry.snapshot(false).online).toBe(0);
    now = 100; expect(registry.snapshot(true).online).toBe(0);
    registration.beat(); registration.pause(); expect(registry.snapshot(true).online).toBe(0);
    registration.resume(); expect(registry.snapshot(true).online).toBe(0);
    registration.beat(); expect(registry.snapshot(true).capacity).toBe(2);
    registration.stop(); registration.beat(); expect(registry.snapshot(true).online).toBe(0);
  });
  it("ignores stale registration callbacks after a worker is replaced", () => {
    const registry = new WorkerHealthRegistry();
    const old = registry.register("render", "Old", "render", 2);
    const current = registry.register("render", "Current", "render", 3);
    current.beat(); old.stop(); old.beat();
    expect(registry.snapshot(true)).toMatchObject({ online: 1, total: 1, capacity: 3 });
  });
  it("observes readiness/running state and clears its heartbeat timer on shutdown", () => {
    vi.useFakeTimers();
    const worker = Object.assign(new EventEmitter(), { isRunning: () => true, isPaused: () => false });
    const monitor = observeWorker(worker as never, "test-observed", "Test", "test", 1, () => true);
    expect(workerHealth.snapshot(true).items.find((row) => row.id === "test-observed")?.online).toBe(false);
    worker.emit("ready"); expect(workerHealth.snapshot(true).items.find((row) => row.id === "test-observed")?.online).toBe(true);
    monitor.pause(); vi.advanceTimersByTime(5000);
    expect(workerHealth.snapshot(true).items.find((row) => row.id === "test-observed")?.online).toBe(false);
    monitor.stop(); expect(vi.getTimerCount()).toBe(0);
  });
});
