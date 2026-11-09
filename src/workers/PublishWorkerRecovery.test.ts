import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DelayedError, UnrecoverableError, type Job } from "bullmq";
import type { Config } from "../config";
import { PublishWorker, type PublishJobPayload } from "./PublishWorker";
import { publicationFixture } from "../server/testing/publicationFixture";
import { PublishJobStore } from "../db/PublishJobStore";
import { PublishExecutionStore } from "../db/PublishExecutionStore";
import { PublishFailureError } from "../publishers/failureClassification";

const fake = vi.hoisted(() => ({
  process: undefined as ((job: Job<PublishJobPayload>, token?: string) => Promise<void>) | undefined,
  listeners: new Map<string, (...args: unknown[]) => void>(),
  upload: vi.fn(), validate: vi.fn(), publisher: vi.fn(), deadletter: vi.fn(),
}));
vi.mock("bullmq", async (original) => ({ ...await original<typeof import("bullmq")>(), Worker: class {
  constructor(_name: string, processor: typeof fake.process) { fake.process = processor; }
  on(name: string, callback: (...args: unknown[]) => void) { fake.listeners.set(name, callback); return this; }
  async close() {} async pause() {}
} }));
vi.mock("./QueueManager", () => ({ getRedisConnection: () => ({}), QUEUE_NAMES: { PUBLISH: "publish", DEADLETTER: "deadletter" }, createQueue: () => ({ add: fake.deadletter }) }));
vi.mock("../publishers/PublisherFactory", () => ({ createPublisherForAccount: fake.publisher }));
let directory: string;
let fixture: Awaited<ReturnType<typeof publicationFixture>>;
let worker: PublishWorker;
let job: Job<PublishJobPayload>;
let config: Config;
function construct() { worker = new PublishWorker(config); }
beforeEach(async () => {
  vi.stubEnv("TENANT_KEYS_SECRET", "test-only-publication-key");
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "publish-worker-recovery-"));
  fixture = await publicationFixture(directory);
  fake.listeners.clear(); fake.upload.mockReset().mockResolvedValue({ success: true, externalId: "42" }); fake.validate.mockReset().mockResolvedValue(true);
  fake.publisher.mockReset().mockReturnValue({ uploadVideo: fake.upload, validateCredentials: fake.validate }); fake.deadletter.mockReset().mockResolvedValue(undefined);
  config = { dataDirPath: directory, publishWorkerConcurrency: 1 } as Config;
  job = { data: fixture.payload, id: "queue-job", attemptsMade: 0, opts: { attempts: 2 }, discard: vi.fn(), updateProgress: vi.fn(async () => undefined), updateData: vi.fn(async (data: PublishJobPayload) => { job.data = data; }), moveToDelayed: vi.fn(async () => undefined) } as unknown as Job<PublishJobPayload>;
  construct();
});
afterEach(async () => { await worker.close().catch(() => undefined); vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllEnvs(); fs.removeSync(directory); });
describe("publish worker dispatch/receipt integration", () => {
  it("publishes approved content to the bound destination and records its receipt", async () => {
    job.data = { ...job.data, title: "forged", renderOutputPath: "/etc/passwd", channelId: "forged-channel" };
    await fake.process!(job, "token");
    expect(fake.upload).toHaveBeenCalledWith(expect.objectContaining({ title: "Approved title", videoFilePath: fixture.media }));
    expect(fake.publisher).toHaveBeenCalledWith("telegram", config, expect.objectContaining({ channelId: "fixture-chat" }));
    expect(new PublishExecutionStore(directory).get("A", fixture.target.id)?.state).toBe("accepted");
    expect((await fixture.jobs.getJob(fixture.job.id))?.status).toBe("published");
    expect(fixture.releases.getRelease("A", fixture.release.id)?.status).toBe("published");
  });
  it("repairs/replays accepted publication before rechecking expired credentials or deleted media", async () => {
    await fake.process!(job, "token");
    fs.removeSync(fixture.media); fake.validate.mockResolvedValue(false);
    fixture.connectors.updateConnector("A", fixture.connector.id, { status: "disabled" });
    await worker.close(); construct();
    await fake.process!(job, "token");
    expect(fake.upload).toHaveBeenCalledTimes(1);
    expect(fake.validate).toHaveBeenCalledTimes(1);
  });
  it("holds a timeout and preserves reconciliation in the failed listener", async () => {
    fake.upload.mockRejectedValue(new Error("Socket lost after upload"));
    await expect(fake.process!(job, "token")).rejects.toBeInstanceOf(UnrecoverableError);
    fake.listeners.get("failed")!(job, new UnrecoverableError("Unknown outcome"));
    await worker.close(); construct();
    await expect(fake.process!(job, "token")).rejects.toBeInstanceOf(UnrecoverableError);
    expect(fake.upload).toHaveBeenCalledOnce();
    expect(fake.deadletter).not.toHaveBeenCalled();
    expect((await fixture.jobs.getJob(fixture.job.id))?.status).toBe("reconciling");
  });
  it("defers confirmed rate-limit rejection and retries with a new request identity", async () => {
    vi.useFakeTimers();
    fake.upload.mockResolvedValueOnce({ success: false, deliveryOutcome: "not_accepted", errorCode: "rate_limited", error: "retry after 30", retryAfterSeconds: 30 });
    await expect(fake.process!(job, "token")).rejects.toBeInstanceOf(DelayedError);
    expect(job.moveToDelayed).toHaveBeenCalledWith(Date.now() + 30000, "token");
    expect(new PublishExecutionStore(directory).get("A", fixture.target.id)?.state).toBe("rejected");
    vi.setSystemTime(Date.now() + 31000);
    await fake.process!(job, "token");
    expect(fake.upload).toHaveBeenCalledTimes(2);
    expect(new PublishExecutionStore(directory).list("A", fixture.target.id).map((row) => row.state)).toEqual(["rejected", "accepted"]);
  });
  it("enforces stored due time even when a queued payload omits it", async () => {
    const due = Date.now() + 60000;
    await fixture.jobs.updateJobStatusForTenant("A", fixture.job.id, "scheduled", { scheduleAt: new Date(due).toISOString() });
    await expect(fake.process!(job, "token")).rejects.toBeInstanceOf(DelayedError);
    expect(job.moveToDelayed).toHaveBeenCalledWith(due, "token");
    expect(fake.publisher).not.toHaveBeenCalled();
  });
  it("rejects a foreign or unbound job before provider access", async () => {
    job.data = { ...job.data, tenantId: "B" };
    await expect(fake.process!(job, "token")).rejects.toBeInstanceOf(UnrecoverableError);
    expect(fake.publisher).not.toHaveBeenCalled();
  });
  it("repairs an accepted receipt in a failed listener without dead-letter or another upload", async () => {
    const update = PublishJobStore.prototype.updateJobStatusForTenant;
    let fail = true;
    vi.spyOn(PublishJobStore.prototype, "updateJobStatusForTenant").mockImplementation(async function (...args) {
      if (args[2] === "published" && fail) { fail = false; throw new Error("projection unavailable"); }
      return update.apply(this, args);
    });
    await expect(fake.process!(job, "token")).rejects.toThrow("projection unavailable");
    fake.listeners.get("failed")!(job, new Error("projection unavailable")); await worker.close();
    expect(fake.deadletter).not.toHaveBeenCalled();
    expect(fake.upload).toHaveBeenCalledOnce();
    expect((await fixture.jobs.getJob(fixture.job.id))?.status).toBe("published");
  });
  it("retries a transient credential verification failure without starting a dispatch", async () => {
    fake.validate.mockRejectedValue(new Error("provider unavailable"));
    await expect(fake.process!(job, "token")).rejects.toMatchObject({ retryable: true });
    expect(job.discard).not.toHaveBeenCalled();
    expect(fake.upload).not.toHaveBeenCalled();
    expect(new PublishExecutionStore(directory).get("A", fixture.target.id)).toBeUndefined();
  });
  it("keeps invalid credentials terminal without pretending the upload started", async () => {
    fake.validate.mockResolvedValue(false);
    await expect(fake.process!(job, "token")).rejects.toBeInstanceOf(PublishFailureError);
    expect(job.discard).toHaveBeenCalledOnce();
    expect(fake.upload).not.toHaveBeenCalled();
  });
  it("does not mark a response without a provider ID as published", async () => {
    fake.upload.mockResolvedValue({ success: true });
    await expect(fake.process!(job, "token")).rejects.toBeInstanceOf(UnrecoverableError);
    expect(fixture.releases.getTarget("A", fixture.target.id)?.status).toBe("reconciling");
  });
});

it.each(["legacy", "destination", "account", "during-validation"])("does not upload when destination approval is %s", async (mode) => {
  const change = () => {
    if (mode === "legacy") {
      const file = path.join(directory, "releases.json"); const data = fs.readJsonSync(file);
      delete data.releases[0].approvedDestinations; fs.writeJsonSync(file, data);
    } else {
      const file = path.join(directory, "connectors.json"); const data = fs.readJsonSync(file);
      if (mode === "account") data.connectors[0].externalAccountId = "different-account";
      else data.destinations[0].externalDestinationId = "different-chat";
      fs.writeJsonSync(file, data);
    }
  };
  if (mode === "during-validation") fake.validate.mockImplementationOnce(async () => { change(); return true; });
  else change();
  await expect(fake.process!(job, "token")).rejects.toThrow();
  expect(fake.upload).not.toHaveBeenCalled();
  expect(new PublishExecutionStore(directory).get("A", fixture.target.id)).toBeUndefined();
});
