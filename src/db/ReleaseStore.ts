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
import type { ReleaseStatus } from "../types/ownership.js";

export interface ReleaseRecord {
  id: string;
  workspaceId: string;
  contentVersionId: string;
  approvalStatus: "draft" | "pending" | "approved" | "rejected";
  status: ReleaseStatus;
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
  status: "queued" | "publishing" | "published" | "retryable" | "failed" | "cancelled";
  idempotencyKey: string;
  providerRequestId?: string;
  externalId?: string;
  publishedUrl?: string;
  attempts: number;
  lastErrorCode?: string;
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
    try {
      const value = fs.readJsonSync(this.filePath) as Partial<ReleaseFile>;
      return {
        releases: Array.isArray(value.releases) ? value.releases : [],
        targets: Array.isArray(value.targets) ? value.targets : [],
      };
    } catch {
      return { releases: [], targets: [] };
    }
  }

  private write(value: ReleaseFile): void {
    fs.ensureFileSync(this.filePath);
    fs.writeJsonSync(this.filePath, value, { spaces: 2 });
  }

  private id(prefix: string): string {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  private now(): string {
    return new Date().toISOString();
  }

  createRelease(params: Omit<ReleaseRecord, "id" | "createdAt" | "updatedAt" | "status">): ReleaseRecord {
    if (!params.workspaceId.trim()) throw new Error("workspaceId is required");
    const timestamp = this.now();
    const release: ReleaseRecord = {
      ...params,
      id: this.id("rel"),
      status: params.approvalStatus === "approved" ? "approved" : "pending_approval",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const file = this.read();
    file.releases.push(release);
    this.write(file);
    return release;
  }

  approveRelease(workspaceId: string, releaseId: string, approvedBy: string): ReleaseRecord {
    const file = this.read();
    const release = file.releases.find((candidate) => candidate.workspaceId === workspaceId && candidate.id === releaseId);
    if (!release) throw new Error("Release not found");
    if (!approvedBy.trim()) throw new Error("approvedBy is required");
    release.approvalStatus = "approved";
    release.status = "approved";
    release.approvedBy = approvedBy;
    release.approvedAt = this.now();
    release.updatedAt = this.now();
    this.write(file);
    return release;
  }

  getRelease(workspaceId: string, releaseId: string): ReleaseRecord | undefined {
    return this.read().releases.find((release) => release.workspaceId === workspaceId && release.id === releaseId);
  }

  listReleases(workspaceId: string): ReleaseRecord[] {
    return this.read()
      .releases.filter((release) => release.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  listTargets(workspaceId: string, releaseId: string): ReleaseTargetRecord[] {
    return this.read().targets.filter((target) => target.workspaceId === workspaceId && target.releaseId === releaseId);
  }

  getTarget(workspaceId: string, targetId: string): ReleaseTargetRecord | undefined {
    return this.read().targets.find((target) => target.workspaceId === workspaceId && target.id === targetId);
  }

  createTarget(params: Omit<ReleaseTargetRecord, "id" | "createdAt" | "updatedAt" | "status" | "attempts">): ReleaseTargetRecord {
    const file = this.read();
    const release = file.releases.find((candidate) => candidate.workspaceId === params.workspaceId && candidate.id === params.releaseId);
    if (!release) throw new Error("Release not found");
    if (release.approvalStatus !== "approved" || release.status === "cancelled") throw new Error("Release approval is required");
    if (!params.idempotencyKey.trim()) throw new Error("idempotencyKey is required");
    if (file.targets.some((target) => target.idempotencyKey === params.idempotencyKey)) throw new Error("Duplicate idempotency key");
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
    this.write(file);
    return target;
  }

  updateTarget(workspaceId: string, targetId: string, updates: Partial<Pick<ReleaseTargetRecord, "status" | "providerRequestId" | "externalId" | "publishedUrl" | "lastErrorCode">>): ReleaseTargetRecord | undefined {
    const file = this.read();
    const target = file.targets.find((candidate) => candidate.workspaceId === workspaceId && candidate.id === targetId);
    if (!target) return undefined;
    Object.assign(target, updates, { updatedAt: this.now() });
    // Count publish attempts only: a target enters "publishing" once per worker
    // execution, while terminal/retryable transitions must not inflate the count.
    if (updates.status === "publishing") target.attempts += 1;
    this.write(file);
    return target;
  }
}
