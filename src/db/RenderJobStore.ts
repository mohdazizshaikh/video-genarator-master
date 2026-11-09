import fs from "fs-extra";
import path from "path";
import cuid from "cuid";
import crypto from "node:crypto";
import type { RenderJobRecord, RenderJobStatus, VideoType, OrientationEnum } from "../types/shorts";

export class RenderJobStore {
  private storePath: string;

  constructor(basePath: string) {
    this.storePath = path.join(basePath, "renderJobs.json");
    fs.ensureDirSync(basePath);
    if (!fs.existsSync(this.storePath)) fs.writeFileSync(this.storePath, "[]", { flag: "wx", mode: 0o600 });
  }

  private readSync(): RenderJobRecord[] {
    const records: unknown = fs.readJsonSync(this.storePath);
    if (!Array.isArray(records)) throw new Error("Invalid render job store; reconciliation is required");
    return records as RenderJobRecord[];
  }

  private async readAll(): Promise<RenderJobRecord[]> { return this.readSync(); }

  private mutate<T>(change: (records: RenderJobRecord[]) => T): T {
    const records = this.readSync();
    const result = change(records);
    const temporary = `${this.storePath}.${crypto.randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, JSON.stringify(records, null, 2), { flag: "wx", mode: 0o600 });
      fs.renameSync(temporary, this.storePath);
    } finally { fs.removeSync(temporary); }
    return result;
  }

  public async create(params: {
    tenantId: string;
    scriptPlanId: string;
    videoType: VideoType;
    language: string;
    subtitleLanguage: string;
    orientation: OrientationEnum;
    category: string;
    namingKey: string;
  }): Promise<RenderJobRecord> {
    if (!params.tenantId?.trim()) throw new Error("Render job workspace is required");
    return this.mutate((records) => {
    const now = new Date().toISOString();
    const record: RenderJobRecord = {
      ...params,
      tenantId: params.tenantId,
      id: cuid(),
      status: "queued",
      attemptCount: 0,
      outputPath: null,
      error: null,
      createdAt: now,
      updatedAt: now,
    };
    records.push(record);
    return record;
    });
  }

  public async get(id: string): Promise<RenderJobRecord | undefined> {
    return (await this.readAll()).find((r) => r.id === id);
  }

  public async getForTenant(tenantId: string, id: string): Promise<RenderJobRecord | undefined> {
    if (!tenantId) return undefined;
    const record = await this.get(id);
    return record?.tenantId === tenantId ? record : undefined;
  }

  public async list(): Promise<RenderJobRecord[]> {
    return (await this.readAll()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  public async listForTenant(tenantId: string): Promise<RenderJobRecord[]> {
    if (!tenantId) return [];
    return (await this.readAll()).filter((record) => record.tenantId === tenantId).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  public async listByStatus(status: RenderJobStatus): Promise<RenderJobRecord[]> {
    return (await this.readAll()).filter((r) => r.status === status);
  }

  public async listByStatusForTenant(tenantId: string, status: RenderJobStatus): Promise<RenderJobRecord[]> {
    if (!tenantId) return [];
    return (await this.readAll()).filter((record) => record.tenantId === tenantId && record.status === status);
  }

  public async updateStatus(
    id: string,
    status: RenderJobStatus,
    extras: Partial<Pick<RenderJobRecord, "outputPath" | "error" | "attemptCount" | "executionId" | "videoId" | "artifactId" | "contentVersionId">> = {},
  ): Promise<RenderJobRecord | undefined> {
    return this.mutate((records) => this.setStatus(records, records.findIndex((record) => record.id === id), status, extras));
  }

  private setStatus(records: RenderJobRecord[], index: number, status: RenderJobStatus, extras: Partial<Pick<RenderJobRecord, "outputPath" | "error" | "attemptCount" | "executionId" | "videoId" | "artifactId" | "contentVersionId">>) {
    if (index < 0) return undefined;
    records[index] = { ...records[index], ...extras, status, updatedAt: new Date().toISOString() };
    return records[index];
  }

  public async updateStatusForTenant(
    tenantId: string, id: string, status: RenderJobStatus,
    extras: Partial<Pick<RenderJobRecord, "outputPath" | "error" | "attemptCount" | "executionId" | "videoId" | "artifactId" | "contentVersionId">> = {},
  ): Promise<RenderJobRecord | undefined> {
    if (!tenantId) return undefined;
    return this.mutate((records) => this.setStatus(records, records.findIndex((record) => record.tenantId === tenantId && record.id === id), status, extras));
  }

  public async incrementAttempt(id: string): Promise<RenderJobRecord | undefined> {
    return this.mutate((records) => this.increment(records, records.findIndex((record) => record.id === id)));
  }

  private increment(records: RenderJobRecord[], index: number) {
    if (index < 0) return undefined;
    records[index] = { ...records[index], attemptCount: records[index].attemptCount + 1, updatedAt: new Date().toISOString() };
    return records[index];
  }

  public async incrementAttemptForTenant(tenantId: string, id: string): Promise<RenderJobRecord | undefined> {
    if (!tenantId) return undefined;
    return this.mutate((records) => this.increment(records, records.findIndex((record) => record.tenantId === tenantId && record.id === id)));
  }

  /** Find existing job with same idempotency key */
  public async findByNamingKey(namingKey: string): Promise<RenderJobRecord | undefined> {
    return (await this.readAll()).find((r) => r.namingKey === namingKey);
  }

  public async findByNamingKeyForTenant(tenantId: string, namingKey: string): Promise<RenderJobRecord | undefined> {
    if (!tenantId) return undefined;
    return (await this.readAll()).find((record) => record.tenantId === tenantId && record.namingKey === namingKey);
  }

  public async getStats(): Promise<Record<RenderJobStatus, number>> {
    const records = await this.readAll();
    return records.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      {} as Record<RenderJobStatus, number>,
    );
  }
}
