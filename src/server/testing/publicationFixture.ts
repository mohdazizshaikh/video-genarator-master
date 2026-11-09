import fs from "fs-extra";
import path from "node:path";
import crypto from "node:crypto";
import { ArtifactManifestStore } from "../../db/ArtifactManifestStore";
import { ContentVersionStore } from "../../db/ContentVersionStore";
import { ConnectorStore } from "../../db/ConnectorStore";
import { ConnectorSecretStore } from "../../db/ConnectorSecretStore";
import { ReleaseStore } from "../../db/ReleaseStore";
import { PublishJobStore } from "../../db/PublishJobStore";
import { ReleaseAuthorization } from "../../services/ReleaseAuthorization";
import type { PublishBinding } from "../../db/PublishExecutionStore";
import type { PublishJobPayload } from "../../workers/PublishWorker";

/** Temporary fixture data only. Callers inject adapters/queues; this never posts. */
export async function publicationFixture(directory: string, workspaceId = "A") {
  const media = path.join(directory, `${crypto.randomUUID()}.mp4`);
  fs.writeFileSync(media, "fixture media bytes");
  await new ArtifactManifestStore(directory).register({ tenantId: workspaceId, kind: "video", localPath: media, mimeType: "video/mp4", lifecycle: "active" });
  const versions = new ContentVersionStore(directory);
  const version = versions.create({ workspaceId, title: "Approved title", script: "Approved content", scenes: [], metadata: { language: "en", tags: [] }, sourceUrls: [], contentSignature: crypto.randomUUID() });
  versions.updateRender(workspaceId, version.id, { status: "ready", renderOutputPath: media });
  const connectors = new ConnectorStore(directory);
  const connector = connectors.createConnector({ workspaceId, platform: "telegram", externalAccountId: crypto.randomUUID(), displayName: "Fixture connector", status: "connected", credentialRef: "secret://fixture", capabilities: { sendVideo: true } });
  const destination = connectors.createDestination({ workspaceId, connectorId: connector.id, externalDestinationId: "fixture-chat", displayName: "Fixture destination", status: "verified", verificationEvidence: { tested: "fixture" } });
  if (process.env.TENANT_KEYS_SECRET) new ConnectorSecretStore(directory, process.env.TENANT_KEYS_SECRET).put(workspaceId, connector.id, { botToken: "test-only-publication-token", channelId: "untrusted-secret-chat" });
  const releases = new ReleaseStore(directory);
  const release = releases.createRelease({ workspaceId, contentVersionId: version.id, approvalStatus: "pending" });
  const approvedContent = new ReleaseAuthorization(directory).snapshot(workspaceId, version.id);
  releases.approveRelease(workspaceId, release.id, "fixture-owner", approvedContent, new ReleaseAuthorization(directory).destinationScope(workspaceId, [{ connectorId: connector.id, destinationId: destination.id }]));
  const target = releases.createTarget({ workspaceId, releaseId: release.id, connectorId: connector.id, destinationId: destination.id, idempotencyKey: crypto.randomUUID() });
  const jobs = new PublishJobStore(directory);
  const job = await jobs.createJob({ tenantId: workspaceId, releaseTargetId: target.id, connectorId: connector.id, destinationId: destination.id, renderOutputPath: media, platform: "telegram", channelId: destination.externalDestinationId, title: approvedContent.title, description: approvedContent.description, tags: [], category: approvedContent.category, language: approvedContent.language });
  const binding: PublishBinding = { tenantId: workspaceId, targetId: target.id, releaseId: release.id, connectorId: connector.id, destinationId: destination.id, platform: "telegram", contentDigest: approvedContent.contentDigest };
  const payload: PublishJobPayload = { ...job, tenantId: workspaceId, publishJobId: job.id, accountId: undefined, scheduleAt: undefined };
  return { media, versions, version, connectors, connector, destination, releases, release, target, jobs, job, binding, payload };
}
