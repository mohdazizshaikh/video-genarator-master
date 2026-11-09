import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { ShortCreator } from "../short-creator/ShortCreator";
import type { RenderJobPayload } from "../workers/RenderWorker";
import { RenderExecutionStore, type RenderExecution } from "../db/RenderExecutionStore";
import { RenderJobStore } from "../db/RenderJobStore";
import { ArtifactManifestStore } from "../db/ArtifactManifestStore";
import { ContentVersionStore } from "../db/ContentVersionStore";

export class RenderReconciliationError extends Error {}
type Renderer = Pick<ShortCreator, "addToQueue" | "status" | "getVideoPath" | "ownsVideo">;

export class RenderExecutionService {
  private executions: RenderExecutionStore;
  private jobs: RenderJobStore;
  constructor(private directory: string, private renderer: Renderer, private timeoutMs = 30 * 60 * 1000) {
    if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 24 * 60 * 60 * 1000) throw new Error("Invalid render execution deadline");
    this.executions = new RenderExecutionStore(directory);
    this.jobs = new RenderJobStore(directory);
  }

  async run(payload: RenderJobPayload): Promise<RenderExecution> {
    const { tenantId, renderJobId } = payload;
    if (!tenantId?.trim()) throw new RenderReconciliationError("Render job requires a workspace");
    const job = await this.jobs.getForTenant(tenantId, renderJobId);
    if (!job) throw new RenderReconciliationError("Owned render job not found");
    if (job.namingKey !== payload.namingKey || job.videoType !== payload.videoType) throw new RenderReconciliationError("Render job identity mismatch");
    const prior = this.executions.get(tenantId, renderJobId);
    if (!prior && ["processing", "ready", "rendered", "reconciling"].includes(job.status)) {
      await this.jobs.updateStatusForTenant(tenantId, renderJobId, "reconciling", { error: "Legacy started render requires reconciliation" });
      throw new RenderReconciliationError("Legacy started render requires reconciliation");
    }
    const claim = this.executions.claim(tenantId, renderJobId, this.timeoutMs);
    let execution = claim.execution;
    let completed = false;
    try {
      if (execution.state === "reconciling") throw new RenderReconciliationError("Render execution requires reconciliation");
      if (claim.created) {
        // The claim is persisted before enqueue. A crash before video binding is
        // deliberately held for reconciliation rather than guessing and duplicating.
        const videoId = this.renderer.addToQueue(payload.sceneInput, { ...payload.config, category: payload.category || payload.config?.category || "News" }, payload.videoType, payload.subtitleLanguage, tenantId);
        execution = this.executions.attachVideo(tenantId, renderJobId, execution.id, videoId);
      }
      if (!execution.videoId) throw new RenderReconciliationError("Render claim has no confirmed video binding");
      if (!this.renderer.ownsVideo(tenantId, execution.videoId)) throw new RenderReconciliationError("Bound video is not owned by this workspace");
      if (execution.state !== "completed") {
        await this.jobs.updateStatusForTenant(tenantId, renderJobId, "processing", { executionId: execution.id, videoId: execution.videoId });
        while (true) {
          if (Date.now() >= Date.parse(execution.deadlineAt)) throw new RenderReconciliationError("Render execution deadline exceeded");
          const status = this.renderer.status(execution.videoId);
          if (status === "ready") break;
          if (status !== "processing") throw new RenderReconciliationError("Bound render outcome is unavailable; reconciliation is required");
          await new Promise<void>((resolve) => setTimeout(resolve, Math.min(1000, Date.parse(execution.deadlineAt) - Date.now())));
        }
      }
      const outputPath = this.renderer.getVideoPath(execution.videoId);
      const manifest = new ArtifactManifestStore(this.directory).findByLocalPathForTenant(tenantId, outputPath);
      const version = new ContentVersionStore(this.directory).listForWorkspace(tenantId).find((candidate) => candidate.status === "ready" && candidate.renderOutputPath === outputPath && candidate.contentSignature === `render:${execution.videoId}`);
      if (!manifest || manifest.kind !== "video" || !version) throw new RenderReconciliationError("Rendered output is missing an owned artifact or ready content version");
      if (execution.state === "completed" && (execution.artifactId !== manifest.id || execution.contentVersionId !== version.id || execution.outputPath !== outputPath)) throw new RenderReconciliationError("Completed render binding has changed");
      const root = fs.realpathSync(this.directory);
      const relative = path.relative(root, fs.realpathSync(outputPath));
      if (relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative) || !fs.statSync(outputPath).isFile()) throw new RenderReconciliationError("Rendered output is outside workspace storage");
      const hash = crypto.createHash("sha256");
      for await (const chunk of fs.createReadStream(outputPath)) hash.update(chunk);
      if (hash.digest("hex") !== manifest.checksumSha256) throw new RenderReconciliationError("Rendered artifact checksum mismatch");
      if (execution.state !== "completed") execution = this.executions.complete(tenantId, renderJobId, execution.id, { videoId: execution.videoId, artifactId: manifest.id, contentVersionId: version.id, outputPath });
      completed = true;
      await this.jobs.updateStatusForTenant(tenantId, renderJobId, "rendered", { outputPath, error: null, executionId: execution.id, videoId: execution.videoId, artifactId: execution.artifactId, contentVersionId: execution.contentVersionId });
      return execution;
    } catch (error) {
      // Durable completion can repair a failed job projection on re-delivery.
      if (completed) throw error;
      const message = error instanceof RenderReconciliationError ? error.message : "Render execution could not be confirmed";
      this.executions.reconcile(tenantId, renderJobId, execution.id, message);
      await this.jobs.updateStatusForTenant(tenantId, renderJobId, "reconciling", { error: message });
      throw new RenderReconciliationError(message);
    }
  }
}
