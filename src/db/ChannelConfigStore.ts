import fs from "fs-extra";
import path from "path";
import cuid from "cuid";

export interface ChannelConfigRecord {
  /** Auth-derived owner. Legacy records without this field are not tenant-visible. */
  tenantId?: string;
  id: string;
  category: string;
  platform: string;
  channelId: string;
  createdAt: string;
}

export class ChannelConfigStore {
  private storePath: string;

  constructor(basePath: string) {
    this.storePath = path.join(basePath, "channelConfigs.json");
    fs.ensureFileSync(this.storePath);
    if (!fs.readFileSync(this.storePath, "utf-8").trim()) {
      fs.writeFileSync(this.storePath, "[]", "utf-8");
    }
  }

  private async readAll(): Promise<ChannelConfigRecord[]> {
    const content = await fs.readFile(this.storePath, "utf-8");
    if (!content.trim()) return [];
    try {
      return JSON.parse(content) as ChannelConfigRecord[];
    } catch {
      await fs.writeFile(this.storePath, "[]", "utf-8");
      return [];
    }
  }

  private async writeAll(records: ChannelConfigRecord[]): Promise<void> {
    await fs.writeFile(this.storePath, JSON.stringify(records, null, 2), "utf-8");
  }

  async list(): Promise<ChannelConfigRecord[]> {
    return this.readAll();
  }

  async listForTenant(tenantId: string): Promise<ChannelConfigRecord[]> {
    if (!tenantId) return [];
    return (await this.readAll()).filter((record) => record.tenantId === tenantId);
  }

  async create(data: {
    tenantId: string;
    category: string;
    platform: string;
    channelId: string;
  }): Promise<ChannelConfigRecord> {
    const records = await this.readAll();
    const record: ChannelConfigRecord = {
      ...data,
      tenantId: data.tenantId,
      id: `cc_${cuid()}`,
      createdAt: new Date().toISOString(),
    };
    records.push(record);
    await this.writeAll(records);
    return record;
  }

  async deleteForTenant(tenantId: string, id: string): Promise<boolean> {
    if (!tenantId) return false;
    const records = await this.readAll();
    const idx = records.findIndex((record) => record.id === id && record.tenantId === tenantId);
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
}
