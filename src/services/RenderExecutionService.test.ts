import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RenderExecutionService } from "./RenderExecutionService";
import { RenderExecutionStore } from "../db/RenderExecutionStore";
import { RenderJobStore } from "../db/RenderJobStore";
import { ArtifactManifestStore } from "../db/ArtifactManifestStore";
import { ContentVersionStore } from "../db/ContentVersionStore";
import type { RenderJobPayload } from "../workers/RenderWorker";
import { OrientationEnum, renderConfig } from "../types/shorts";

let directory: string;
let jobs: RenderJobStore;
let payload: RenderJobPayload;
let outputPath: string;
let renderer: ConstructorParameters<typeof RenderExecutionService>[1];
let enqueue: ReturnType<typeof vi.fn>;
beforeEach(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "render-execution-"));
  jobs = new RenderJobStore(directory);
  const record = await jobs.create({ tenantId: "a", scriptPlanId: "", videoType: "short", language: "en", subtitleLanguage: "en", orientation: OrientationEnum.portrait, category: "Tech", namingKey: "test-key" });
  payload = { tenantId: "a", renderJobId: record.id, scriptPlanId: "", sceneInput: [], config: renderConfig.parse({}), videoType: "short", orientation: OrientationEnum.portrait, category: "Tech", namingKey: "test-key" };
  outputPath = path.join(directory, "video-one.mp4");
  enqueue = vi.fn(() => "video-one");
  renderer = { addToQueue: enqueue, status: vi.fn(() => "ready"), getVideoPath: () => outputPath, ownsVideo: () => true };
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); fs.removeSync(directory); });
async function output() {
  fs.writeFileSync(outputPath, "rendered video fixture");
  const artifact = await new ArtifactManifestStore(directory).register({ tenantId: "a", localPath: outputPath, kind: "video", mimeType: "video/mp4", lifecycle: "active" });
  const versions = new ContentVersionStore(directory);
  const version = versions.create({ workspaceId: "a", title: "Test", script: "Test", scenes: [], metadata: {}, sourceUrls: [], contentSignature: "render:video-one" });
  versions.updateRender("a", version.id, { status: "ready", renderOutputPath: outputPath });
  return { artifact, version };
}
describe("recoverable owned render execution", () => {
  it("persists output links and reuses completed execution after reconstruction", async () => {
    const { artifact, version } = await output();
    const first = await new RenderExecutionService(directory, renderer).run(payload);
    expect(first).toMatchObject({ state: "completed", videoId: "video-one", artifactId: artifact.id, contentVersionId: version.id });
    expect(await jobs.get(payload.renderJobId)).toMatchObject({ status: "rendered", executionId: first.id, videoId: "video-one", artifactId: artifact.id, contentVersionId: version.id });
    expect((await new RenderExecutionService(directory, renderer).run(payload)).id).toBe(first.id);
    expect(enqueue).toHaveBeenCalledTimes(1);
  });
  it("resumes a confirmed video binding instead of enqueueing another render", async () => {
    await output();
    const store = new RenderExecutionStore(directory);
    const { execution } = store.claim("a", payload.renderJobId, 60000);
    store.attachVideo("a", payload.renderJobId, execution.id, "video-one");
    await new RenderExecutionService(directory, renderer).run(payload);
    expect(enqueue).not.toHaveBeenCalled();
  });
  it("holds a crash between claim and video binding without enqueueing again", async () => {
    new RenderExecutionStore(directory).claim("a", payload.renderJobId, 60000);
    const service = new RenderExecutionService(directory, renderer);
    await expect(service.run(payload)).rejects.toThrow("no confirmed video binding");
    await expect(new RenderExecutionService(directory, renderer).run(payload)).rejects.toThrow("requires reconciliation");
    expect(enqueue).not.toHaveBeenCalled();
    expect((await jobs.get(payload.renderJobId))?.status).toBe("reconciling");
  });
  it("bounds processing time using the persisted deadline and clears polling timers", async () => {
    vi.useFakeTimers();
    renderer.status = vi.fn(() => "processing");
    const operation = new RenderExecutionService(directory, renderer, 1000).run(payload);
    const rejected = expect(operation).rejects.toThrow("deadline exceeded");
    await vi.advanceTimersByTimeAsync(1001);
    await rejected;
    expect(new RenderExecutionStore(directory).get("a", payload.renderJobId)?.state).toBe("reconciling");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("does not renew the deadline on a stalled re-delivery", async () => {
    vi.useFakeTimers();
    const store = new RenderExecutionStore(directory);
    const { execution } = store.claim("a", payload.renderJobId, 1000);
    store.attachVideo("a", payload.renderJobId, execution.id, "video-one");
    vi.setSystemTime(Date.now() + 1001);
    await expect(new RenderExecutionService(directory, renderer).run(payload)).rejects.toThrow("deadline");
    expect(enqueue).not.toHaveBeenCalled();
  });
  it("requires both owned artifact and ready content version before completion", async () => {
    fs.writeFileSync(outputPath, "orphan output");
    await expect(new RenderExecutionService(directory, renderer).run(payload)).rejects.toThrow("missing an owned artifact");
    expect((await jobs.get(payload.renderJobId))?.status).toBe("reconciling");
  });
  it("rejects output checksum changes without overwriting confirmed identity", async () => {
    await output();
    fs.writeFileSync(outputPath, "tampered");
    await expect(new RenderExecutionService(directory, renderer).run(payload)).rejects.toThrow("checksum");
  });
  it("does not touch a foreign job or another workspace's checkpoint", async () => {
    await expect(new RenderExecutionService(directory, renderer).run({ ...payload, tenantId: "b" })).rejects.toThrow("Owned render job");
    expect(enqueue).not.toHaveBeenCalled();
    expect((await jobs.get(payload.renderJobId))?.status).toBe("queued");
    expect(fs.existsSync(path.join(directory, "render-executions.json"))).toBe(false);
  });
  it("holds legacy started jobs and unavailable bound renders for reconciliation", async () => {
    await jobs.updateStatusForTenant("a", payload.renderJobId, "processing");
    await expect(new RenderExecutionService(directory, renderer).run(payload)).rejects.toThrow("Legacy started");
    expect(enqueue).not.toHaveBeenCalled();
    expect((await jobs.get(payload.renderJobId))?.status).toBe("reconciling");
  });
  it("repairs a job projection failure from persisted completion without a second render", async () => {
    await output();
    const update = RenderJobStore.prototype.updateStatusForTenant;
    let fail = true;
    vi.spyOn(RenderJobStore.prototype, "updateStatusForTenant").mockImplementation(async function (...args) {
      if (args[2] === "rendered" && fail) { fail = false; throw new Error("disk unavailable"); }
      return update.apply(this, args);
    });
    await expect(new RenderExecutionService(directory, renderer).run(payload)).rejects.toThrow("disk unavailable");
    expect(new RenderExecutionStore(directory).get("a", payload.renderJobId)?.state).toBe("completed");
    await new RenderExecutionService(directory, renderer).run(payload);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect((await jobs.get(payload.renderJobId))?.status).toBe("rendered");
  });
  it("retains one execution during overlapping deliveries", async () => {
    await output();
    const results = await Promise.all([new RenderExecutionService(directory, renderer).run(payload), new RenderExecutionService(directory, renderer).run(payload)]);
    expect(results[0].id).toBe(results[1].id);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(new RenderExecutionStore(directory).get("a", payload.renderJobId)?.state).toBe("completed");
  });
  it("preserves corrupt checkpoint and job files", async () => {
    const checkpoint = path.join(directory, "render-executions.json");
    fs.writeFileSync(checkpoint, "{bad");
    await expect(new RenderExecutionService(directory, renderer).run(payload)).rejects.toThrow();
    expect(fs.readFileSync(checkpoint, "utf8")).toBe("{bad");
    fs.removeSync(checkpoint);
    fs.writeFileSync(path.join(directory, "renderJobs.json"), "{bad-job");
    await expect(jobs.get(payload.renderJobId)).rejects.toThrow();
    expect(fs.readFileSync(path.join(directory, "renderJobs.json"), "utf8")).toBe("{bad-job");
    expect(enqueue).not.toHaveBeenCalled();
  });
});
