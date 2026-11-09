import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UnrecoverableError, type Job } from "bullmq";
import type { Config } from "../config";
import { RenderWorker, type RenderJobPayload } from "./RenderWorker";
import { RenderExecutionService, RenderReconciliationError } from "../services/RenderExecutionService";
import { RenderExecutionStore } from "../db/RenderExecutionStore";
import { RenderJobStore } from "../db/RenderJobStore";
import { JobEventStore } from "../db/JobEventStore";
import type { ShortCreator } from "../short-creator/ShortCreator";
import { OrientationEnum, renderConfig } from "../types/shorts";

const fake = vi.hoisted(() => ({
  process: undefined as ((job: Job<RenderJobPayload>) => Promise<void>) | undefined,
  listeners: new Map<string, (...args: unknown[]) => void>(),
  add: vi.fn(async () => undefined),
  close: vi.fn(async () => undefined),
  pause: vi.fn(async () => undefined),
}));
vi.mock("bullmq", async (original) => ({
  ...await original<typeof import("bullmq")>(),
  Worker: class {
    constructor(_name: string, process: typeof fake.process) { fake.process = process; }
    on(name: string, listener: (...args: unknown[]) => void) { fake.listeners.set(name, listener); return this; }
    close = fake.close;
    pause = fake.pause;
  },
}));
vi.mock("./QueueManager", () => ({ getRedisConnection: () => ({}), QUEUE_NAMES: { RENDER: "render", DEADLETTER: "deadletter" }, createQueue: () => ({ add: fake.add }) }));
let directory: string;
let worker: RenderWorker;
let jobs: RenderJobStore;
let payload: RenderJobPayload;
let job: Job<RenderJobPayload>;
beforeEach(async () => {
  fake.listeners.clear(); fake.add.mockReset().mockResolvedValue(undefined); fake.close.mockClear(); fake.pause.mockClear();
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "render-worker-"));
  jobs = new RenderJobStore(directory);
  const record = await jobs.create({ tenantId: "a", scriptPlanId: "", videoType: "short", language: "en", subtitleLanguage: "en", orientation: OrientationEnum.portrait, category: "Tech", namingKey: "key" });
  payload = { tenantId: "a", renderJobId: record.id, sceneInput: [], config: renderConfig.parse({}), scriptPlanId: "", videoType: "short", orientation: OrientationEnum.portrait, category: "Tech", namingKey: "key" };
  job = { data: payload, id: "queue-job", updateProgress: vi.fn(async () => undefined), attemptsMade: 0, opts: { attempts: 2 } } as unknown as Job<RenderJobPayload>;
  worker = new RenderWorker({ dataDirPath: directory, renderJobTimeoutMs: 1000 } as Config, {} as ShortCreator);
});
afterEach(async () => { await worker.close().catch(() => undefined); vi.restoreAllMocks(); fs.removeSync(directory); });
describe("render worker recovery integration", () => {
  it("rejects foreign jobs before processing, progress or service dispatch", async () => {
    const run = vi.spyOn(RenderExecutionService.prototype, "run");
    job.data = { ...payload, tenantId: "b" };
    await expect(fake.process!(job)).rejects.toBeInstanceOf(UnrecoverableError);
    expect(run).not.toHaveBeenCalled();
    expect(job.updateProgress).not.toHaveBeenCalled();
  });
  it("delegates to the persisted execution service and tolerates final progress telemetry failure", async () => {
    const run = vi.spyOn(RenderExecutionService.prototype, "run").mockResolvedValue({ id: "execution", tenantId: "a", renderJobId: payload.renderJobId, state: "completed", videoId: "video", artifactId: "artifact", contentVersionId: "version", deadlineAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    vi.mocked(job.updateProgress).mockImplementation(async (progress) => { if (progress === 100) throw new Error("Redis unavailable"); });
    await expect(fake.process!(job)).resolves.toBeUndefined();
    expect(run).toHaveBeenCalledWith(payload);
  });
  it("marks uncertain execution unrecoverable for automatic retries", async () => {
    vi.spyOn(RenderExecutionService.prototype, "run").mockRejectedValue(new RenderReconciliationError("Uncertain render"));
    await expect(fake.process!(job)).rejects.toBeInstanceOf(UnrecoverableError);
  });
  it("preserves reconciliation state rather than moving the render into dead-letter retry logic", async () => {
    await jobs.updateStatusForTenant("a", payload.renderJobId, "reconciling");
    fake.listeners.get("failed")!(job, new UnrecoverableError("Uncertain outcome"));
    await worker.close();
    expect(fake.add).not.toHaveBeenCalled();
    expect((await jobs.get(payload.renderJobId))?.status).toBe("reconciling");
    expect(new JobEventStore(directory).listForTenant("a").map((event) => event.type)).toContain("reconciling");
  });
  it("repairs confirmed completion before failure-handler retry logic", async () => {
    const store = new RenderExecutionStore(directory);
    const { execution } = store.claim("a", payload.renderJobId, 1000);
    store.attachVideo("a", payload.renderJobId, execution.id, "video");
    store.complete("a", payload.renderJobId, execution.id, { videoId: "video", artifactId: "artifact", contentVersionId: "version", outputPath: "/internal/video.mp4" });
    fake.listeners.get("failed")!(job, new Error("Projection failed"));
    await worker.close();
    expect(fake.add).not.toHaveBeenCalled();
    expect(await jobs.get(payload.renderJobId)).toMatchObject({ status: "rendered", artifactId: "artifact", contentVersionId: "version" });
  });
  it("does not resolve close while a failure listener is still persisting its dead letter", async () => {
    let release!: () => void;
    fake.add.mockImplementation(() => new Promise<void>((resolve) => { release = resolve; }));
    Object.assign(job, { attemptsMade: 2 });
    fake.listeners.get("failed")!(job, new Error("preflight failed"));
    let closed = false;
    const close = worker.close().then(() => { closed = true; });
    await vi.waitFor(() => expect(fake.add).toHaveBeenCalledOnce());
    expect(closed).toBe(false);
    release(); await close;
    expect((await jobs.get(payload.renderJobId))?.status).toBe("skipped");
  });
  it("surfaces event persistence errors during shutdown without resetting corrupt storage", async () => {
    fs.writeFileSync(path.join(directory, "job-event-outbox.json"), "{corrupt");
    fake.listeners.get("completed")!(job);
    await expect(worker.close()).rejects.toThrow("persistence");
    expect(fs.readFileSync(path.join(directory, "job-event-outbox.json"), "utf8")).toBe("{corrupt");
  });
});
