/**
 * Workspace-owned release metadata store.
 *
 * A release is immutable with respect to its content version and destination
 * identity. Provider credentials are never stored here. A target can only be
 * created for an approved release and a verified destination belonging to the
 * same workspace.
 */
import crypto from "node:crypto";
import fs from "fs-extra";
import path from "path";
import { PublishExecutionStore } from "./PublishExecutionStore";
import type { ApprovedPublishContent } from "../services/ReleaseAuthorization";
import type { ReleaseStatus } from "../types/ownership.js";

export interface ApprovedDestination {
  connectorId: string;
  destinationId: string;
  platform: string;
  externalAccountId?: string;
  externalDestinationId: string;
}

export interface ReleaseRecord {
  id: string;
  workspaceId: string;
  contentVersionId: string;
  approvalStatus: "draft" | "pending" | "approved" | "rejected";
  status: ReleaseStatus;
  approvedContent?: ApprovedPublishContent;
  approvedDestinations?: ApprovedDestination[];
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseTargetRecord {
  id: string;
  releaseId: string;
  workspaceId: string;
  connectorId: string;
  destinationId: string;
  status:
    | "queued" | "publishing" | "published" | "retryable" | "failed" | "cancelled" | "reconciling";
  idempotencyKey: string;
  providerRequestId?: string;
  externalId?: string;
  publishedUrl?: string;
  attempts: number;
  lastErrorCode?: string;
  retryDisposition?: "not_dispatched" | "not_accepted";
  createdAt: string;
  updatedAt: string;
}

interface ReleaseFile {
  releases: ReleaseRecord[];
  targets: ReleaseTargetRecord[];
}

export class ReleaseStore {
  private readonly filePath: string;

  constructor(dataDirPath: string) {
    this.filePath = path.join(dataDirPath, "releases.json");
  }

  private read(): ReleaseFile {
    if (!fs.existsSync(this.filePath)) return { releases: [], targets: [] };
    const value = fs.readJsonSync(this.filePath) as Partial<ReleaseFile>;
    if (!value || !Array.isArray(value.releases) || !Array.isArray(value.targets)) throw new Error("Invalid release store; reconciliation is required");
    return value as ReleaseFile;
  }

  private write(value: ReleaseFile): void {
    fs.ensureDirSync(path.dirname(this.filePath));
    const temporary = `${this.filePath}.${crypto.randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, JSON.stringify(value, null, 2), { flag: "wx", mode: 0o600 });
      fs.renameSync(temporary, this.filePath);
    } finally { fs.removeSync(temporary); }
  }

  private rollup(file: ReleaseFile, releaseId: string, workspaceId: string) {
    const release = file.releases.find((row) => row.id === releaseId && row.workspaceId === workspaceId);
    const targets = file.targets.filter((row) => row.releaseId === releaseId && row.workspaceId === workspaceId);
    if (!release || !targets.length) return;
    const states = targets.map((row) => row.status);
    release.status = states.includes("reconciling") ? "reconciling"
      : states.every((state) => state === "published") ? "published"
      : states.includes("publishing") ? "publishing"
      : states.includes("published") ? "partially_published"
      : states.every((state) => state === "cancelled") ? "cancelled"
      : states.every((state) => state === "failed" || state === "cancelled") ? "failed" : "queued";
    release.updatedAt = this.now();
  }

  private id(prefix: string): string {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  private now(): string {
    return new Date().toISOString();
  }

  createRelease(
    params: Omit<ReleaseRecord, "id" | "createdAt" | "updatedAt" | "status">,
  ): ReleaseRecord {
    if (!params.workspaceId.trim()) throw new Error("workspaceId is required");
    const timestamp = this.now();
    const release: ReleaseRecord = {
      ...params,
      id: this.id("rel"),
      status:
        params.approvalStatus === "approved" ? "approved" : "pending_approval",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const file = this.read();
    file.releases.push(release);
    this.write(file);
    return release;
  }

  approveRelease(
    workspaceId: string,
    releaseId: string,
    approvedBy: string,
    approvedContent?: ApprovedPublishContent,
    approvedDestinations?: ApprovedDestination[],
  ): ReleaseRecord {
    const file = this.read();
    const release = file.releases.find(
      (candidate) =>
        candidate.workspaceId === workspaceId && candidate.id === releaseId,
    );
    if (!release) throw new Error("Release not found");
    if (!approvedBy.trim()) throw new Error("approvedBy is required");
    if (file.targets.some((target) => target.workspaceId === workspaceId && target.releaseId === releaseId)) throw new Error("Approval cannot be changed after release targets exist");
    if (approvedDestinations && (!approvedDestinations.length || approvedDestinations.length > 50 || approvedDestinations.some((entry) => !entry.connectorId || !entry.destinationId || !entry.platform || !entry.externalDestinationId) || new Set(approvedDestinations.map((entry) => JSON.stringify([entry.connectorId, entry.destinationId]))).size !== approvedDestinations.length)) throw new Error("Approval requires 1 to 50 unique destination bindings");
    release.approvedContent = approvedContent;
    release.approvedDestinations = approvedDestinations;
    release.approvalStatus = "approved";
    release.status = "approved";
    release.approvedBy = approvedBy;
    release.approvedAt = this.now();
    release.updatedAt = this.now();
    this.write(file);
    return release;
  }

  getRelease(
    workspaceId: string,
    releaseId: string,
  ): ReleaseRecord | undefined {
    return this.read().releases.find(
      (release) =>
        release.workspaceId === workspaceId && release.id === releaseId,
    );
  }

  listReleases(workspaceId: string): ReleaseRecord[] {
    return this.read()
      .releases.filter((release) => release.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  listTargets(workspaceId: string, releaseId: string): ReleaseTargetRecord[] {
    return this.read().targets.filter(
      (target) =>
        target.workspaceId === workspaceId && target.releaseId === releaseId,
    );
  }

  getTarget(
    workspaceId: string,
    targetId: string,
  ): ReleaseTargetRecord | undefined {
    return this.read().targets.find(
      (target) => target.workspaceId === workspaceId && target.id === targetId,
    );
  }

  createTarget(
    params: Omit<
      ReleaseTargetRecord,
      "id" | "createdAt" | "updatedAt" | "status" | "attempts"
    >,
  ): ReleaseTargetRecord {
    const file = this.read();
    const release = file.releases.find(
      (candidate) =>
        candidate.workspaceId === params.workspaceId &&
        candidate.id === params.releaseId,
    );
    if (!release) throw new Error("Release not found");
    if (release.approvalStatus !== "approved" || release.status === "cancelled")
      throw new Error("Release approval is required");
    if (release.approvedDestinations && !release.approvedDestinations.some((entry) => entry.connectorId === params.connectorId && entry.destinationId === params.destinationId)) throw new Error("Destination is outside the approved release scope");
    if (!params.idempotencyKey.trim())
      throw new Error("idempotencyKey is required");
    if (
      file.targets.some(
        (target) =>
          target.workspaceId === params.workspaceId &&
          target.idempotencyKey === params.idempotencyKey,
      )
    )
      throw new Error("Duplicate idempotency key");
    if (file.targets.some((target) => target.workspaceId === params.workspaceId && target.releaseId === params.releaseId && target.connectorId === params.connectorId && target.destinationId === params.destinationId)) throw new Error("Release destination already has a target");
    const timestamp = this.now();
    const target: ReleaseTargetRecord = {
      ...params,
      id: this.id("target"),
      status: "queued",
      attempts: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    file.targets.push(target);
    this.rollup(file, target.releaseId, target.workspaceId);
    this.write(file);
    return target;
  }

  /** Confirmed external acceptance may repair any stale local target projection. */
  confirmTargetPublication(workspaceId: string, targetId: string): ReleaseTargetRecord {
    const execution = new PublishExecutionStore(path.dirname(this.filePath)).get(workspaceId, targetId);
    const file = this.read();
    const target = file.targets.find((row) => row.workspaceId === workspaceId && row.id === targetId);
    if (!target || !execution || execution.state !== "accepted" || !execution.receipt?.externalId || execution.releaseId !== target.releaseId || execution.connectorId !== target.connectorId || execution.destinationId !== target.destinationId) throw new Error("Confirmed publication receipt is required");
    Object.assign(target, { status: "published", externalId: execution.receipt.externalId, publishedUrl: execution.receipt.publishedUrl, providerRequestId: execution.requestId, lastErrorCode: undefined, updatedAt: this.now() });
    this.rollup(file, target.releaseId, workspaceId);
    this.write(file); return target;
  }

  updateTarget(
    workspaceId: string,
    targetId: string,
    updates: Partial<
      Pick<
        ReleaseTargetRecord,
        | "status"
        | "providerRequestId"
        | "externalId"
        | "publishedUrl"
        | "lastErrorCode"
        | "retryDisposition"
      >
    >,
  ): ReleaseTargetRecord | undefined {
    const file = this.read();
    const target = file.targets.find(
      (candidate) =>
        candidate.workspaceId === workspaceId && candidate.id === targetId,
    );
    if (!target) return undefined;
    const next = updates.status ?? target.status;
    const transitions: Record<ReleaseTargetRecord["status"], ReleaseTargetRecord["status"][]> = {
      queued: ["publishing", "retryable", "failed", "cancelled", "reconciling"],
      publishing: ["published", "retryable", "failed", "reconciling"],
      retryable: ["publishing", "queued", "failed", "cancelled", "reconciling"],
      failed: ["queued", "reconciling", "published"],
      reconciling: ["published"], published: [], cancelled: ["published", "reconciling"],
    };
    if (next !== target.status && !transitions[target.status]?.includes(next)) throw new Error(`Invalid release target transition: ${target.status} to ${next}`);
    const starts = next === "publishing" && (target.status !== "publishing" || (updates.providerRequestId && updates.providerRequestId !== target.providerRequestId));
    Object.assign(target, updates, { updatedAt: this.now() });
    // Count publish attempts only: a target enters "publishing" once per worker
    // execution, while terminal/retryable transitions must not inflate the count.
    if (starts) target.attempts += 1;
    this.rollup(file, target.releaseId, workspaceId);
    this.write(file);
    return target;
  }
}
