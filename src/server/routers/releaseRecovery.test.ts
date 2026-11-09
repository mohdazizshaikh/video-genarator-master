import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { Config } from "../../config";
import { ReleasesRouter } from "./releases";
import { publicationFixture } from "../testing/publicationFixture";
import { dispatch } from "../testing/dispatch";
import { PublishExecutionStore } from "../../db/PublishExecutionStore";

const queue = vi.hoisted(() => ({ add: vi.fn(), remove: vi.fn() }));
vi.mock("../../workers/QueueManager", () => ({ createPublishQueue: () => queue }));
let directory: string;
let fixture: Awaited<ReturnType<typeof publicationFixture>>;
let router: ReleasesRouter["router"];
beforeEach(async () => {
  vi.stubEnv("TENANT_KEYS_SECRET", "test-only-release-queue-key");
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "release-recovery-api-"));
  fixture = await publicationFixture(directory);
  queue.add.mockReset().mockResolvedValue({ id: "queued" }); queue.remove.mockReset().mockResolvedValue(1);
  router = new ReleasesRouter({ dataDirPath: directory, redisEnabled: true } as Config).router;
});
afterEach(() => { vi.unstubAllEnvs(); fs.removeSync(directory); });
const auth = { tenantId: "A" };
function enqueue(body: Record<string, unknown> = {}) { return dispatch(router, "POST", `/${fixture.release.id}/queue`, { auth, body: { targetId: fixture.target.id, ...body } }); }
describe("release queue recovery contract", () => {
  it("reuses one persisted job and stable queue identity for repeated requests", async () => {
    const first = await enqueue(), second = await enqueue();
    expect(first.status).toBe(202); expect(second.status).toBe(202);
    expect(first.body).toEqual(second.body);
    expect(await fixture.jobs.listJobsForTenant("A")).toHaveLength(1);
    expect(queue.add.mock.calls.map((call) => call[2].jobId)).toEqual([`release-target-${fixture.target.id}`, `release-target-${fixture.target.id}`]);
  });
  it("blocks altered due times on an already queued target without creating another job", async () => {
    expect((await enqueue({ scheduleAt: new Date(Date.now() + 60000).toISOString() })).status).toBe(409);
    expect(await fixture.jobs.listJobs()).toHaveLength(1);
    expect(queue.add).not.toHaveBeenCalled();
  });
  it("refuses legacy failed targets without proof and blocks started checkpoints", async () => {
    fixture.releases.updateTarget("A", fixture.target.id, { status: "failed" });
    expect((await enqueue()).status).toBe(409);
    expect(queue.add).not.toHaveBeenCalled();
    fixture.releases.updateTarget("A", fixture.target.id, { retryDisposition: "not_dispatched" });
    const store = new PublishExecutionStore(directory);
    store.dispatch(store.prepare(fixture.binding, fixture.job.id));
    expect((await enqueue()).status).toBe(409);
    expect(queue.remove).not.toHaveBeenCalled();
  });
  it("does not swallow a locked queue job or reset a failed target before removing it", async () => {
    fixture.releases.updateTarget("A", fixture.target.id, { status: "failed", retryDisposition: "not_dispatched" });
    queue.remove.mockResolvedValue(0);
    expect((await enqueue()).status).toBe(409);
    expect(fixture.releases.getTarget("A", fixture.target.id)?.status).toBe("failed");
    expect(queue.add).not.toHaveBeenCalled();
    queue.remove.mockRejectedValue(new Error("Redis unavailable"));
    expect((await enqueue()).status).toBe(409);
    expect(fixture.releases.getTarget("A", fixture.target.id)?.status).toBe("failed");
  });
  it("allows explicit recovery of confirmed pre-dispatch failure without a phantom job", async () => {
    fixture.releases.updateTarget("A", fixture.target.id, { status: "failed", retryDisposition: "not_dispatched" });
    await fixture.jobs.updateJobStatusForTenant("A", fixture.job.id, "failed");
    const result = await enqueue();
    expect(result.status).toBe(202);
    expect(queue.remove).toHaveBeenCalledWith(`release-target-${fixture.target.id}`);
    expect((result.body as { jobId: string }).jobId).toBe(fixture.job.id);
    expect((await fixture.jobs.getJob(fixture.job.id))?.status).toBe("queued");
    expect(await fixture.jobs.listJobs()).toHaveLength(1);
  });
  it("keeps ownership checks before queue mutation", async () => {
    expect((await dispatch(router, "POST", `/${fixture.release.id}/queue`, { body: { targetId: fixture.target.id } })).status).toBe(401);
    expect((await dispatch(router, "POST", `/${fixture.release.id}/queue`, { auth: { tenantId: "B" }, body: { targetId: fixture.target.id } })).status).toBe(404);
    expect(queue.add).not.toHaveBeenCalled();
  });
});

describe("destination-bound release approval", () => {
  function pending() { return fixture.releases.createRelease({ workspaceId: "A", contentVersionId: fixture.version.id, approvalStatus: "pending" }); }
  function approve(id: string, destinations: unknown, claims = { tenantId: "A", permissions: ["release:approve"] }) {
    return dispatch(router, "POST", `/${id}/approve`, { auth: claims, body: { destinations } });
  }
  const binding = () => [{ connectorId: fixture.connector.id, destinationId: fixture.destination.id }];
  it("requires approval permission and a nonempty unique owned verified destination set", async () => {
    const release = pending();
    expect((await approve(release.id, binding(), { tenantId: "A", permissions: [] })).status).toBe(403);
    for (const invalid of [undefined, [], [...binding(), ...binding()], [{ connectorId: "foreign", destinationId: fixture.destination.id }], [{ connectorId: fixture.connector.id, destinationId: 7 }]]) {
      expect((await approve(release.id, invalid)).status).toBe(409);
      expect(fixture.releases.getRelease("A", release.id)?.approvalStatus).toBe("pending");
    }
    expect((await approve(release.id, binding())).status).toBe(200);
    expect(fixture.releases.getRelease("A", release.id)?.approvedDestinations).toEqual([expect.objectContaining({ externalDestinationId: "fixture-chat", platform: "telegram" })]);
  });
  it("rejects adding an unapproved destination but allows an approved one", async () => {
    const release = pending(); await approve(release.id, binding());
    const other = fixture.connectors.createDestination({ workspaceId: "A", connectorId: fixture.connector.id, externalDestinationId: "different-chat", displayName: "Other", status: "verified", verificationEvidence: {} });
    const target = (destinationId: string) => dispatch(router, "POST", `/${release.id}/targets`, { auth, body: { connectorId: fixture.connector.id, destinationId, idempotencyKey: destinationId } });
    expect((await target(other.id)).status).toBe(409);
    expect((await target(fixture.destination.id)).status).toBe(201);
    expect((await approve(release.id, binding())).status).toBe(409);
  });
  it("blocks queueing legacy approval or changed external destination identities", async () => {
    const file = path.join(directory, "releases.json");
    const original = fs.readJsonSync(file);
    const legacy = structuredClone(original); delete legacy.releases[0].approvedDestinations;
    fs.writeJsonSync(file, legacy);
    expect((await enqueue()).status).toBe(409);
    fs.writeJsonSync(file, original);
    const connectorsFile = path.join(directory, "connectors.json");
    const changed = fs.readJsonSync(connectorsFile); changed.destinations[0].externalDestinationId = "swapped-chat"; fs.writeJsonSync(connectorsFile, changed);
    expect((await enqueue()).status).toBe(409);
    expect(queue.add).not.toHaveBeenCalled();
  });
});

describe("publication confirmation API", () => {
  async function hold() {
    const executions = new PublishExecutionStore(directory);
    const execution = executions.dispatch(executions.prepare(fixture.binding, fixture.job.id));
    executions.reconcile(execution);
    fixture.releases.updateTarget("A", fixture.target.id, { status: "reconciling" });
    return execution;
  }
  function confirm(body: Record<string, unknown>, claims = { tenantId: "A", permissions: ["release:approve"], name: "operator" }) {
    return dispatch(router, "POST", `/${fixture.release.id}/targets/${fixture.target.id}/confirm-publication`, { auth: claims, body });
  }
  it("requires permission, provider verification and the current owned request", async () => {
    const execution = await hold();
    const body = { requestId: execution.requestId, externalId: "42", evidenceReference: "provider-case-123", verifiedOnProvider: true };
    expect((await confirm(body, { tenantId: "A", permissions: [], name: "viewer" })).status).toBe(403);
    expect((await confirm(body, { tenantId: "B", permissions: ["release:approve"], name: "foreign" })).status).toBe(404);
    expect((await confirm({ ...body, verifiedOnProvider: false })).status).toBe(400);
    expect((await confirm({ ...body, requestId: "stale" })).status).toBe(409);
    expect((await confirm(body)).status).toBe(200);
    expect((await confirm(body)).status).toBe(200);
    expect(fixture.releases.getTarget("A", fixture.target.id)?.status).toBe("published");
    expect((await fixture.jobs.getJob(fixture.job.id))?.status).toBe("published");
    expect(queue.add).not.toHaveBeenCalled(); expect(queue.remove).not.toHaveBeenCalled();
    const detail = await dispatch(router, "GET", `/${fixture.release.id}`, { auth });
    expect(detail.body).toMatchObject({ targets: [expect.objectContaining({ execution: expect.objectContaining({ requestId: execution.requestId, observation: expect.objectContaining({ recordedBy: "operator" }) }) })] });
  });
  it("does not invent a checkpoint for a legacy unknown outcome", async () => {
    fixture.releases.updateTarget("A", fixture.target.id, { status: "reconciling" });
    expect((await confirm({ requestId: "missing", externalId: "42", evidenceReference: "provider-case-123", verifiedOnProvider: true })).status).toBe(409);
    expect(new PublishExecutionStore(directory).get("A", fixture.target.id)).toBeUndefined();
    expect(queue.add).not.toHaveBeenCalled();
  });
});
