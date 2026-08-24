import fs from "fs-extra";
import path from "path";
import cuid from "cuid";

export interface VideoRecord {
  /** Auth-derived owner. Legacy records without this field are not tenant-visible. */
  tenantId?: string;
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  duration: number;
  platform: string;
  status: "draft" | "published" | "scheduled" | "archived";
  videoPath?: string;
  thumbnailPath?: string;
  tags: string[];
  engagementMetrics?: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  publishedAt?: string;
  scheduledFor?: string;
  createdAt: string;
  updatedAt: string;
}

export class VideoLibraryStore {
  private storePath: string;

  constructor(basePath: string) {
    this.storePath = path.join(basePath, "videoLibrary.json");
    fs.ensureFileSync(this.storePath);
    if (!fs.readFileSync(this.storePath, "utf-8").trim()) {
      fs.writeFileSync(this.storePath, "[]", "utf-8");
    }
  }

  private async readAll(): Promise<VideoRecord[]> {
    const content = await fs.readFile(this.storePath, "utf-8");
    if (!content.trim()) return [];
    try {
      return JSON.parse(content) as VideoRecord[];
    } catch {
      await fs.writeFile(this.storePath, "[]", "utf-8");
      return [];
    }
  }

  private async writeAll(records: VideoRecord[]): Promise<void> {
    await fs.writeFile(this.storePath, JSON.stringify(records, null, 2), "utf-8");
  }

  async create(data: Omit<VideoRecord, "id" | "createdAt" | "updatedAt"> & { tenantId: string }): Promise<VideoRecord> {
    const records = await this.readAll();
    const now = new Date().toISOString();
    const record: VideoRecord = {
      ...data,
      tenantId: data.tenantId,
      id: `vid_${cuid()}`,
      createdAt: now,
      updatedAt: now,
    };
    records.push(record);
    await this.writeAll(records);
    return record;
  }

  async get(id: string): Promise<VideoRecord | undefined> {
    return (await this.readAll()).find((r) => r.id === id);
  }

  async getForTenant(tenantId: string, id: string): Promise<VideoRecord | undefined> {
    if (!tenantId) return undefined;
    const video = await this.get(id);
    return video?.tenantId === tenantId ? video : undefined;
  }

  async list(limit = 50, offset = 0): Promise<{ videos: VideoRecord[]; total: number }> {
    const all = await this.readAll();
    const sorted = all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return {
      videos: sorted.slice(offset, offset + limit),
      total: sorted.length,
    };
  }

  async listForTenant(tenantId: string, limit = 50, offset = 0): Promise<{ videos: VideoRecord[]; total: number }> {
    if (!tenantId) return { videos: [], total: 0 };
    const all = (await this.readAll()).filter((video) => video.tenantId === tenantId);
    const sorted = all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { videos: sorted.slice(offset, offset + limit), total: sorted.length };
  }

  async listByCategory(category: string, limit = 50, offset = 0): Promise<VideoRecord[]> {
    const all = await this.readAll();
    return all.filter((v) => v.category === category).slice(offset, offset + limit);
  }

  async listByStatus(status: VideoRecord["status"], limit = 50, offset = 0): Promise<VideoRecord[]> {
    const all = await this.readAll();
    return all.filter((v) => v.status === status).slice(offset, offset + limit);
  }

  async listByPlatform(platform: string, limit = 50, offset = 0): Promise<VideoRecord[]> {
    const all = await this.readAll();
    return all.filter((v) => v.platform === platform).slice(offset, offset + limit);
  }

  async searchForTenant(tenantId: string, query: string, limit = 50, offset = 0): Promise<VideoRecord[]> {
    if (!tenantId) return [];
    const all = (await this.readAll()).filter((video) => video.tenantId === tenantId);
    const q = query.toLowerCase();
    return all
      .filter((v) => v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q) || v.tags.some((t) => t.toLowerCase().includes(q)))
      .slice(offset, offset + limit);
  }

  async search(query: string, limit = 50, offset = 0): Promise<VideoRecord[]> {
    const all = await this.readAll();
    const q = query.toLowerCase();
    return all
      .filter((v) => v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q) || v.tags.some((t) => t.toLowerCase().includes(q)))
      .slice(offset, offset + limit);
  }

  async updateForTenant(tenantId: string, id: string, data: Partial<Omit<VideoRecord, "id" | "createdAt" | "tenantId">>): Promise<VideoRecord | undefined> {
    if (!(await this.getForTenant(tenantId, id))) return undefined;
    return this.update(id, data);
  }

  async update(id: string, data: Partial<Omit<VideoRecord, "id" | "createdAt">>): Promise<VideoRecord | undefined> {
    const records = await this.readAll();
    const idx = records.findIndex((r) => r.id === id);
    if (idx < 0) return undefined;
    records[idx] = { ...records[idx], ...data, updatedAt: new Date().toISOString() };
    await this.writeAll(records);
    return records[idx];
  }

  async updateStatusForTenant(tenantId: string, id: string, status: VideoRecord["status"]): Promise<VideoRecord | undefined> {
    return this.updateForTenant(tenantId, id, { status });
  }

  async updateStatus(id: string, status: VideoRecord["status"]): Promise<VideoRecord | undefined> {
    return this.update(id, { status, updatedAt: new Date().toISOString() });
  }

  async deleteForTenant(tenantId: string, id: string): Promise<boolean> {
    if (!(await this.getForTenant(tenantId, id))) return false;
    return this.delete(id);
  }

  async delete(id: string): Promise<boolean> {
    const records = await this.readAll();
    const idx = records.findIndex((r) => r.id === id);
    if (idx < 0) return false;
    records.splice(idx, 1);
    await this.writeAll(records);
    return true;
  }

  async updateMetricsForTenant(
    tenantId: string,
    id: string,
    metrics: Partial<NonNullable<VideoRecord["engagementMetrics"]>>,
  ): Promise<VideoRecord | undefined> {
    const record = await this.getForTenant(tenantId, id);
    if (!record) return undefined;
    const current = record.engagementMetrics ?? { views: 0, likes: 0, comments: 0, shares: 0 };
    return this.updateForTenant(tenantId, id, {
      engagementMetrics: {
        views: metrics.views ?? current.views,
        likes: metrics.likes ?? current.likes,
        comments: metrics.comments ?? current.comments,
        shares: metrics.shares ?? current.shares,
      },
    });
  }

  async updateMetrics(
    id: string,
    metrics: Partial<NonNullable<VideoRecord["engagementMetrics"]>>,
  ): Promise<VideoRecord | undefined> {
    const record = await this.get(id);
    if (!record) return undefined;
    const current = record.engagementMetrics ?? { views: 0, likes: 0, comments: 0, shares: 0 };
    return this.update(id, {
      engagementMetrics: {
        views: metrics.views ?? current.views,
        likes: metrics.likes ?? current.likes,
        comments: metrics.comments ?? current.comments,
        shares: metrics.shares ?? current.shares,
      },
    });
  }

  async getStatsForTenant(tenantId: string): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    byPlatform: Record<string, number>;
  }> {
    if (!tenantId) return { total: 0, byStatus: {}, byCategory: {}, byPlatform: {} };
    const records = (await this.readAll()).filter((video) => video.tenantId === tenantId);
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byPlatform: Record<string, number> = {};
    records.forEach((video) => {
      byStatus[video.status] = (byStatus[video.status] || 0) + 1;
      byCategory[video.category] = (byCategory[video.category] || 0) + 1;
      byPlatform[video.platform] = (byPlatform[video.platform] || 0) + 1;
    });
    return { total: records.length, byStatus, byCategory, byPlatform };
  }

  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    byPlatform: Record<string, number>;
  }> {
    const records = await this.readAll();
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byPlatform: Record<string, number> = {};

    records.forEach((v) => {
      byStatus[v.status] = (byStatus[v.status] || 0) + 1;
      byCategory[v.category] = (byCategory[v.category] || 0) + 1;
      byPlatform[v.platform] = (byPlatform[v.platform] || 0) + 1;
    });

    return { total: records.length, byStatus, byCategory, byPlatform };
  }

  async getTrendingTagsForTenant(tenantId: string, limit = 20): Promise<Array<{ tag: string; count: number }>> {
    if (!tenantId) return [];
    const records = (await this.readAll()).filter((video) => video.tenantId === tenantId);
    const tagCounts: Record<string, number> = {};
    records.forEach((video) => video.tags.forEach((tag) => { tagCounts[tag] = (tagCounts[tag] || 0) + 1; }));
    return Object.entries(tagCounts).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count).slice(0, limit);
  }

  async getTrendingTags(limit = 20): Promise<Array<{ tag: string; count: number }>> {
    const records = await this.readAll();
    const tagCounts: Record<string, number> = {};
    records.forEach((v) => {
      v.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}
