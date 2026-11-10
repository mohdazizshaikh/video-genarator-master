import { ContentFreshnessEngine } from "../../services/ContentFreshnessEngine";
import { completeScheduledVideo } from "../../services/ScheduleVideoCompletion";
import { ArtifactManifestStore } from "../../db/ArtifactManifestStore";
import { ContentVersionStore } from "../../db/ContentVersionStore";
import { VideoMetadataStore } from "../../db/VideoMetadataStore";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import type { Config } from "../../config";
import type { ShortCreator } from "../../short-creator/ShortCreator";
import { ScheduleRouter } from "./schedule";
import { ScheduleStore } from "../../db/ScheduleStore";
import { dispatch } from "../testing/dispatch";
let directory: string;
let routers: ScheduleRouter[];
const auth = { tenantId: "A" };
beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), "schedule-claims-")); routers = []; });
afterEach(() => { routers.forEach((router) => router.stop()); vi.restoreAllMocks(); fs.removeSync(directory); });
function router(enqueue = vi.fn(() => "bound-video")) {
  const service = new ScheduleRouter({ dataDirPath: directory, videosDirPath: path.join(directory, "videos") } as Config); service.setShortCreator({ addToQueue: enqueue } as unknown as ShortCreator); routers.push(service); return service;
}
async function create(service: ScheduleRouter) {
  const response = await dispatch(service.router, "POST", "/", { auth, body: { name: "Claimed run", recurrence: "cron", cronExpression: "0 9 * * *", publishAt: "2099-01-01T09:00:00Z", platforms: ["youtube"] } });
  expect(response.status).toBe(201); return (response.body as { schedule: { id: string } }).schedule.id;
}
it("allows only one producer across independent router instances", async () => {
  const enqueue = vi.fn(() => "bound-video"), first = router(enqueue), second = router(enqueue), id = await create(first);
  const results = await Promise.all([dispatch(first.router, "POST", `/${id}/run`, { auth }), dispatch(second.router, "POST", `/${id}/run`, { auth })]);
  expect(enqueue).toHaveBeenCalledTimes(1); expect(results.map((result) => (result.body as { success: boolean }).success).sort()).toEqual([false, true]);
  expect(await new ScheduleStore(directory).get(id)).toMatchObject({ runCount: 0, execution: { state: "claimed", pendingOutput: { state: "video-queued", videoId: "bound-video" } } });
});
it("does not replay an orphaned pre-producer claim after restart", async () => {
  const first = router(), id = await create(first), store = new ScheduleStore(directory), schedule = (await store.get(id))!;
  const claim = await store.claimForTenant("A", id, 0, schedule.nextRun!); expect(claim).toBeDefined(); first.stop();
  const enqueue = vi.fn(() => "duplicate"), restarted = router(enqueue);
  expect((await dispatch(restarted.router, "POST", `/${id}/run`, { auth })).body).toMatchObject({ success: false });
  expect(enqueue).not.toHaveBeenCalled(); expect((await store.get(id))!.execution!.id).toBe(claim!.id);
});
it("holds ambiguous enqueue outcomes across restart without advancing or repeating the occurrence", async () => {
  const enqueue = vi.fn(() => { throw new Error("response lost after enqueue"); }), first = router(enqueue), id = await create(first);
  const before = (await new ScheduleStore(directory).get(id))!;
  expect((await dispatch(first.router, "POST", `/${id}/run`, { auth })).body).toMatchObject({ success: false });
  expect(await new ScheduleStore(directory).get(id)).toMatchObject({ runCount: 0, nextRun: before.nextRun, execution: { state: "reconciling" } });
  first.stop(); const restarted = router(enqueue);
  expect((await dispatch(restarted.router, "POST", `/${id}/run`, { auth })).body).toMatchObject({ success: false }); expect(enqueue).toHaveBeenCalledTimes(1);
});
it("binds claims to owner and occurrence and makes completion idempotent", async () => {
  const service = router(), id = await create(service), first = new ScheduleStore(directory), second = new ScheduleStore(directory), record = (await first.get(id))!;
  expect(await second.claimForTenant("B", id, 0, record.nextRun!)).toBeUndefined();
  expect(await second.claimForTenant("A", id, 1, record.nextRun!)).toBeUndefined();
  const claim = (await first.claimForTenant("A", id, 0, record.nextRun!))!;
  expect(await second.claimForTenant("A", id, 0, record.nextRun!)).toBeUndefined();
  await expect(second.recordRunForTenant("A", id, true, undefined, "wrong-token")).rejects.toThrow();
  await expect(second.holdExecutionForTenant("B", id, claim.id)).rejects.toThrow();
  expect(await second.recordRunForTenant("A", id, false)).toBeUndefined();
  await first.recordRunForTenant("A", id, true, undefined, claim.id);
  await second.recordRunForTenant("A", id, true, undefined, claim.id);
  await second.holdExecutionForTenant("A", id, claim.id);
  expect(await first.get(id)).toMatchObject({ runCount: 1, execution: { state: "completed" } });
});
it("does not allow caller patches or pause/resume to remove a held execution", async () => {
  const service = router(), id = await create(service), store = new ScheduleStore(directory), record = (await store.get(id))!;
  const claim = (await store.claimForTenant("A", id, 0, record.nextRun!))!; await store.holdExecutionForTenant("A", id, claim.id);
  await dispatch(service.router, "PATCH", `/${id}`, { auth, body: { execution: undefined, runCount: 4, name: "Edited" } });
  await store.updateStatusForTenant("A", id, "paused"); await store.updateStatusForTenant("A", id, "active");
  expect(await store.get(id)).toMatchObject({ runCount: 0, execution: { id: claim.id, state: "reconciling" } });
});

it("preserves unresolved executions against edits, terminal status and deletion across store instances", async () => {
  const service = router(), id = await create(service), first = new ScheduleStore(directory), second = new ScheduleStore(directory);
  const original = (await first.get(id))!, claim = (await first.claimForTenant("A", id, 0, original.nextRun!))!;
  for (const state of ["claimed", "reconciling"]) {
    if (state === "reconciling") await first.holdExecutionForTenant("A", id, claim.id);
    expect((await dispatch(service.router, "PATCH", `/${id}`, { auth, body: { name: "Replaced" } })).status).toBe(409);
    expect((await dispatch(service.router, "PATCH", `/${id}/status`, { auth, body: { status: "completed" } })).status).toBe(409);
    expect((await dispatch(service.router, "DELETE", `/${id}`, { auth })).status).toBe(409);
    await expect(second.update(id, { metadata: { contentType: "image" } })).rejects.toThrow("unresolved");
    await expect(second.delete(id)).rejects.toThrow("unresolved");
    expect((await dispatch(service.router, "DELETE", `/${id}`, { auth: { tenantId: "B" } })).status).toBe(404);
    await second.updateStatusForTenant("A", id, "paused"); await second.updateStatusForTenant("A", id, "active");
    expect(await first.get(id)).toMatchObject({ name: original.name, runCount: 0, execution: { id: claim.id, state } });
  }
});

it("rejects stale configuration claims and snapshots the accepted producer configuration", async () => {
  const { scheduleConfigurationDigest } = await import("../../db/ScheduleStore");
  const service = router(), id = await create(service), first = new ScheduleStore(directory), second = new ScheduleStore(directory), original = (await first.get(id))!;
  const stale = scheduleConfigurationDigest(original);
  await second.updateForTenant("A", id, { name: "New producer name", metadata: { contentType: "image" } });
  expect(await first.claimForTenant("A", id, 0, original.nextRun!, undefined, stale)).toBeUndefined();
  const fresh = (await first.get(id))!;
  const claim = (await first.claimForTenant("A", id, 0, fresh.nextRun!, { expectedAssets: 1, expectsVideo: false }, scheduleConfigurationDigest(fresh)))!;
  expect(claim.configuration).toMatchObject({ name: "New producer name", metadata: { contentType: "image" } });
  fresh.metadata.contentType = "video";
  expect((await second.get(id))!.execution!.configuration!.metadata.contentType).toBe("image");
  await first.recordRunForTenant("A", id, true, undefined, claim.id);
  await second.updateForTenant("A", id, { name: "Future run" });
  expect((await second.get(id))!.execution!.configuration!.name).toBe("New producer name");
  expect(await second.deleteForTenant("A", id)).toBe(true);
});

it("ignores forged execution fields in generic store updates", async () => {
  const service = router(), id = await create(service), store = new ScheduleStore(directory), original = (await store.get(id))!;
  const claim = (await store.claimForTenant("A", id, 0, original.nextRun!))!;
  await store.updateForTenant("A", id, { execution: undefined, runCount: 99, failureCount: 99, lastOutput: { state: "assets-persisted", recordedAt: "forged", artifacts: [] } });
  expect(await store.get(id)).toMatchObject({ runCount: 0, failureCount: 0, execution: { id: claim.id } });
  expect((await store.get(id))!.lastOutput).toBeUndefined();
});

it("does not enqueue from a router snapshot edited before claim acquisition", async () => {
  const enqueue = vi.fn(() => "unexpected-video"), service = router(enqueue), id = await create(service);
  const originalClaim = ScheduleStore.prototype.claimForTenant;
  vi.spyOn(ScheduleStore.prototype, "claimForTenant").mockImplementationOnce(async function (...args) {
    await new ScheduleStore(directory).updateForTenant("A", id, { name: "Changed before claim" });
    return originalClaim.apply(new ScheduleStore(directory), args);
  });
  expect((await dispatch(service.router, "POST", `/${id}/run`, { auth })).body).toMatchObject({ success: false });
  expect(enqueue).not.toHaveBeenCalled();
  expect(await new ScheduleStore(directory).get(id)).toMatchObject({ name: "Changed before claim", runCount: 0 });
});

async function renderEvidence(owner = "A", ready = true) {
  const videos = path.join(directory, "videos"), location = path.join(videos, "bound-video.mp4");
  fs.ensureDirSync(videos);
  fs.writeFileSync(location, "fixture video bytes");
  new VideoMetadataStore(directory).upsertFromScenesSync({ tenantId: owner, videoId: "bound-video", scenes: [] });
  const artifact = await new ArtifactManifestStore(directory).register({ tenantId: owner, kind: "video", mimeType: "video/mp4", lifecycle: "active", localPath: location });
  const versions = new ContentVersionStore(directory);
  const version = versions.create({ workspaceId: owner, createdBy: "render", title: "Render", script: "Fixture", scenes: [], metadata: {}, sourceUrls: [], contentSignature: "render:bound-video" });
  if (ready) versions.updateRender(owner, version.id, { status: "ready", renderOutputPath: location });
  return { videos, location, artifact, version };
}

it("advances a queued video once from owned durable evidence after restart", async () => {
  const enqueue = vi.fn(() => "bound-video"), service = router(enqueue), id = await create(service);
  await dispatch(service.router, "POST", `/${id}/run`, { auth });
  service.stop();
  const store = new ScheduleStore(directory), pending = (await store.pendingVideos())[0];
  expect(pending).toMatchObject({ id, runCount: 0 });
  await expect(store.recordRunForTenant("A", id, true, undefined, pending.execution!.id)).rejects.toThrow("verified render evidence");
  const { videos, artifact, version } = await renderEvidence();
  const results = await Promise.all([completeScheduledVideo(directory, videos, "A", id), completeScheduledVideo(directory, videos, "A", id)]);
  expect(results.sort()).toEqual([false, true]);
  expect(await store.get(id)).toMatchObject({ runCount: 1, execution: { state: "completed" }, lastOutput: { state: "video-completed", videoId: "bound-video", videoArtifactId: artifact.id, contentVersionId: version.id } });
  expect(await store.pendingVideos()).toEqual([]);
  expect(enqueue).toHaveBeenCalledTimes(1);
});

it.each(["missing", "foreign", "draft", "tampered", "symlink", "partial"] as const)("keeps %s video evidence pending without advancing or replay", async (scenario) => {
  const enqueue = vi.fn(() => "bound-video"), service = router(enqueue), id = await create(service);
  if (scenario === "partial") await dispatch(service.router, "PATCH", `/${id}`, { auth, body: { metadata: { contentType: "video", alsoGenerate: { quoteCard: true } } } });
  const store = new ScheduleStore(directory);
  if (scenario === "partial") {
    const schedule = (await store.get(id))!;
    const claim = (await store.claimForTenant("A", id, 0, schedule.nextRun!, { expectsVideo: true, expectedAssets: 1 }))!;
    await store.checkpointOutputForTenant("A", id, claim.id, { state: "video-queued", videoId: "bound-video", artifacts: [], recordedAt: new Date().toISOString() });
  } else await dispatch(service.router, "POST", `/${id}/run`, { auth });
  const videos = path.join(directory, "videos");
  if (scenario !== "missing") {
    const { location } = await renderEvidence(scenario === "foreign" ? "B" : "A", scenario !== "draft");
    if (scenario === "tampered") fs.writeFileSync(location, "altered video bytes");
    if (scenario === "symlink") {
      const target = path.join(directory, "replacement.mp4");
      fs.renameSync(location, target); fs.symlinkSync(target, location);
    }
  }
  expect(await completeScheduledVideo(directory, videos, "A", id)).toBe(false);
  expect(await store.get(id)).toMatchObject({ runCount: 0, execution: { state: "claimed" } });
  await dispatch(service.router, "POST", `/${id}/run`, { auth });
  expect(enqueue).toHaveBeenCalledTimes(scenario === "partial" ? 0 : 1);
});

it("reserves producer evidence from workspace content-version mutations", async () => {
  const { ContentVersionsRouter } = await import("./contentversions");
  const api = new ContentVersionsRouter(directory).router;
  const body = { title: "Draft", script: "Fixture", scenes: [], sourceUrls: [], metadata: {}, contentSignature: "ordinary" };
  for (const forged of [{ contentSignature: "render:bound-video" }, { createdBy: "render" }])
    expect((await dispatch(api, "POST", "/", { auth, body: { ...body, ...forged } })).status).toBe(400);
  const { version, artifact } = await renderEvidence();
  expect((await dispatch(api, "PATCH", `/${version.id}`, { auth, body })).status).toBe(409);
  expect((await dispatch(api, "PATCH", `/${version.id}/render`, { auth, body: { status: "ready", artifactId: artifact.id } })).status).toBe(409);
  expect((await dispatch(api, "PATCH", `/${version.id}/render`, { auth: { tenantId: "B" }, body: { status: "ready", artifactId: artifact.id } })).status).toBe(404);
});

it("records freshness only after the restarted runner verifies a paused one-time video", async () => {
  const freshness = vi.spyOn(ContentFreshnessEngine.prototype, "record");
  const enqueue = vi.fn(() => "bound-video"), first = router(enqueue), id = await create(first);
  await dispatch(first.router, "PATCH", `/${id}`, { auth, body: { recurrence: "once" } });
  await dispatch(first.router, "POST", `/${id}/run`, { auth });
  await dispatch(first.router, "PATCH", `/${id}/status`, { auth, body: { status: "paused" } });
  expect(freshness).not.toHaveBeenCalled();
  first.stop();
  await renderEvidence();
  const store = new ScheduleStore(directory);
  vi.useFakeTimers();
  try {
    const restarted = router(enqueue);
    await vi.advanceTimersByTimeAsync(60000);
    restarted.stop();
  } finally { vi.useRealTimers(); }
  await vi.waitFor(async () => {
    expect(await store.get(id)).toMatchObject({ status: "completed", runCount: 1, lastOutput: { state: "video-completed" } });
    expect(freshness).toHaveBeenCalledExactlyOnceWith("Claimed run", "General");
  });
  expect(enqueue).toHaveBeenCalledTimes(1);
});
