import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShutdownCoordinator, installShutdownHandlers } from "./ShutdownCoordinator";

afterEach(() => vi.useRealTimers());
describe("coordinated shutdown", () => {
  it("stops producers, drains workers and HTTP, then closes engines before infrastructure", async () => {
    const coordinator = new ShutdownCoordinator();
    const order: string[] = [];
    let finish!: () => void;
    coordinator.register("ingress", "stop", () => { order.push("stop"); });
    coordinator.register("workers", "drain", async () => { order.push("drain"); await new Promise<void>((resolve) => { finish = resolve; }); order.push("drained"); });
    coordinator.register("engine", "engines", () => { order.push("engine"); });
    coordinator.register("redis", "cleanup", () => { order.push("redis"); });
    const pending = coordinator.shutdown();
    expect(coordinator.shutdown()).toBe(pending);
    await vi.waitFor(() => expect(order).toEqual(["stop", "drain"]));
    finish();
    await expect(pending).resolves.toEqual({ ok: true, timedOut: false, failures: [] });
    expect(order).toEqual(["stop", "drain", "drained", "engine", "redis"]);
  });
  it("does not exit early or close twice when SIGTERM and SIGINT arrive together", async () => {
    const runtime = Object.assign(new EventEmitter(), { exit: vi.fn() });
    const coordinator = new ShutdownCoordinator();
    let finish!: () => void;
    const close = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    coordinator.register("worker", "drain", close);
    const uninstall = installShutdownHandlers(coordinator, runtime, vi.fn());
    runtime.emit("SIGTERM"); runtime.emit("SIGINT");
    expect(close).toHaveBeenCalledTimes(1);
    expect(runtime.exit).not.toHaveBeenCalled();
    finish();
    await vi.waitFor(() => expect(runtime.exit).toHaveBeenCalledWith(0));
    expect(runtime.exit).toHaveBeenCalledTimes(1);
    uninstall();
    expect(runtime.listenerCount("SIGTERM")).toBe(0);
  });
  it("reports failures while still running other closers", async () => {
    const coordinator = new ShutdownCoordinator();
    const cleanup = vi.fn();
    coordinator.register("failed", "drain", () => { throw new Error("sensitive detail"); });
    coordinator.register("cleanup", "cleanup", cleanup);
    await expect(coordinator.shutdown()).resolves.toMatchObject({ ok: false, failures: ["failed"] });
    expect(cleanup).toHaveBeenCalledOnce();
  });
  it("bounds a stuck drain, attempts cleanup and exits unsuccessfully", async () => {
    vi.useFakeTimers();
    const runtime = Object.assign(new EventEmitter(), { exit: vi.fn() });
    const coordinator = new ShutdownCoordinator(1000);
    const cleanup = vi.fn();
    coordinator.register("stuck", "drain", () => new Promise(() => undefined));
    coordinator.register("redis", "cleanup", cleanup);
    const report = vi.fn();
    installShutdownHandlers(coordinator, runtime, report);
    runtime.emit("SIGTERM");
    await vi.advanceTimersByTimeAsync(1001);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(report).toHaveBeenCalledWith({ ok: false, timedOut: true, failures: ["drain:deadline"] });
    expect(runtime.exit).toHaveBeenCalledWith(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("rejects new resources once shutdown starts", async () => {
    const coordinator = new ShutdownCoordinator();
    await coordinator.shutdown();
    expect(() => coordinator.register("late-worker", "drain", vi.fn())).toThrow("during shutdown");
  });
});
