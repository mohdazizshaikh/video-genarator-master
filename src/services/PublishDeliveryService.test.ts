import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { publicationFixture } from "../server/testing/publicationFixture";
import { PublishDeliveryService } from "./PublishDeliveryService";
import { PublishExecutionStore } from "../db/PublishExecutionStore";
import { PublishJobStore } from "../db/PublishJobStore";
import { PublishFailureError } from "../publishers/failureClassification";

let directory: string;
let fixture: Awaited<ReturnType<typeof publicationFixture>>;
beforeEach(async () => { directory = fs.mkdtempSync(path.join(os.tmpdir(), "publish-recovery-")); fixture = await publicationFixture(directory); });
afterEach(() => { vi.restoreAllMocks(); fs.removeSync(directory); });
const receipt = { success: true, externalId: "message-42", publishedUrl: "https://provider.example/video/42" };
describe("publication acceptance checkpoints", () => {
  it("persists a receipt before projections and never uploads again on replay", async () => {
    const upload = vi.fn(async () => receipt);
    await new PublishDeliveryService(directory).deliver(fixture.binding, fixture.job.id, upload);
    fs.removeSync(fixture.media);
    await new PublishDeliveryService(directory).deliver(fixture.binding, fixture.job.id, upload);
    expect(upload).toHaveBeenCalledTimes(1);
    expect((await fixture.jobs.getJob(fixture.job.id))?.status).toBe("published");
    expect(fixture.releases.getRelease("A", fixture.release.id)?.status).toBe("published");
    expect(await fixture.jobs.getAttempts(fixture.job.id)).toHaveLength(1);
  });
  it("holds a lost acknowledgement instead of retrying an uncertain upload", async () => {
    const upload = vi.fn(async () => { throw new Error("socket disconnected after acceptance"); });
    await expect(new PublishDeliveryService(directory).deliver(fixture.binding, fixture.job.id, upload)).rejects.toThrow("unknown");
    await expect(new PublishDeliveryService(directory).deliver(fixture.binding, fixture.job.id, upload)).rejects.toThrow("retry is blocked");
    expect(upload).toHaveBeenCalledTimes(1);
    expect(fixture.releases.getTarget("A", fixture.target.id)?.status).toBe("reconciling");
    expect((await fixture.jobs.getJob(fixture.job.id))?.status).toBe("reconciling");
  });
  it("holds a crashed dispatch and resumes a prepared request that never started", async () => {
    const store = new PublishExecutionStore(directory);
    const prepared = store.prepare(fixture.binding, fixture.job.id);
    fixture.releases.updateTarget("A", fixture.target.id, { status: "publishing", providerRequestId: prepared.requestId });
    const upload = vi.fn(async () => receipt);
    await new PublishDeliveryService(directory).deliver(fixture.binding, fixture.job.id, upload);
    expect(upload).toHaveBeenCalledOnce();
    const other = await publicationFixture(directory);
    store.dispatch(store.prepare(other.binding, other.job.id));
    await expect(new PublishDeliveryService(directory).deliver(other.binding, other.job.id, upload)).rejects.toThrow("unknown");
    expect(upload).toHaveBeenCalledOnce();
  });
  it("retries only a confirmed rejection using a new persisted request identity", async () => {
    const upload = vi.fn().mockResolvedValueOnce({ success: false, deliveryOutcome: "not_accepted", errorCode: "rate_limited", error: "retry after 30", retryAfterSeconds: 30 }).mockResolvedValueOnce(receipt);
    const service = new PublishDeliveryService(directory);
    await expect(service.deliver(fixture.binding, fixture.job.id, upload)).rejects.toBeInstanceOf(PublishFailureError);
    await service.deliver(fixture.binding, fixture.job.id, upload);
    const history = service.executions.list("A", fixture.target.id);
    expect(history.map((row) => row.state)).toEqual(["rejected", "accepted"]);
    expect(history[0].requestId).not.toBe(history[1].requestId);
    expect(fixture.releases.getTarget("A", fixture.target.id)?.attempts).toBe(2);
  });
  it("does not treat a generic retryable provider error as proof of rejection", async () => {
    await expect(new PublishDeliveryService(directory).deliver(fixture.binding, fixture.job.id, async () => ({ success: false, errorCode: "provider_unavailable", error: "timeout" }))).rejects.toThrow("unknown");
    expect(new PublishExecutionStore(directory).get("A", fixture.target.id)?.state).toBe("reconciling");
  });
  it.each([undefined, "undefined", "null", "", "bad id"])("requires a canonical external ID (%s)", async (externalId) => {
    await expect(new PublishDeliveryService(directory).deliver(fixture.binding, fixture.job.id, async () => ({ success: true, externalId }))).rejects.toThrow("unknown");
  });
  it("normalizes legacy provider ID results and omits unsafe publication URLs", async () => {
    const result = await new PublishDeliveryService(directory).deliver(fixture.binding, fixture.job.id, async () => ({ success: true, platformVideoId: "provider-id", publishedUrl: "javascript:alert(1)" }));
    expect(result).toEqual({ externalId: "provider-id", publishedUrl: undefined });
  });
  it("repairs failed job persistence from confirmed acceptance without another upload", async () => {
    const update = PublishJobStore.prototype.updateJobStatusForTenant;
    let fail = true;
    vi.spyOn(PublishJobStore.prototype, "updateJobStatusForTenant").mockImplementation(async function (...args) {
      if (args[2] === "published" && fail) { fail = false; throw new Error("projection write failed"); }
      return update.apply(this, args);
    });
    const upload = vi.fn(async () => receipt);
    await expect(new PublishDeliveryService(directory).deliver(fixture.binding, fixture.job.id, upload)).rejects.toThrow("projection write");
    expect(new PublishExecutionStore(directory).get("A", fixture.target.id)?.state).toBe("accepted");
    await new PublishDeliveryService(directory).recover(fixture.binding, fixture.job.id);
    expect(upload).toHaveBeenCalledOnce();
    expect((await fixture.jobs.getJob(fixture.job.id))?.status).toBe("published");
  });
  it("blocks re-upload when acceptance could not be saved", async () => {
    vi.spyOn(PublishExecutionStore.prototype, "accept").mockImplementationOnce(() => { throw new Error("disk write failed"); });
    const upload = vi.fn(async () => receipt);
    await expect(new PublishDeliveryService(directory).deliver(fixture.binding, fixture.job.id, upload)).rejects.toThrow("unknown");
    await expect(new PublishDeliveryService(directory).deliver(fixture.binding, fixture.job.id, upload)).rejects.toThrow("unknown");
    expect(upload).toHaveBeenCalledOnce();
  });
  it("does not dispatch another request during overlapping deliveries", async () => {
    let finish!: (value: typeof receipt) => void;
    const upload = vi.fn(() => new Promise<typeof receipt>((resolve) => { finish = resolve; }));
    const first = new PublishDeliveryService(directory).deliver(fixture.binding, fixture.job.id, upload);
    await vi.waitFor(() => expect(upload).toHaveBeenCalledOnce());
    await expect(new PublishDeliveryService(directory).deliver(fixture.binding, fixture.job.id, upload)).rejects.toThrow("unknown");
    finish(receipt); await first;
    expect(upload).toHaveBeenCalledOnce();
    expect(new PublishExecutionStore(directory).get("A", fixture.target.id)?.state).toBe("accepted");
  });
  it("enforces workspace and immutable execution identity before provider calls", async () => {
    const upload = vi.fn(async () => receipt);
    await expect(new PublishDeliveryService(directory).deliver({ ...fixture.binding, tenantId: "B" }, fixture.job.id, upload)).rejects.toThrow("identity");
    new PublishExecutionStore(directory).prepare(fixture.binding, fixture.job.id);
    await expect(new PublishDeliveryService(directory).deliver({ ...fixture.binding, contentDigest: "changed" }, fixture.job.id, upload)).rejects.toThrow("identity");
    expect(upload).not.toHaveBeenCalled();
  });
  it("preserves corrupt execution files", async () => {
    const file = path.join(directory, "publish-executions.json");
    fs.writeFileSync(file, "{corrupt");
    await expect(new PublishDeliveryService(directory).recover(fixture.binding, fixture.job.id)).rejects.toThrow();
    expect(fs.readFileSync(file, "utf8")).toBe("{corrupt");
  });
});

describe("operator publication confirmation", () => {
  async function held() {
    const service = new PublishDeliveryService(directory);
    await expect(service.deliver(fixture.binding, fixture.job.id, async () => { throw new Error("lost response"); })).rejects.toThrow();
    return { service, execution: service.executions.get("A", fixture.target.id)! };
  }
  it("records the observation before projections, repairs on repeat, and never uploads", async () => {
    const { service, execution } = await held();
    const update = vi.spyOn(PublishJobStore.prototype, "updateJobStatusForTenant").mockRejectedValueOnce(new Error("projection failed"));
    await expect(service.confirmObservedPublication(fixture.binding, fixture.job.id, execution.requestId, "message-42", "provider-case-123", "operator")).rejects.toThrow("projection failed");
    expect(service.executions.get("A", fixture.target.id)).toMatchObject({ state: "accepted", observation: { recordedBy: "operator", evidenceReference: "provider-case-123" } });
    update.mockRestore();
    await service.confirmObservedPublication(fixture.binding, fixture.job.id, execution.requestId, "message-42", "provider-case-123", "operator");
    const upload = vi.fn();
    await service.deliver(fixture.binding, fixture.job.id, upload);
    expect(upload).not.toHaveBeenCalled();
    expect((await fixture.jobs.getJob(fixture.job.id))?.status).toBe("published");
    expect(await fixture.jobs.getAttempts(fixture.job.id)).toHaveLength(1);
  });
  it("rejects stale requests, changed owner/content and invalid evidence without resolving the hold", async () => {
    const { service, execution } = await held();
    for (const [binding, request, id, evidence] of [
      [fixture.binding, "stale-request", "42", "provider-case-123"],
      [{ ...fixture.binding, tenantId: "B" }, execution.requestId, "42", "provider-case-123"],
      [{ ...fixture.binding, contentDigest: "changed" }, execution.requestId, "42", "provider-case-123"],
      [fixture.binding, execution.requestId, "undefined", "provider-case-123"],
      [fixture.binding, execution.requestId, "42", "too short"],
      [fixture.binding, execution.requestId, "42", "case-reference\nwith newline"],
    ] as const) await expect(service.confirmObservedPublication(binding, fixture.job.id, request, id, evidence, "operator")).rejects.toThrow();
    expect(service.executions.get("A", fixture.target.id)?.state).toBe("reconciling");
  });
  it("does not overwrite a confirmed receipt or its first operator observation", async () => {
    const { service, execution } = await held();
    await service.confirmObservedPublication(fixture.binding, fixture.job.id, execution.requestId, "42", "provider-case-123", "operator");
    await expect(service.confirmObservedPublication(fixture.binding, fixture.job.id, execution.requestId, "43", "provider-case-456", "other")).rejects.toThrow();
    expect(service.executions.get("A", fixture.target.id)).toMatchObject({ receipt: { externalId: "42" }, observation: { recordedBy: "operator" } });
  });
  it.each(["prepared", "dispatching", "rejected"] as const)("cannot resolve a %s request", async (state) => {
    const service = new PublishDeliveryService(directory);
    let execution = service.executions.prepare(fixture.binding, fixture.job.id);
    if (state !== "prepared") execution = service.executions.dispatch(execution);
    if (state === "rejected") execution = service.executions.reject(execution, "payload_rejected");
    await expect(service.confirmObservedPublication(fixture.binding, fixture.job.id, execution.requestId, "42", "provider-case-123", "operator")).rejects.toThrow();
    expect(service.executions.get("A", fixture.target.id)?.state).toBe(state);
  });
});
