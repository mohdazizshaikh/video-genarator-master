import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { ArtifactManifestStore } from "../db/ArtifactManifestStore";
import { ContentVersionStore } from "../db/ContentVersionStore";
import { ScheduleStore, scheduleCheckpointDigest } from "../db/ScheduleStore";
import { VideoMetadataStore } from "../db/VideoMetadataStore";
import { verifyScheduledAssets } from "./ScheduleAssetReconciliation";

/** Observes a bound producer result. It has no renderer or enqueue capability. */
export async function completeScheduledVideo(directory: string, videosDirectory: string, tenantId: string, scheduleId: string): Promise<boolean> {
  const store = new ScheduleStore(directory);
  const execution = (await store.getForTenant(tenantId, scheduleId))?.execution;
  const output = execution?.pendingOutput, contract = execution?.producerContract;
  if (!execution || execution.state === "completed" || !contract?.expectsVideo || output?.state !== "video-queued" ||
      !output.videoId || !/^[a-zA-Z0-9_-]+$/.test(output.videoId) || output.artifacts.length !== contract.expectedAssets ||
      new Set(output.artifacts.map((artifact) => artifact.id)).size !== output.artifacts.length) return false;
  const videoId = output.videoId, digest = scheduleCheckpointDigest(execution);
  if (!new VideoMetadataStore(directory).getSync(videoId, tenantId)) return false;
  const location = path.join(videosDirectory, `${videoId}.mp4`);
  const manifests = new ArtifactManifestStore(directory), versions = new ContentVersionStore(directory);
  const artifact = manifests.findByLocalPathForTenant(tenantId, location);
  const version = versions.listForWorkspace(tenantId).find((item) => item.status === "ready" && item.createdBy === "render" && item.contentSignature === `render:${videoId}` && item.renderOutputPath === location);
  if (!artifact || artifact.kind !== "video" || artifact.mimeType !== "video/mp4" || !version ||
      !Number.isSafeInteger(artifact.sizeBytes) || artifact.sizeBytes <= 0) return false;
  const root = fs.realpathSync(directory), videoRoot = fs.realpathSync(videosDirectory), real = fs.realpathSync(location);
  if (!videoRoot.startsWith(`${root}${path.sep}`) || real !== path.join(videoRoot, `${videoId}.mp4`)) return false;
  const handle = await fs.promises.open(location, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.size !== artifact.sizeBytes) return false;
    const hash = createHash("sha256");
    let size = 0;
    for await (const chunk of handle.createReadStream({ autoClose: false, end: before.size - 1 })) { size += chunk.length; hash.update(chunk); }
    const current = fs.lstatSync(location);
    if (size !== before.size || current.dev !== before.dev || current.ino !== before.ino || current.size !== before.size ||
        current.mtimeMs !== before.mtimeMs || current.ctimeMs !== before.ctimeMs || hash.digest("hex") !== artifact.checksumSha256) return false;
    if (JSON.stringify(manifests.findForTenant(tenantId, artifact.id)) !== JSON.stringify(artifact) ||
        JSON.stringify(versions.getForWorkspace(tenantId, version.id)) !== JSON.stringify(version)) return false;
    verifyScheduledAssets(directory, tenantId, output.artifacts);
    return store.completeVideoForTenant(tenantId, scheduleId, execution.id, digest, { videoId, videoArtifactId: artifact.id, contentVersionId: version.id });
  } finally { await handle.close(); }
}
