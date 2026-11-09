import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Config } from "../../config";
import { HealthRouter } from "./health";
import { readiness } from "../readiness";
import { dispatch } from "../testing/dispatch";
import { workerHealth } from "../../workers/WorkerHealth";
const fake = vi.hoisted(() => {
  const previousAdminKey = process.env.ADMIN_API_KEY;
  process.env.ADMIN_API_KEY = "isolated-health-admin-key";
  return { redis: vi.fn(), queueCounts: vi.fn(), close: vi.fn(), previousAdminKey };
});
vi.mock("../../workers/QueueManager", () => ({ testRedisConnection: fake.redis, createRenderQueue: () => ({ getJobCounts: fake.queueCounts, close: fake.close }), createPublishQueue: () => ({ getJobCounts: fake.queueCounts, close: fake.close }), getRedisConnection: () => ({ ping: async () => "PONG", info: async () => "", dbsize: async () => 0 }) }));
let directory: string;
let router: HealthRouter;
const registrations: ReturnType<typeof workerHealth.register>[] = [];
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "health-contract-"));
  router = new HealthRouter({ dataDirPath: directory, redisEnabled: false } as Config);
  Object.assign(readiness, { shuttingDown: false, videoEngineReady: false, videoEngineError: false }); fake.redis.mockReset().mockResolvedValue(true);
  fake.queueCounts.mockReset().mockResolvedValue({ active: 0, waiting: 0, completed: 0, failed: 0, delayed: 0, paused: 0 }); fake.close.mockReset().mockResolvedValue(undefined);
});
afterEach(() => { registrations.splice(0).forEach((row) => row.stop()); vi.useRealTimers(); fs.removeSync(directory); Object.assign(readiness, { shuttingDown: false, videoEngineReady: false, videoEngineError: false }); });
afterAll(() => { if (fake.previousAdminKey === undefined) delete process.env.ADMIN_API_KEY; else process.env.ADMIN_API_KEY = fake.previousAdminKey; });
const auth = { tenantId: "A" };
describe("health isolation and readiness", () => {
  it("separates liveness from initialization, engine failure and shutdown", async () => {
    expect((await dispatch(router.router, "GET", "/live")).status).toBe(200);
    expect((await dispatch(router.router, "GET", "/ready")).status).toBe(503);
    readiness.videoEngineReady = true;
    expect((await dispatch(router.router, "GET", "/")).body).toEqual({ status: "ready", ready: true });
    readiness.videoEngineError = true;
    expect((await dispatch(router.router, "GET", "/ready")).status).toBe(503);
    readiness.shuttingDown = true;
    expect((await dispatch(router.router, "GET", "/ready")).status).toBe(503);
    expect((await dispatch(router.router, "GET", "/live")).status).toBe(200);
  });
  it("requires actual ready worker observations when Redis mode is configured", async () => {
    router = new HealthRouter({ dataDirPath: directory, redisEnabled: true } as Config); readiness.videoEngineReady = true;
    expect((await dispatch(router.router, "GET", "/ready")).status).toBe(503);
    for (const id of ["render", "publish", "deadletter"]) { const registration = workerHealth.register(id, id, id, 1); registrations.push(registration); registration.beat(); }
    expect((await dispatch(router.router, "GET", "/ready")).status).toBe(200);
    registrations[0].stop(); expect((await dispatch(router.router, "GET", "/ready")).status).toBe(503);
  });
  it("bounds a hung Redis probe and shares it across repeated requests", async () => {
    vi.useFakeTimers(); fake.redis.mockImplementation(() => new Promise(() => undefined));
    router = new HealthRouter({ dataDirPath: directory, redisEnabled: true } as Config);
    const first = dispatch(router.router, "GET", "/ready"); await vi.advanceTimersByTimeAsync(1501);
    expect((await first).status).toBe(503);
    const second = dispatch(router.router, "GET", "/ready"); await vi.advanceTimersByTimeAsync(1501);
    expect((await second).status).toBe(503); expect(fake.redis).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
  it("protects global queue/metrics and requires workspace ownership for state counts", async () => {
    for (const url of ["/queue", "/metrics"]) expect((await dispatch(router.router, "GET", url, { auth })).status).toBe(403);
    expect((await dispatch(router.router, "GET", "/queue/states")).status).toBe(401);
  });
  it("returns only workspace job states/events without host paths or global resources", async () => {
    fs.writeJsonSync(path.join(directory, "renderJobs.json"), [{ id: "a-render", tenantId: "A", status: "queued" }, { id: "b-render", tenantId: "B", status: "failed" }]);
    fs.writeJsonSync(path.join(directory, "publishJobs.json"), [{ id: "a-publish", tenantId: "A", status: "published" }, { id: "b-publish", tenantId: "B", status: "publishing" }]);
    fs.writeJsonSync(path.join(directory, "ai-learning-events.json"), [{ id: "a-event", tenantId: "A", jobId: "a-render", phase: "render", outcome: "failed", latencyMs: 2000, createdAt: new Date().toISOString() }, { id: "b-event", tenantId: "B", jobId: "b-render", phase: "render", outcome: "failed", latencyMs: 3000, createdAt: new Date().toISOString() }]);
    expect((await dispatch(router.router, "GET", "/queue/states", { auth })).body).toEqual({ renderStates: { queued: 1 }, publishStates: { published: 1 } });
    const result = await dispatch(router.router, "GET", "/dashboard", { auth });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ scope: "workspace", workers: null, database: null, redis: null, system: null, queue: { totals: { active: 0, waiting: 1, failed: 0 } }, errors: { last24h: 1 } });
    expect(JSON.stringify(result.body)).not.toContain("b-event"); expect(JSON.stringify(result.body)).not.toContain(directory); expect(fake.redis).not.toHaveBeenCalled();
  });
});

it("permits admin metrics/operations without a workspace and reports no invented workers", async () => {
  const headers = { "x-admin-key": "isolated-health-admin-key" };
  expect((await dispatch(router.router, "GET", "/metrics", { headers })).status).toBe(200);
  const snapshot = await dispatch(router.router, "GET", "/dashboard", { headers });
  expect(snapshot.status).toBe(200);
  expect(snapshot.body).toMatchObject({ scope: "operations", workers: { online: 0 } });
  expect(JSON.stringify(snapshot.body)).not.toContain("Ingest Worker");
  expect(JSON.stringify(snapshot.body)).not.toContain("Planning Worker");
});
it("bounds admin queue dependencies and closes transient queue handles on timeout", async () => {
  vi.useFakeTimers();
  router = new HealthRouter({ dataDirPath: directory, redisEnabled: true } as Config);
  fake.queueCounts.mockImplementation(() => new Promise(() => undefined));
  const result = dispatch(router.router, "GET", "/queue", { headers: { "x-admin-key": "isolated-health-admin-key" } });
  await vi.advanceTimersByTimeAsync(1501);
  expect((await result).status).toBe(503); expect(fake.close).toHaveBeenCalledTimes(2); expect(vi.getTimerCount()).toBe(0);
});
