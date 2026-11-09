import path from "path";
import { initializeJsonArray, readJsonArray, writeJsonArray } from "./jsonArrayFile";
import type { SceneInput, VideoMetadataRecord } from "../types/shorts";

export class VideoMetadataStore {
  private storePath: string;

  constructor(basePath: string) {
    this.storePath = path.join(basePath, "videoMetadata.json");
    initializeJsonArray(this.storePath);
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
        ...(scene.searchTerms || [])].map((term) => term.trim()).filter(Boolean),
        ),
      ),
    ).slice(0, 20);

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
    const records = readJsonArray<VideoMetadataRecord>(this.storePath);
    const identities = new Set<string>();
    for (const record of records) {
      const identity = JSON.stringify([record.tenantId ?? null, record.videoId]);
      if (typeof record.videoId !== "string" || !record.videoId.trim() ||
          record.tenantId !== undefined && (typeof record.tenantId !== "string" || !record.tenantId.trim()) || identities.has(identity))
        throw new Error("Invalid video metadata identity; reconciliation is required");
      identities.add(identity);
    }
    return records;
  }

  private async readAll(): Promise<VideoMetadataRecord[]> {
    return this.readAllSync();
  }

  private writeAllSync(records: VideoMetadataRecord[]): void {
    writeJsonArray(this.storePath, records);
  }

  public upsertFromScenesSync(params: {
    tenantId?: string;
    videoId: string;
    scenes: SceneInput[];
    category?: string;
    signature?: string | null;
  }): VideoMetadataRecord {
    if (typeof params.tenantId !== "string" || !params.tenantId.trim() || typeof params.videoId !== "string" || !params.videoId.trim()) throw new Error("Video metadata workspace and video identity are required");
    const records = this.readAllSync();
    const existingIndex = records.findIndex((item) => item.videoId === params.videoId && item.tenantId === params.tenantId,
    );
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
    // Delegate before any await so independent instances cannot overwrite a
    // snapshot read before another same-process writer committed.
    return this.upsertFromScenesSync(params);
  }

  public findBySignatureSync(signature: string, tenantId?: string,
  ): VideoMetadataRecord | undefined {
    if (!tenantId?.trim()) return undefined;
    return this.readAllSync().find((record) => record.signature === signature && record.tenantId === tenantId,
    );
  }

  public getSync(videoId: string, tenantId: string,
  ): VideoMetadataRecord | undefined {
    if (!tenantId?.trim()) return undefined;
    return this.readAllSync().find((record) => record.videoId === videoId && record.tenantId === tenantId,
    );
  }

  public async get(
    videoId: string,
    tenantId?: string,
  ): Promise<VideoMetadataRecord | undefined> {
    return tenantId ? this.getSync(videoId, tenantId) : undefined;
  }

  public async listForTenant(tenantId: string): Promise<VideoMetadataRecord[]> {
    if (!tenantId) return [];
    return (await this.readAll()).filter((record) => record.tenantId === tenantId,
    );
  }
}
