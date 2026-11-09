import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import type { Config } from "../../config";
import { ScheduleRouter } from "./schedule";
import { ScheduleStore } from "../../db/ScheduleStore";
import { ArtifactManifestStore } from "../../db/ArtifactManifestStore";
import { ImageEngine } from "../../services/ImageEngine";
import { dispatch } from "../testing/dispatch";
let directory: string, service: ScheduleRouter;
const auth = { tenantId: "A", name: "fixture-operator", permissions: ["schedule:reconcile"] };
beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), "schedule-confirm-assets-")); service = new ScheduleRouter({ dataDirPath: directory } as Config); });
afterEach(() => { service.stop(); vi.restoreAllMocks(); fs.removeSync(directory); });
async function create(extra = {}) {
  const result = await dispatch(service.router, "POST", "/", { auth, body: { name: "Checkpointed asset", contentType: "image", recurrence: "once", publishAt: "2099-01-01T09:00:00Z", ...extra } });
  expect(result.status).toBe(201); return (result.body as { schedule: { id: string } }).schedule.id;
}
async function held() {
  const id = await create(); vi.spyOn(ScheduleStore.prototype, "recordRunForTenant").mockRejectedValueOnce(new Error("projection failed after output checkpoint"));
  expect((await dispatch(service.router, "POST", `/${id}/run`, { auth })).body).toMatchObject({ success: false });
  const record = (await new ScheduleStore(directory).get(id))!; expect(record.execution!.state).toBe("reconciling"); return record;
}
function confirm(id: string, executionId: string, extra = {}, claims = auth) { return dispatch(service.router, "POST", `/${id}/confirm-assets`, { auth: claims, body: { executionId, evidenceReference: "local-review:fixture", verifiedOutcome: true, ...extra } }); }
it("confirms complete bound bytes once after restart, without invoking generation again", async () => {
  const producer = vi.spyOn(ImageEngine.prototype, "generateQuoteCard"), record = await held();
  const descriptor = record.execution!.pendingOutput!.artifacts[0];
  expect((await dispatch(service.router, "GET", `/${record.id}/outputs/${descriptor.id}`, { auth })).status).toBe(200);
  service.stop(); service = new ScheduleRouter({ dataDirPath: directory } as Config);
  const first = await confirm(record.id, record.execution!.id); expect(first.status).toBe(200);
  expect(first.body).toMatchObject({ schedule: { runCount: 1, status: "completed", lastOutput: { state: "assets-persisted" }, execution: { state: "completed", reconciliation: { evidenceReference: "local-review:fixture", operator: "fixture-operator" } } } });
  expect((await confirm(record.id, record.execution!.id)).status).toBe(200);
  expect((await new ScheduleStore(directory).get(record.id))!.runCount).toBe(1); expect(producer).toHaveBeenCalledTimes(1);
  expect((await confirm(record.id, record.execution!.id, { evidenceReference: "different-evidence" })).status).toBe(409);
});
it("requires reconciliation permission, workspace ownership and explicit evidence", async () => {
  const record = await held(), id = record.execution!.id;
  expect((await confirm(record.id, id, {}, { tenantId: "A", name: "reader", permissions: [] })).status).toBe(403);
  expect((await confirm(record.id, id, {}, { ...auth, tenantId: "B" })).status).toBe(404);
  expect((await confirm(record.id, id, { verifiedOutcome: false })).status).toBe(400);
  expect((await confirm(record.id, id, { evidenceReference: "" })).status).toBe(400);
  expect((await confirm(record.id, "wrong-execution")).status).toBe(409);
  expect((await new ScheduleStore(directory).get(record.id))!.execution!.state).toBe("reconciling");
});
it("cannot confirm a partial recipe or substitute caller-selected artifact IDs", async () => {
  vi.spyOn(ImageEngine.prototype, "generatePoster").mockReturnValue({ template: "poster", success: false, width: 1, height: 1, description: "failed" });
  const id = await create({ alsoGenerate: { thumbnail: true } }); await dispatch(service.router, "POST", `/${id}/run`, { auth });
  const record = (await new ScheduleStore(directory).get(id))!; expect(record.execution!.pendingOutput!.artifacts).toHaveLength(1);
  expect(record.execution!.producerContract!.expectedAssets).toBe(2);
  expect((await confirm(id, record.execution!.id, { artifactIds: ["unrelated"] })).status).toBe(409);
  expect((await new ScheduleStore(directory).get(id))!.runCount).toBe(0);
});
it.each(["bytes", "path", "owner"])("keeps changed %s bindings held", async (kind) => {
  const record = await held(), descriptor = record.execution!.pendingOutput!.artifacts[0], artifact = new ArtifactManifestStore(directory).findForTenant("A", descriptor.id)!;
  if (kind === "bytes") fs.writeFileSync(artifact.localPath, "changed");
  else { const file = path.join(directory, "artifact-manifests.json"), rows = fs.readJsonSync(file); if (kind === "path") rows[0].localPath = path.join(directory, "schedules.json"); else rows[0].tenantId = "B"; fs.writeJsonSync(file, rows); }
  expect((await confirm(record.id, record.execution!.id)).status).toBe(409);
  expect((await new ScheduleStore(directory).get(record.id))!.execution!.state).toBe("reconciling");
});
it("does not confirm an orphaned pre-output claim or a video receipt as generated assets", async () => {
  const id = await create(), store = new ScheduleStore(directory), record = (await store.get(id))!;
  const claim = (await store.claimForTenant("A", id, 0, record.nextRun!, { expectedAssets: 1, expectsVideo: false }))!;
  expect((await confirm(id, claim.id)).status).toBe(409);
  const file = path.join(directory, "schedules.json"), rows = fs.readJsonSync(file); rows[0].execution.producerContract.expectsVideo = true; fs.writeJsonSync(file, rows);
  expect((await confirm(id, claim.id)).status).toBe(409);
});
it("rejects checkpoint rebinding and stale verification digests", async () => {
  const record = await held(), store = new ScheduleStore(directory);
  await expect(store.checkpointOutputForTenant("A", record.id, record.execution!.id, record.execution!.pendingOutput!)).rejects.toThrow();
  await expect(store.confirmAssetsForTenant("A", record.id, record.execution!.id, "stale-digest", "evidence", "operator")).rejects.toThrow();
});

it("preserves checkpoint identity while a claimed producer appends outputs", async () => {
  const id = await create(), store = new ScheduleStore(directory), record = (await store.get(id))!;
  const claim = (await store.claimForTenant("A", id, 0, record.nextRun!, { expectedAssets: 2, expectsVideo: false }))!;
  const output = { recordedAt: new Date().toISOString(), state: "assets-persisted" as const, artifacts: [{ id: "first", mimeType: "image/svg+xml", checksumSha256: "a".repeat(64), sizeBytes: 1 }] };
  await store.checkpointOutputForTenant("A", id, claim.id, output);
  const replacement = { ...output, artifacts: [{ ...output.artifacts[0], id: "replacement" }] };
  await expect(store.checkpointOutputForTenant("A", id, claim.id, replacement)).rejects.toThrow();
  await expect(store.holdExecutionForTenant("A", id, claim.id, replacement)).rejects.toThrow();
  await store.checkpointOutputForTenant("A", id, claim.id, { ...output, artifacts: [...output.artifacts, { ...output.artifacts[0], id: "second" }] });
  await store.holdExecutionForTenant("A", id, claim.id);
  expect((await store.get(id))!.execution!.pendingOutput!.artifacts.map((item) => item.id)).toEqual(["first", "second"]);
});
