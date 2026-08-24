import fs from "fs-extra";
import path from "path";
import cuid from "cuid";
import type { RenderJobRecord, RenderJobStatus, VideoType, OrientationEnum } from "../types/shorts";

export class RenderJobStore {
  private storePath: string;

  constructor(basePath: string) {
    this.storePath = path.join(basePath, "renderJobs.json");
    fs.ensureFileSync(this.storePath);
    if (!fs.readFileSync(this.storePath, "utf-8").trim()) {
      fs.writeFileSync(this.storePath, "[]", "utf-8");
    }
  }

  private async readAll(): Promise<RenderJobRecord[]> {
    const content = await fs.readFile(this.storePath, "utf-8");
    if (!content.trim()) return [];
    try {
      return JSON.parse(content) as RenderJobRecord[];
    } catch {
      await fs.writeFile(this.storePath, "[]", "utf-8");
      return [];
    }
  }

  private async writeAll(records: RenderJobRecord[]): Promise<void> {
    await fs.writeFile(this.storePath, JSON.stringify(records, null, 2), "utf-8");
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
    const records = await this.readAll();
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
    await this.writeAll(records);
    return record;
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
    extras: Partial<Pick<RenderJobRecord, "outputPath" | "error" | "attemptCount">> = {},
  ): Promise<RenderJobRecord | undefined> {
    const records = await this.readAll();
    const idx = records.findIndex((r) => r.id === id);
    if (idx < 0) return undefined;
    records[idx] = { ...records[idx], status, ...extras, updatedAt: new Date().toISOString() };
    await this.writeAll(records);
    return records[idx];
  }

  public async updateStatusForTenant(
    tenantId: string,
    id: string,
    status: RenderJobStatus,
    extras: Partial<Pick<RenderJobRecord, "outputPath" | "error" | "attemptCount">> = {},
  ): Promise<RenderJobRecord | undefined> {
    if (!(await this.getForTenant(tenantId, id))) return undefined;
    return this.updateStatus(id, status, extras);
  }

  public async incrementAttempt(id: string): Promise<RenderJobRecord | undefined> {
    const records = await this.readAll();
    const idx = records.findIndex((r) => r.id === id);
    if (idx < 0) return undefined;
    records[idx].attemptCount += 1;
    records[idx].updatedAt = new Date().toISOString();
    await this.writeAll(records);
    return records[idx];
  }

  public async incrementAttemptForTenant(tenantId: string, id: string): Promise<RenderJobRecord | undefined> {
    if (!(await this.getForTenant(tenantId, id))) return undefined;
    return this.incrementAttempt(id);
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
