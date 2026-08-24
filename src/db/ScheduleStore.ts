import fs from "fs-extra";
import path from "path";
import cuid from "cuid";

export interface ScheduleRecord {
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

export class ScheduleStore {
  private storePath: string;

  constructor(basePath: string) {
    this.storePath = path.join(basePath, "schedules.json");
    fs.ensureFileSync(this.storePath);
    if (!fs.readFileSync(this.storePath, "utf-8").trim()) {
      fs.writeFileSync(this.storePath, "[]", "utf-8");
    }
  }

  private async readAll(): Promise<ScheduleRecord[]> {
    const content = await fs.readFile(this.storePath, "utf-8");
    if (!content.trim()) return [];
    try {
      return JSON.parse(content) as ScheduleRecord[];
    } catch {
      await fs.writeFile(this.storePath, "[]", "utf-8");
      return [];
    }
  }

  private async writeAll(records: ScheduleRecord[]): Promise<void> {
    await fs.writeFile(this.storePath, JSON.stringify(records, null, 2), "utf-8");
  }

  async createForTenant(tenantId: string, data: Omit<ScheduleRecord, "id" | "createdAt" | "updatedAt" | "runCount" | "failureCount" | "tenantId">): Promise<ScheduleRecord> {
    if (!tenantId) throw new Error("tenantId is required");
    return this.create({ ...data, tenantId });
  }

  async create(data: Omit<ScheduleRecord, "id" | "createdAt" | "updatedAt" | "runCount" | "failureCount">): Promise<ScheduleRecord> {
    const records = await this.readAll();
    const now = new Date().toISOString();
    const record: ScheduleRecord = {
      id: `sched_${cuid()}`,
      ...data,
      runCount: 0,
      failureCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    records.push(record);
    await this.writeAll(records);
    return record;
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

  async updateForTenant(tenantId: string, id: string, data: Partial<Omit<ScheduleRecord, "id" | "createdAt" | "tenantId">>): Promise<ScheduleRecord | undefined> {
    if (!tenantId) return undefined;
    const records = await this.readAll();
    const idx = records.findIndex((record) => record.tenantId === tenantId && record.id === id);
    if (idx < 0) return undefined;
    records[idx] = { ...records[idx], ...data, tenantId, updatedAt: new Date().toISOString() };
    await this.writeAll(records);
    return records[idx];
  }

  async update(id: string, data: Partial<Omit<ScheduleRecord, "id" | "createdAt">>): Promise<ScheduleRecord | undefined> {
    const records = await this.readAll();
    const idx = records.findIndex((r) => r.id === id);
    if (idx < 0) return undefined;
    records[idx] = { ...records[idx], ...data, updatedAt: new Date().toISOString() };
    await this.writeAll(records);
    return records[idx];
  }

  async updateStatusForTenant(tenantId: string, id: string, status: ScheduleRecord["status"]): Promise<ScheduleRecord | undefined> {
    return this.updateForTenant(tenantId, id, { status });
  }

  async updateStatus(id: string, status: ScheduleRecord["status"]): Promise<ScheduleRecord | undefined> {
    return this.update(id, { status });
  }

  async recordRunForTenant(tenantId: string, id: string, success: boolean): Promise<ScheduleRecord | undefined> {
    const record = await this.getForTenant(tenantId, id);
    if (!record) return undefined;
    const update: Partial<ScheduleRecord> = { lastRun: new Date().toISOString(), runCount: record.runCount + 1 };
    if (!success) update.failureCount = record.failureCount + 1;
    const nextDate = new Date();
    nextDate.setHours(nextDate.getHours() + 1);
    update.nextRun = nextDate.toISOString();
    return this.updateForTenant(tenantId, id, update);
  }

  async recordRun(id: string, success: boolean): Promise<ScheduleRecord | undefined> {
    const record = await this.get(id);
    if (!record) return undefined;
    const update: Partial<ScheduleRecord> = {
      lastRun: new Date().toISOString(),
      runCount: record.runCount + 1,
    };
    if (!success) {
      update.failureCount = record.failureCount + 1;
    }
    // Calculate next run based on cron expression (simplified)
    const nextDate = new Date();
    nextDate.setHours(nextDate.getHours() + 1);
    update.nextRun = nextDate.toISOString();
    return this.update(id, update);
  }

  async deleteForTenant(tenantId: string, id: string): Promise<boolean> {
    if (!tenantId) return false;
    const records = await this.readAll();
    const idx = records.findIndex((record) => record.tenantId === tenantId && record.id === id);
    if (idx < 0) return false;
    records.splice(idx, 1);
    await this.writeAll(records);
    return true;
  }

  async delete(id: string): Promise<boolean> {
    const records = await this.readAll();
    const idx = records.findIndex((r) => r.id === id);
    if (idx < 0) return false;
    records.splice(idx, 1);
    await this.writeAll(records);
    return true;
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

  async getDueSchedules(): Promise<ScheduleRecord[]> {
    const all = await this.readAll();
    const now = new Date();
    return all.filter((record) => Boolean(record.tenantId) && record.status === "active" && new Date(record.publishAt) <= now);
  }

  async getDueSchedulesForTenant(tenantId: string): Promise<ScheduleRecord[]> {
    if (!tenantId) return [];
    const all = (await this.readAll()).filter((record) => record.tenantId === tenantId);
    const now = new Date();
    return all.filter((s) => s.status === "active" && new Date(s.publishAt) <= now);
  }
}
