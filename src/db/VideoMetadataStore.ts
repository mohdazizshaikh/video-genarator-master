import fs from "fs-extra";
import path from "path";
import type { SceneInput, VideoMetadataRecord } from "../types/shorts";

export class VideoMetadataStore {
  private storePath: string;

  constructor(basePath: string) {
    this.storePath = path.join(basePath, "videoMetadata.json");
    fs.ensureFileSync(this.storePath);
    if (!fs.readFileSync(this.storePath, "utf-8").trim()) {
      fs.writeFileSync(this.storePath, "[]", "utf-8");
    }
  }

  private buildRecord(params: {
    tenantId?: string;
    videoId: string;
    scenes: SceneInput[];
    category?: string;
    signature?: string | null;
    existing?: VideoMetadataRecord;
  }): VideoMetadataRecord {
    const now = new Date().toISOString();
    const { tenantId, videoId, scenes, category, signature, existing } = params;

    const headlines = scenes
      .map((scene) => scene.headline?.trim())
      .filter((value): value is string => Boolean(value));

    const keywords = Array.from(new Set(
      scenes.flatMap((scene) => [
        ...(scene.keywords || []),
        ...(scene.searchTerms || []),
      ].map((term) => term.trim()).filter(Boolean)),
    )).slice(0, 20);

    const summary = scenes.map((scene) => scene.text.trim()).join(" ").slice(0, 4000);
    const topic = headlines[0]
      || scenes[0]?.subcategory
      || scenes[0]?.text.split(" ").slice(0, 8).join(" ")
      || videoId;

    const subcategory = scenes.find((scene) => scene.subcategory?.trim())?.subcategory?.trim() || null;

    return {
      tenantId,
      videoId,
      signature: signature ?? existing?.signature ?? null,
      topic,
      summary,
      category: category ?? existing?.category ?? null,
      subcategory,
      keywords,
      headlines,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
  }

  private readAllSync(): VideoMetadataRecord[] {
    const content = fs.readFileSync(this.storePath, "utf-8");
    if (!content.trim()) return [];
    try {
      return JSON.parse(content) as VideoMetadataRecord[];
    } catch {
      fs.writeFileSync(this.storePath, "[]", "utf-8");
      return [];
    }
  }

  private async readAll(): Promise<VideoMetadataRecord[]> {
    return this.readAllSync();
  }

  private writeAllSync(records: VideoMetadataRecord[]): void {
    fs.writeFileSync(this.storePath, JSON.stringify(records, null, 2), "utf-8");
  }

  private async writeAll(records: VideoMetadataRecord[]): Promise<void> {
    this.writeAllSync(records);
  }

  public upsertFromScenesSync(params: {
    tenantId?: string;
    videoId: string;
    scenes: SceneInput[];
    category?: string;
    signature?: string | null;
  }): VideoMetadataRecord {
    const records = this.readAllSync();
    const existingIndex = records.findIndex((item) => item.videoId === params.videoId && item.tenantId === params.tenantId);
    const existing = existingIndex >= 0 ? records[existingIndex] : undefined;
    const record = this.buildRecord({ ...params, existing });

    if (existingIndex >= 0) {
      records[existingIndex] = record;
    } else {
      records.push(record);
    }

    this.writeAllSync(records);
    return record;
  }

  public async upsertFromScenes(params: {
    tenantId?: string;
    videoId: string;
    scenes: SceneInput[];
    category?: string;
    signature?: string | null;
  }): Promise<VideoMetadataRecord> {
    const records = await this.readAll();
    const existingIndex = records.findIndex((item) => item.videoId === params.videoId && item.tenantId === params.tenantId);
    const existing = existingIndex >= 0 ? records[existingIndex] : undefined;
    const record = this.buildRecord({ ...params, existing });

    if (existingIndex >= 0) {
      records[existingIndex] = record;
    } else {
      records.push(record);
    }

    await this.writeAll(records);
    return record;
  }

  public findBySignatureSync(signature: string, tenantId?: string): VideoMetadataRecord | undefined {
    return this.readAllSync().find((record) => record.signature === signature && record.tenantId === tenantId);
  }

  public async get(videoId: string, tenantId?: string): Promise<VideoMetadataRecord | undefined> {
    return (await this.readAll()).find((record) => record.videoId === videoId && record.tenantId === tenantId);
  }

  public async listForTenant(tenantId: string): Promise<VideoMetadataRecord[]> {
    if (!tenantId) return [];
    return (await this.readAll()).filter((record) => record.tenantId === tenantId);
  }
}
