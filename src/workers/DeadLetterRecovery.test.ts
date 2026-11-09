import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Job } from "bullmq";
import type { Config } from "../config";
import { DeadLetterWorker, type DeadLetterPayload } from "./DeadLetterWorker";
import { publicationFixture } from "../server/testing/publicationFixture";
import { PublishExecutionStore } from "../db/PublishExecutionStore";
const fake = vi.hoisted(() => ({ process: undefined as ((job: Job<DeadLetterPayload>) => Promise<void>) | undefined, notify: vi.fn() }));
vi.mock("bullmq", () => ({ Worker: class {
  constructor(_name: string, processor: typeof fake.process) { fake.process = processor; }
  on() { return this; } async close() {} async pause() {}
} }));
vi.mock("./QueueManager", () => ({ getRedisConnection: () => ({}), QUEUE_NAMES: { DEADLETTER: "deadletter" } }));
vi.mock("../services/AlertingService", () => ({ AlertingService: class { notify = fake.notify; } }));
let directory: string;
let worker: DeadLetterWorker;
beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), "deadletter-recovery-")); fake.notify.mockReset(); });
afterEach(async () => { await worker?.close(); fs.removeSync(directory); });
it.each(["accepted", "dispatching"] as const)("preserves %s provider evidence against stale dead-letter work", async (state) => {
  const fixture = await publicationFixture(directory);
  const executions = new PublishExecutionStore(directory);
  const prepared = executions.prepare(fixture.binding, fixture.job.id);
  const dispatched = executions.dispatch(prepared);
  if (state === "accepted") executions.accept(dispatched, { externalId: "42" });
  worker = new DeadLetterWorker({ dataDirPath: directory } as Config);
  await fake.process!({ data: { type: "publish", jobId: fixture.job.id, originalQueue: "publish", failReason: "stale failure", attemptsMade: 3, originalJobData: { tenantId: "A" } } } as Job<DeadLetterPayload>);
  expect((await fixture.jobs.getJob(fixture.job.id))?.status).toBe(state === "accepted" ? "published" : "reconciling");
  expect(fixture.releases.getTarget("A", fixture.target.id)?.status).toBe(state === "accepted" ? "published" : "reconciling");
  expect(fake.notify).not.toHaveBeenCalled();
});
