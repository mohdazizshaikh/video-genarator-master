import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ArtifactManifestStore } from "../db/ArtifactManifestStore";
import { ScheduleStore, scheduleCheckpointDigest, type ScheduleOutput, type ScheduleRecord } from "../db/ScheduleStore";

/** Positive confirmation of already-bound assets only. Never invokes a producer. */
export class ScheduleAssetReconciliation {
  constructor(private readonly directory: string) {}
  async confirm(tenantId: string, scheduleId: string, executionId: string, evidenceReference: string, operator: string): Promise<ScheduleRecord> {
    if (!tenantId || !executionId || !operator.trim() || !evidenceReference.trim() || evidenceReference.length > 500) throw new Error("Confirmation evidence required");
    const store = new ScheduleStore(this.directory), schedule = await store.getForTenant(tenantId, scheduleId), execution = schedule?.execution;
    const contract = execution?.producerContract, output = execution?.pendingOutput;
    if (!execution || execution.id !== executionId || !contract || contract.expectsVideo || contract.expectedAssets < 1 || !output || output.state !== "assets-persisted" || output.videoId || output.artifacts.length !== contract.expectedAssets || new Set(output.artifacts.map((artifact) => artifact.id)).size !== output.artifacts.length || execution.state === "completed" && !execution.reconciliation) throw new Error("A complete bound asset checkpoint is required");
    const digest = scheduleCheckpointDigest(execution);
    verifyScheduledAssets(this.directory, tenantId, output.artifacts);
    return store.confirmAssetsForTenant(tenantId, scheduleId, executionId, digest, evidenceReference.trim(), operator);
  }
}

export function verifyScheduledAssets(directory: string, tenantId: string, artifacts: ScheduleOutput["artifacts"]): void {
  const manifests = new ArtifactManifestStore(directory);
  const prefix = path.join(fs.realpathSync(directory), "artifacts", "schedules", crypto.createHash("sha256").update(tenantId).digest("hex"));
  for (const descriptor of artifacts) {
    const artifact = manifests.findForTenant(tenantId, descriptor.id);
    if (!artifact || artifact.kind !== "generated-image" || artifact.mimeType !== "image/svg+xml" || descriptor.mimeType !== artifact.mimeType || descriptor.sizeBytes !== artifact.sizeBytes || descriptor.checksumSha256 !== artifact.checksumSha256) throw new Error("Owned artifact binding mismatch");
    const location = fs.realpathSync(artifact.localPath);
    if (!location.startsWith(`${prefix}${path.sep}`)) throw new Error("Scheduled asset is outside owned storage");
    const fd = fs.openSync(location, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    try {
      const stat = fs.fstatSync(fd);
      if (!stat.isFile() || stat.size !== artifact.sizeBytes || stat.size > 32 * 1024 * 1024) throw new Error("Scheduled asset size mismatch");
      if (crypto.createHash("sha256").update(fs.readFileSync(fd)).digest("hex") !== artifact.checksumSha256) throw new Error("Scheduled asset checksum changed");
    } finally { fs.closeSync(fd); }
  }
}
