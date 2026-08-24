import fs from "fs-extra";
import path from "path";
import cuid from "cuid";
import type { PlatformType } from "../types/shorts";

export interface AnalyticsRecord {
  /** Auth-derived owner. Legacy analytics without this field are not tenant-visible. */
  tenantId?: string;
  id: string;
  publishJobId: string;
  renderOutputId: string;
  platform: PlatformType;
  externalId: string;
  views: number;
  likes: number;
  shares: number;
  comments: number;
  fetchedAt: string;
  createdAt: string;
}

export class AnalyticsStore {
  private storePath: string;

  constructor(basePath: string) {
    this.storePath = path.join(basePath, "analytics.json");
    fs.ensureFileSync(this.storePath);
    if (!fs.readFileSync(this.storePath, "utf-8").trim()) {
      fs.writeFileSync(this.storePath, "[]", "utf-8");
    }
  }

  private async readAll(): Promise<AnalyticsRecord[]> {
    const content = await fs.readFile(this.storePath, "utf-8");
    if (!content.trim()) return [];
    try { return JSON.parse(content); } catch { return []; }
  }

  private async writeAll(records: AnalyticsRecord[]): Promise<void> {
    await fs.writeFile(this.storePath, JSON.stringify(records, null, 2), "utf-8");
  }

  public async upsertForTenant(tenantId: string, params: Omit<AnalyticsRecord, "id" | "createdAt" | "tenantId">): Promise<AnalyticsRecord> {
    if (!tenantId) throw new Error("tenantId is required");
    const records = await this.readAll();
    const existing = records.findIndex((record) => record.tenantId === tenantId && record.publishJobId === params.publishJobId && record.platform === params.platform);
    const now = new Date().toISOString();
    if (existing >= 0) {
      records[existing] = { ...records[existing], ...params, tenantId, fetchedAt: now };
      await this.writeAll(records);
      return records[existing];
    }
    const record: AnalyticsRecord = { id: cuid(), ...params, tenantId, createdAt: now };
    records.push(record);
    await this.writeAll(records);
    return record;
  }

  public async upsert(params: Omit<AnalyticsRecord, "id" | "createdAt">): Promise<AnalyticsRecord> {
    const records = await this.readAll();
    const existing = records.findIndex(
      (r) => r.publishJobId === params.publishJobId && r.platform === params.platform,
    );
    const now = new Date().toISOString();
    if (existing >= 0) {
      records[existing] = { ...records[existing], ...params, fetchedAt: now };
      await this.writeAll(records);
      return records[existing];
    }
    const record: AnalyticsRecord = {
      id: cuid(),
      ...params,
      createdAt: now,
    };
    records.push(record);
    await this.writeAll(records);
    return record;
  }

  public async getByVideoForTenant(tenantId: string, renderOutputId: string): Promise<AnalyticsRecord[]> {
    if (!tenantId) return [];
    return (await this.readAll()).filter((record) => record.tenantId === tenantId && record.renderOutputId === renderOutputId);
  }

  public async getByVideo(renderOutputId: string): Promise<AnalyticsRecord[]> {
    return (await this.readAll()).filter((r) => r.renderOutputId === renderOutputId);
  }

  public async getByPlatform(platform: PlatformType): Promise<AnalyticsRecord[]> {
    return (await this.readAll()).filter((r) => r.platform === platform);
  }

  public async listForTenant(tenantId: string): Promise<AnalyticsRecord[]> {
    if (!tenantId) return [];
    return (await this.readAll()).filter((record) => record.tenantId === tenantId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async list(): Promise<AnalyticsRecord[]> {
    return (await this.readAll()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
}
