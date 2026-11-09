import fs from "fs-extra";
import path from "path";
import cuid from "cuid";
import crypto from "node:crypto";
import { nextScheduleRun, validateRecurrence, ScheduleValidationError } from "../services/ScheduleRecurrence";

export interface ScheduleOutput {
  recordedAt: string;
  state: "assets-persisted" | "video-queued" | "video-completed";
  artifacts: Array<{ id: string; mimeType: string; checksumSha256: string; sizeBytes: number }>;
  videoId?: string;
  videoArtifactId?: string;
  contentVersionId?: string;
}

export interface ScheduleExecution {
  id: string;
  dueAt: string;
  runCountAtClaim: number;
  state: "claimed" | "completed" | "reconciling";
  claimedAt: string;
  updatedAt: string;
  configuration?: ScheduleConfiguration;
  producerContract?: { expectedAssets: number; expectsVideo: boolean };
  reconciliation?: { evidenceReference: string; operator: string; confirmedAt: string; checkpointDigest: string };
  outcome?: "success" | "failed";
  pendingOutput?: ScheduleOutput;
}

export function scheduleCheckpointDigest(execution: ScheduleExecution): string {
  return crypto.createHash("sha256").update(JSON.stringify({ producerContract: execution.producerContract, pendingOutput: execution.pendingOutput })).digest("hex");
}

export interface ScheduleRecord {
  execution?: ScheduleExecution;
  /** Most recent successful producer result, not proof of publication. */
  lastOutput?: ScheduleOutput;
  /** Auth-derived owner. Legacy schedules without this field are not tenant-visible. */
  tenantId?: string;
  id: string;
  name: string;
  videoId: string;
  platforms: string[];
  categories: string[];
  languages: string[];
  engines: {
    enableTranslation: boolean;
    enableCommentCTA: boolean;
    enablePlatformPsych: boolean;
    enableSeries: boolean;
    enableHumanMimicry: boolean;
    enableHashtagOptimization: boolean;
    enableEngagementOptimization: boolean;
  };
  quality: {
    targetLUFS: number;
    sharpnessLevel: number;
    visualQualityTier: "draft" | "standard" | "premium";
  };
  cronExpression: string;
  /** Legacy records use UTC and cron recurrence. */
  timezone?: string;
  recurrence?: "cron" | "once";
  /** Internal marker: a persisted timing deferral has already been applied. */
  timingVariationApplied?: boolean;
  publishAt: string;
  status: "active" | "paused" | "completed" | "failed";
  lastRun?: string;
  nextRun?: string;
  runCount: number;
  failureCount: number;
  metadata: {
    createdBy?: string;
    tags?: string[];
    notes?: string;
    contentType?: string;
    alsoGenerate?: Record<string, boolean>;
    [key: string]: unknown;
  };
  createdAt: string;
  updatedAt: string;
}

export type ScheduleConfiguration = Pick<ScheduleRecord, "name" | "videoId" | "platforms" | "categories" | "languages" | "engines" | "quality" | "cronExpression" | "timezone" | "recurrence" | "publishAt" | "metadata">;

export function scheduleConfiguration(record: ScheduleRecord): ScheduleConfiguration {
  const { name, videoId, platforms, categories, languages, engines, quality, cronExpression, timezone, recurrence, publishAt, metadata } = record;
  return JSON.parse(JSON.stringify({ name, videoId, platforms, categories, languages, engines, quality, cronExpression, timezone, recurrence, publishAt, metadata })) as ScheduleConfiguration;
}

export function scheduleConfigurationDigest(record: ScheduleRecord): string {
  return crypto.createHash("sha256").update(JSON.stringify(scheduleConfiguration(record))).digest("hex");
}

export class ScheduleConflictError extends Error {
  constructor() { super("Schedule execution is unresolved; configuration changes, terminal status and deletion are blocked"); this.name = "ScheduleConflictError"; }
}

export class ScheduleStore {
  private storePath: string;

  constructor(basePath: string) {
    this.storePath = path.join(basePath, "schedules.json");
    fs.ensureDirSync(basePath);
    if (!fs.existsSync(this.storePath)) fs.writeFileSync(this.storePath, "[]", { flag: "wx", mode: 0o600 });
  }

  private readSync(): ScheduleRecord[] {
    const records: unknown = JSON.parse(fs.readFileSync(this.storePath, "utf8"));
    if (!Array.isArray(records)) throw new Error("Invalid schedule store");
    return records as ScheduleRecord[];
  }

  private async readAll(): Promise<ScheduleRecord[]> { return this.readSync(); }

  /** Synchronous read-modify-rename prevents interleaving inside this process.
   * Multiple server processes still require database-backed transactions. */
  private mutate<T>(operation: (records: ScheduleRecord[]) => T): T {
    const records = this.readSync();
    const result = operation(records);
    const temporary = `${this.storePath}.${crypto.randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, JSON.stringify(records, null, 2), { flag: "wx", mode: 0o600 });
      fs.renameSync(temporary, this.storePath);
    } finally { fs.removeSync(temporary); }
    return result;
  }

  private validate(record: ScheduleRecord) {
    validateRecurrence(record);
    if (!Number.isFinite(new Date(record.publishAt).getTime())) throw new ScheduleValidationError("Invalid publishAt date");
    if (record.nextRun !== undefined && !Number.isFinite(new Date(record.nextRun).getTime())) throw new ScheduleValidationError("Invalid nextRun date");
    if (!["active", "paused", "completed", "failed"].includes(record.status)) throw new ScheduleValidationError("Invalid schedule status");
  }

  async createForTenant(tenantId: string, data: Omit<ScheduleRecord, "id" | "createdAt" | "updatedAt" | "runCount" | "failureCount" | "tenantId">): Promise<ScheduleRecord> {
    if (!tenantId) throw new Error("tenantId is required");
    return this.create({ ...data, tenantId });
  }

  async create(data: Omit<ScheduleRecord, "id" | "createdAt" | "updatedAt" | "runCount" | "failureCount">): Promise<ScheduleRecord> {
    return this.mutate((records) => {
      const now = new Date().toISOString();
      const record: ScheduleRecord = {
        ...data, id: `sched_${cuid()}`, timezone: data.timezone ?? "UTC", recurrence: data.recurrence ?? "cron",
        publishAt: data.publishAt, nextRun: data.publishAt,
        runCount: 0, failureCount: 0, createdAt: now, updatedAt: now,
      };
      this.validate(record);
      record.publishAt = new Date(record.publishAt).toISOString();
      record.nextRun = record.publishAt;
      records.push(record);
      return record;
    });
  }

  async getForTenant(tenantId: string, id: string): Promise<ScheduleRecord | undefined> {
    if (!tenantId) return undefined;
    return (await this.readAll()).find((record) => record.tenantId === tenantId && record.id === id);
  }

  async get(id: string): Promise<ScheduleRecord | undefined> {
    return (await this.readAll()).find((r) => r.id === id);
  }

  async listForTenant(tenantId: string, limit = 50, offset = 0): Promise<{ schedules: ScheduleRecord[]; total: number }> {
    if (!tenantId) return { schedules: [], total: 0 };
    const all = (await this.readAll()).filter((record) => record.tenantId === tenantId);
    const sorted = all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { schedules: sorted.slice(offset, offset + limit), total: sorted.length };
  }

  async list(limit = 50, offset = 0): Promise<{ schedules: ScheduleRecord[]; total: number }> {
    const all = await this.readAll();
    const sorted = all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return {
      schedules: sorted.slice(offset, offset + limit),
      total: sorted.length,
    };
  }

  async listActiveForTenant(tenantId: string, limit = 50, offset = 0): Promise<ScheduleRecord[]> {
    if (!tenantId) return [];
    return (await this.readAll()).filter((record) => record.tenantId === tenantId && record.status === "active").slice(offset, offset + limit);
  }

  async listActive(limit = 50, offset = 0): Promise<ScheduleRecord[]> {
    const all = await this.readAll();
    return all.filter((s) => s.status === "active").slice(offset, offset + limit);
  }

  async listByVideo(videoId: string): Promise<ScheduleRecord[]> {
    const all = await this.readAll();
    return all.filter((s) => s.videoId === videoId);
  }

  private updateRecord(records: ScheduleRecord[], index: number, data: Partial<ScheduleRecord>): ScheduleRecord | undefined {
    if (index < 0) return undefined;
    const original = records[index];
    // Execution state, receipts and counters are written only by execution methods.
    const editable = { ...data };
    delete editable.execution; delete editable.lastOutput; delete editable.runCount; delete editable.failureCount; delete editable.lastRun;
    if (original.execution && original.execution.state !== "completed") {
      if (Object.keys(editable).some((key) => key !== "status") || editable.status !== undefined && !["active", "paused"].includes(editable.status)) throw new ScheduleConflictError();
    }
    data = editable;
    const record = { ...original, ...data, id: original.id, tenantId: original.tenantId, createdAt: original.createdAt, updatedAt: new Date().toISOString() };
    if (data.publishAt !== undefined) {
      if (!Number.isFinite(new Date(data.publishAt).getTime())) throw new ScheduleValidationError("Invalid publishAt date");
      record.publishAt = new Date(data.publishAt).toISOString();
      record.nextRun = record.publishAt;
      record.timingVariationApplied = undefined;
    } else if ((data.cronExpression !== undefined || data.timezone !== undefined || data.recurrence !== undefined) && record.runCount > 0) {
      record.nextRun = nextScheduleRun(record, new Date());
    }
    this.validate(record);
    records[index] = record;
    return record;
  }

  async updateForTenant(tenantId: string, id: string, data: Partial<Omit<ScheduleRecord, "id" | "createdAt" | "tenantId">>): Promise<ScheduleRecord | undefined> {
    if (!tenantId) return undefined;
    return this.mutate((records) => this.updateRecord(records, records.findIndex((record) => record.tenantId === tenantId && record.id === id), data));
  }

  async update(id: string, data: Partial<Omit<ScheduleRecord, "id" | "createdAt">>): Promise<ScheduleRecord | undefined> {
    return this.mutate((records) => this.updateRecord(records, records.findIndex((record) => record.id === id), data));
  }

  async updateStatusForTenant(tenantId: string, id: string, status: ScheduleRecord["status"]): Promise<ScheduleRecord | undefined> {
    return this.updateForTenant(tenantId, id, { status });
  }

  async updateStatus(id: string, status: ScheduleRecord["status"]): Promise<ScheduleRecord | undefined> {
    return this.update(id, { status });
  }

  async claimForTenant(tenantId: string, id: string, expectedRunCount: number, dueAt: string, producerContract?: { expectedAssets: number; expectsVideo: boolean }, expectedConfigurationDigest?: string): Promise<ScheduleExecution | undefined> {
    if (producerContract && (!Number.isSafeInteger(producerContract.expectedAssets) || producerContract.expectedAssets < 0 || producerContract.expectedAssets > 32 || typeof producerContract.expectsVideo !== "boolean")) throw new Error("Invalid producer contract");
    if (!tenantId || !Number.isSafeInteger(expectedRunCount) || !Number.isFinite(Date.parse(dueAt))) throw new Error("Invalid schedule claim");
    return this.mutate((records) => {
      const record = records.find((row) => row.id === id && row.tenantId === tenantId);
      if (!record || record.status !== "active" || record.runCount !== expectedRunCount || (record.nextRun ?? record.publishAt) !== dueAt) return undefined;
      if (expectedConfigurationDigest !== undefined && scheduleConfigurationDigest(record) !== expectedConfigurationDigest) return undefined;
      if (record.execution && record.execution.state !== "completed") return undefined;
      if (record.execution && record.execution.runCountAtClaim >= record.runCount) throw new Error("Schedule execution requires reconciliation");
      const now = new Date().toISOString();
      const execution: ScheduleExecution = { id: crypto.randomUUID(), dueAt, runCountAtClaim: record.runCount, configuration: scheduleConfiguration(record), producerContract, state: "claimed", claimedAt: now, updatedAt: now };
      record.execution = execution; return execution;
    });
  }

  async checkpointOutputForTenant(tenantId: string, id: string, executionId: string, output: ScheduleOutput): Promise<void> {
    this.mutate((records) => {
      const record = records.find((row) => row.id === id && row.tenantId === tenantId), execution = record?.execution;
      if (!execution || execution.id !== executionId || execution.state !== "claimed") throw new Error("Schedule checkpoint binding mismatch");
      const contract = execution.producerContract;
      if (!contract || output.artifacts.length > contract.expectedAssets || (contract.expectsVideo ? output.state !== "video-queued" || !output.videoId : output.state !== "assets-persisted" || Boolean(output.videoId))) throw new Error("Output does not match producer contract");
      const prior = execution.pendingOutput;
      if (prior && (prior.videoId && prior.videoId !== output.videoId || JSON.stringify(output.artifacts.slice(0, prior.artifacts.length)) !== JSON.stringify(prior.artifacts))) throw new Error("Schedule checkpoint cannot be rebound");
      execution.pendingOutput = output; execution.updatedAt = new Date().toISOString();
    });
  }

  async confirmAssetsForTenant(tenantId: string, id: string, executionId: string, checkpointDigest: string, evidenceReference: string, operator: string): Promise<ScheduleRecord> {
    return this.mutate((records) => {
      const index = records.findIndex((row) => row.id === id && row.tenantId === tenantId), record = records[index], execution = record?.execution;
      if (!execution || execution.id !== executionId || scheduleCheckpointDigest(execution) !== checkpointDigest) throw new Error("Schedule checkpoint changed");
      if (execution.reconciliation) {
        if (execution.reconciliation.evidenceReference !== evidenceReference || execution.reconciliation.checkpointDigest !== checkpointDigest) throw new Error("Outcome already confirmed with different evidence");
        return record;
      }
      if (execution.state === "completed" || execution.producerContract?.expectsVideo !== false || !execution.pendingOutput || record.runCount !== execution.runCountAtClaim) throw new Error("Schedule is not eligible for asset confirmation");
      if (execution.pendingOutput.state !== "assets-persisted" || execution.pendingOutput.videoId || execution.pendingOutput.artifacts.length !== execution.producerContract.expectedAssets || new Set(execution.pendingOutput.artifacts.map((artifact) => artifact.id)).size !== execution.pendingOutput.artifacts.length) throw new Error("Incomplete asset checkpoint");
      execution.state = "claimed";
      const completed = this.recordExecution(records, index, true, execution.pendingOutput, executionId)!;
      completed.execution!.reconciliation = { evidenceReference, operator, confirmedAt: new Date().toISOString(), checkpointDigest };
      return completed;
    });
  }

  async pendingVideos(): Promise<ScheduleRecord[]> {
    return (await this.readAll()).filter((record) => record.tenantId && record.execution?.state !== "completed" && record.execution?.producerContract?.expectsVideo && record.execution.pendingOutput?.state === "video-queued");
  }

  async completeVideoForTenant(tenantId: string, id: string, executionId: string, digest: string, binding: { videoId: string; videoArtifactId: string; contentVersionId: string }): Promise<boolean> {
    return this.mutate((records) => {
      const index = records.findIndex((row) => row.tenantId === tenantId && row.id === id);
      const record = records[index], execution = record?.execution, output = execution?.pendingOutput;
      if (!execution || execution.state === "completed" || execution.id !== executionId || scheduleCheckpointDigest(execution) !== digest ||
          record.runCount !== execution.runCountAtClaim || !execution.producerContract?.expectsVideo ||
          output?.state !== "video-queued" || output.videoId !== binding.videoId || !binding.videoId || !binding.videoArtifactId || !binding.contentVersionId ||
          output.artifacts.length !== execution.producerContract.expectedAssets || new Set(output.artifacts.map((artifact) => artifact.id)).size !== output.artifacts.length) return false;
      execution.state = "claimed";
      this.recordExecution(records, index, true, { ...output, ...binding, state: "video-completed", recordedAt: new Date().toISOString() }, executionId);
      return true;
    });
  }

  async holdExecutionForTenant(tenantId: string, id: string, executionId: string, output?: ScheduleOutput): Promise<void> {
    this.mutate((records) => {
      const record = records.find((row) => row.id === id && row.tenantId === tenantId);
      if (!record?.execution || record.execution.id !== executionId) throw new Error("Schedule execution binding not found");
      if (record.execution.state === "completed") return;
      const prior = record.execution.pendingOutput;
      if (prior && output && (prior.videoId && prior.videoId !== output.videoId || JSON.stringify(output.artifacts.slice(0, prior.artifacts.length)) !== JSON.stringify(prior.artifacts))) throw new Error("Held checkpoint cannot be rebound");
      record.execution = { ...record.execution, state: "reconciling", pendingOutput: output ?? record.execution.pendingOutput, updatedAt: new Date().toISOString() };
    });
  }

  private recordExecution(records: ScheduleRecord[], index: number, success: boolean, output?: ScheduleOutput, executionId?: string): ScheduleRecord | undefined {
    if (index < 0) return undefined;
    const record = records[index];
    if (record.execution && record.execution.state !== "completed" && !executionId) return undefined;
    if (record.execution && record.execution.state !== "completed" && record.execution.id !== executionId) throw new Error("Schedule execution is held");
    if (executionId) {
      if (!record.execution || record.execution.id !== executionId) throw new Error("Schedule execution mismatch");
      if (record.execution.state === "completed") return record;
      if (record.execution.state !== "claimed") throw new Error("Schedule execution requires reconciliation");
    }
    const now = new Date();
    const nextRun = nextScheduleRun(record, now);
    const updated = {
      ...record, ...(executionId && record.execution ? { execution: { ...record.execution, state: "completed" as const, outcome: success ? "success" as const : "failed" as const, updatedAt: now.toISOString() } } : {}), ...(success && output ? { lastOutput: output } : {}), lastRun: now.toISOString(), updatedAt: now.toISOString(), runCount: record.runCount + 1,
      failureCount: record.failureCount + (success ? 0 : 1), nextRun, timingVariationApplied: undefined,
      status: record.recurrence === "once" ? (success ? "completed" : "failed") as ScheduleRecord["status"] : record.status,
    };
    records[index] = updated;
    return updated;
  }

  async recordRunForTenant(tenantId: string, id: string, success: boolean, output?: ScheduleOutput, executionId?: string): Promise<ScheduleRecord | undefined> {
    if (!tenantId) return undefined;
    return this.mutate((records) => {
      const index = records.findIndex((record) => record.id === id && record.tenantId === tenantId);
      const execution = records[index]?.execution;
      if (index >= 0 && success && ((execution?.producerContract?.expectsVideo && execution.state !== "completed") ||
          output?.state === "video-queued" || output?.state === "video-completed")) throw new Error("Video completion requires verified render evidence");
      return this.recordExecution(records, index, success, output, executionId);
    });
  }

  async recordRun(id: string, success: boolean): Promise<ScheduleRecord | undefined> {
    return this.mutate((records) => this.recordExecution(records, records.findIndex((record) => record.id === id), success));
  }

  async deleteForTenant(tenantId: string, id: string): Promise<boolean> {
    if (!tenantId) return false;
    return this.mutate((records) => {
      const index = records.findIndex((record) => record.id === id && record.tenantId === tenantId);
      if (index < 0) return false;
      if (records[index].execution && records[index].execution!.state !== "completed") throw new ScheduleConflictError();
      records.splice(index, 1);
      return true;
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.mutate((records) => {
      const index = records.findIndex((record) => record.id === id);
      if (index < 0) return false;
      if (records[index].execution && records[index].execution!.state !== "completed") throw new ScheduleConflictError();
      records.splice(index, 1);
      return true;
    });
  }

  async getStatsForTenant(tenantId: string): Promise<{
    total: number; active: number; paused: number; completed: number; failed: number; totalRuns: number; totalFailures: number;
  }> {
    const records = tenantId ? (await this.readAll()).filter((record) => record.tenantId === tenantId) : [];
    return {
      total: records.length,
      active: records.filter((s) => s.status === "active").length,
      paused: records.filter((s) => s.status === "paused").length,
      completed: records.filter((s) => s.status === "completed").length,
      failed: records.filter((s) => s.status === "failed").length,
      totalRuns: records.reduce((sum, s) => sum + s.runCount, 0),
      totalFailures: records.reduce((sum, s) => sum + s.failureCount, 0),
    };
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    paused: number;
    completed: number;
    failed: number;
    totalRuns: number;
    totalFailures: number;
  }> {
    const records = await this.readAll();
    return {
      total: records.length,
      active: records.filter((s) => s.status === "active").length,
      paused: records.filter((s) => s.status === "paused").length,
      completed: records.filter((s) => s.status === "completed").length,
      failed: records.filter((s) => s.status === "failed").length,
      totalRuns: records.reduce((sum, s) => sum + s.runCount, 0),
      totalFailures: records.reduce((sum, s) => sum + s.failureCount, 0),
    };
  }

  private isDue(record: ScheduleRecord, now: number): boolean {
    if (!record.tenantId || record.status !== "active" || (record.execution && record.execution.state !== "completed")) return false;
    // Old completed executions may have a persisted nextRun. Never fall back to
    // publishAt after a run, or the original past date would trigger every tick.
    const dueAt = record.nextRun ?? (record.runCount === 0 ? record.publishAt : undefined);
    return typeof dueAt === "string" && new Date(dueAt).getTime() <= now;
  }

  async getDueSchedules(): Promise<ScheduleRecord[]> {
    const now = Date.now();
    return (await this.readAll()).filter((record) => this.isDue(record, now));
  }

  async getDueSchedulesForTenant(tenantId: string): Promise<ScheduleRecord[]> {
    if (!tenantId) return [];
    const now = Date.now();
    return (await this.readAll()).filter((record) => record.tenantId === tenantId && this.isDue(record, now));
  }
}
