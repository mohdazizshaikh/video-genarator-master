import fs from "fs-extra";
import path from "path";

export interface CustomNewsSourceRecord {
  id: string;
  name: string;
  url: string;
  category: string;
  subCategory?: string;
  kind: "rss";
  createdAt: string;
  /** Workspace owner; legacy records without this field are hidden from scoped reads. */
  tenantId?: string;
}

export class CustomNewsSourceStore {
  private storePath: string;

  constructor(basePath: string) {
    this.storePath = path.join(basePath, "customNewsSources.json");
    fs.ensureFileSync(this.storePath);
    if (!fs.readFileSync(this.storePath, "utf-8").trim()) {
      fs.writeFileSync(this.storePath, "[]", "utf-8");
    }
  }

  private readAllSync(): CustomNewsSourceRecord[] {
    const content = fs.readFileSync(this.storePath, "utf-8");
    if (!content.trim()) return [];
    try {
      return JSON.parse(content) as CustomNewsSourceRecord[];
    } catch {
      fs.writeFileSync(this.storePath, "[]", "utf-8");
      return [];
    }
  }

  private writeAllSync(records: CustomNewsSourceRecord[]): void {
    fs.writeFileSync(this.storePath, JSON.stringify(records, null, 2), "utf-8");
  }

  private normalizeComparableUrl(url: string): string {
    try {
      const parsed = new URL(url.trim());
      parsed.hash = "";
      if ((parsed.protocol === "http:" && parsed.port === "80") || (parsed.protocol === "https:" && parsed.port === "443")) {
        parsed.port = "";
      }
      return parsed.toString().replace(/\/+$/, "").toLowerCase();
    } catch {
      return url.trim().replace(/\/+$/, "").toLowerCase();
    }
  }

  public listSync(tenantId?: string): CustomNewsSourceRecord[] {
    const records = this.readAllSync();
    return tenantId ? records.filter((record) => record.tenantId === tenantId) : records;
  }

  public async list(tenantId?: string): Promise<CustomNewsSourceRecord[]> {
    return this.listSync(tenantId);
  }

  public async add(input: {
    name: string;
    url: string;
    category: string;
    subCategory?: string;
    tenantId?: string;
  }): Promise<CustomNewsSourceRecord> {
    const records = this.readAllSync();
    const normalizedUrl = this.normalizeComparableUrl(input.url);
    const duplicate = records.find((record) => this.normalizeComparableUrl(record.url) === normalizedUrl);
    if (duplicate) {
      throw new Error(`Source already exists: ${duplicate.name}`);
    }

    const slug = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "source";
    const id = `custom_${slug}_${Date.now().toString(36)}`;
    const record: CustomNewsSourceRecord = {
      id,
      name: input.name.trim(),
      url: input.url.trim(),
      category: input.category.trim(),
      subCategory: input.subCategory?.trim() || undefined,
      kind: "rss",
      createdAt: new Date().toISOString(),
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
    };
    records.push(record);
    this.writeAllSync(records);
    return record;
  }
}
