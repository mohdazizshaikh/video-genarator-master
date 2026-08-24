import fs from "fs-extra";
import path from "path";
import cuid from "cuid";

export interface AudienceTargetRecord {
  id: string;
  tenantId?: string;
  category: string;
  location: string;
  ageGroup: string;
  interests: string[];
  score: number;
  createdAt: string;
}

export class AudienceStore {
  private storePath: string;

  constructor(basePath: string) {
    this.storePath = path.join(basePath, "audienceTargets.json");
    fs.ensureFileSync(this.storePath);
    if (!fs.readFileSync(this.storePath, "utf-8").trim()) {
      fs.writeFileSync(this.storePath, "[]", "utf-8");
    }
  }

  private async readAll(): Promise<AudienceTargetRecord[]> {
    const content = await fs.readFile(this.storePath, "utf-8");
    if (!content.trim()) return [];
    try { return JSON.parse(content) as AudienceTargetRecord[]; } catch { return []; }
  }

  private async writeAll(records: AudienceTargetRecord[]): Promise<void> {
    await fs.writeFile(this.storePath, JSON.stringify(records, null, 2), "utf-8");
  }

  async add(params: Omit<AudienceTargetRecord, "id" | "createdAt">): Promise<AudienceTargetRecord> {
    const current = await this.readAll();
    const record: AudienceTargetRecord = {
      id: cuid(),
      createdAt: new Date().toISOString(),
      ...params,
    };
    current.push(record);
    await this.writeAll(current);
    return record;
  }

  async listForTenant(tenantId: string): Promise<AudienceTargetRecord[]> {
    if (!tenantId) return [];
    return (await this.readAll()).filter((record) => record.tenantId === tenantId).sort((a, b) => b.score - a.score);
  }

  async list(): Promise<AudienceTargetRecord[]> {
    return (await this.readAll()).sort((a, b) => b.score - a.score);
  }
}
