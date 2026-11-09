import crypto from "node:crypto";
import path from "node:path";
import fs from "fs-extra";
import {
  ArtifactManifestStore,
  type ArtifactManifest,
} from "../db/ArtifactManifestStore";
import {
  ContentVersionStore,
  type ContentVersionRecord,
} from "../db/ContentVersionStore";
import { ConnectorStore } from "../db/ConnectorStore";
import { ReleaseStore, type ApprovedDestination, type ReleaseRecord } from "../db/ReleaseStore";

export interface ApprovedPublishContent {
  artifactId: string;
  checksumSha256: string;
  contentDigest: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  language: string;
}

/** Resolve publish authority from owned records, never an enqueue request path. */
export class ReleaseAuthorization {
  private readonly versions: ContentVersionStore;
  private readonly artifacts: ArtifactManifestStore;
  private readonly releases: ReleaseStore;

  constructor(private readonly dataDirPath: string) {
    this.versions = new ContentVersionStore(dataDirPath);
    this.artifacts = new ArtifactManifestStore(dataDirPath);
    this.releases = new ReleaseStore(dataDirPath);
  }

  private content(
    workspaceId: string,
    versionId: string,
  ): ContentVersionRecord {
    const version = this.versions.getForWorkspace(workspaceId, versionId);
    if (!version || version.status !== "ready" || !version.renderOutputPath)
      throw new Error("An owned ready content version is required");
    return version;
  }

  private artifact(
    workspaceId: string,
    version: ContentVersionRecord,
  ): ArtifactManifest {
    const manifest = this.artifacts.findByLocalPathForTenant(
      workspaceId,
      version.renderOutputPath!,
    );
    if (!manifest || manifest.mimeType !== "video/mp4")
      throw new Error("An owned video artifact is required");
    const base = fs.realpathSync(this.dataDirPath);
    const real = fs.realpathSync(manifest.localPath);
    if (!real.startsWith(base + path.sep) || !fs.statSync(real).isFile())
      throw new Error("Artifact is outside managed storage");
    const checksum = crypto
      .createHash("sha256")
      .update(fs.readFileSync(real))
      .digest("hex");
    if (checksum !== manifest.checksumSha256)
      throw new Error(
        "Artifact checksum changed; a new render and approval are required",
      );
    return manifest;
  }

  snapshot(workspaceId: string, versionId: string): ApprovedPublishContent {
    const version = this.content(workspaceId, versionId);
    const artifact = this.artifact(workspaceId, version);
    const metadata = version.metadata;
    const contentDigest = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          title: version.title,
          script: version.script,
          scenes: version.scenes,
          metadata,
          sourceUrls: version.sourceUrls,
          contentSignature: version.contentSignature,
          artifactId: artifact.id,
          checksum: artifact.checksumSha256,
        }),
      )
      .digest("hex");
    return {
      artifactId: artifact.id,
      checksumSha256: artifact.checksumSha256,
      contentDigest,
      title: version.title,
      description:
        typeof metadata.description === "string"
          ? metadata.description
          : version.script,
      tags: Array.isArray(metadata.tags)
        ? metadata.tags.filter((tag): tag is string => typeof tag === "string")
        : [],
      category:
        typeof metadata.category === "string" ? metadata.category : "general",
      language:
        typeof metadata.language === "string" ? metadata.language : "en",
    };
  }


  destinationScope(workspaceId: string, destinations: unknown): ApprovedDestination[] {
    if (!Array.isArray(destinations) || !destinations.length || destinations.length > 50) throw new Error("Select 1 to 50 destinations for approval");
    const connectors = new ConnectorStore(this.dataDirPath);
    const result = destinations.map((entry) => {
      if (!entry || typeof entry.connectorId !== "string" || typeof entry.destinationId !== "string") throw new Error("Destination identity is required");
      const connector = connectors.getConnector(workspaceId, entry.connectorId);
      const destination = connector && connectors.listDestinations(workspaceId, connector.id).find((row) => row.id === entry.destinationId);
      if (!connector || connector.status !== "connected" || !destination || destination.status !== "verified") throw new Error("Approval requires owned connected connectors and verified destinations");
      return { connectorId: connector.id, destinationId: destination.id, platform: connector.platform, externalAccountId: connector.externalAccountId, externalDestinationId: destination.externalDestinationId };
    });
    if (new Set(result.map((entry) => JSON.stringify([entry.connectorId, entry.destinationId]))).size !== result.length) throw new Error("Duplicate approval destination");
    return result;
  }

  authorizeDestination(workspaceId: string, releaseId: string, connectorId: string, destinationId: string): void {
    const release = this.releases.getRelease(workspaceId, releaseId);
    const approved = release?.approvedDestinations?.find((entry) => entry.connectorId === connectorId && entry.destinationId === destinationId);
    if (release?.approvalStatus !== "approved" || !approved) throw new Error("Destination-bound approval is required; create a new release for legacy targets");
    const current = this.destinationScope(workspaceId, [{ connectorId, destinationId }])[0];
    if (current.platform !== approved.platform || current.externalAccountId !== approved.externalAccountId || current.externalDestinationId !== approved.externalDestinationId) throw new Error("Approved provider destination changed; create a new release");
  }

  authorize(
    workspaceId: string,
    releaseId: string,
  ): {
    release: ReleaseRecord;
    snapshot: ApprovedPublishContent;
    localPath: string;
  } {
    const release = this.releases.getRelease(workspaceId, releaseId);
    if (
      !release ||
      release.approvalStatus !== "approved" ||
      release.status === "cancelled" ||
      !release.approvedContent
    )
      throw new Error("A release with bound content approval is required");
    const snapshot = this.snapshot(workspaceId, release.contentVersionId);
    if (snapshot.contentDigest !== release.approvedContent.contentDigest)
      throw new Error(
        "Approved content changed; a new release approval is required",
      );
    const artifact = this.artifacts.findForTenant(
      workspaceId,
      snapshot.artifactId,
    )!;
    return { release, snapshot, localPath: artifact.localPath };
  }
}
