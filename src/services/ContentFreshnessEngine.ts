import { initializeJsonArray, readJsonArray, writeJsonArray } from "../db/jsonArrayFile";
import path from "path";
export interface FreshnessRecord {
  keyword: string;
  category: string;
  lastUsedAt: string;
  useCount: number;
}

export interface FreshnessCheckResult {
  allowed: boolean;
  reason?: string;
  waitMs?: number;
  similarUsedAt?: string;
}

const FRESHNESS_RULES = {
  sameKeywordGapHours: 24,
  sameCategoryGapHours: 4,
};

export class ContentFreshnessEngine {
  private recordsPath: string;
  private records: FreshnessRecord[] = [];

  constructor(dataDirPath: string) {
    this.recordsPath = path.join(dataDirPath, "freshness-records.json");
    initializeJsonArray(this.recordsPath);
  }

  private load() {
    const records = readJsonArray<FreshnessRecord>(this.recordsPath), seen = new Set<string>();
    for (const record of records) {
      const identity = JSON.stringify([record.keyword, record.category]);
      if (typeof record.keyword !== "string" || !record.keyword.trim() || record.keyword !== record.keyword.toLowerCase() ||
          typeof record.category !== "string" || !record.category.trim() || typeof record.lastUsedAt !== "string" ||
          !Number.isFinite(Date.parse(record.lastUsedAt)) || !Number.isSafeInteger(record.useCount) || record.useCount < 1 || seen.has(identity))
        throw new Error("Invalid freshness records; reconciliation is required");
      seen.add(identity);
    }
    this.records = records;
  }

  private save() { writeJsonArray(this.recordsPath, this.records); }

  check(keyword: string, category: string): FreshnessCheckResult {
    this.load();
    const now = Date.now();
    const kwLower = keyword.toLowerCase();

    const kwRecord = this.records.find((r) => r.keyword === kwLower && r.category === category);
    if (kwRecord) {
      const elapsed = now - new Date(kwRecord.lastUsedAt).getTime();
      const requiredMs = FRESHNESS_RULES.sameKeywordGapHours * 3600 * 1000;
      if (elapsed < requiredMs) {
        return {
          allowed: false,
          reason: `Keyword "${keyword}" used ${Math.round(elapsed / 60000)} min ago (need ${FRESHNESS_RULES.sameKeywordGapHours}h gap)`,
          waitMs: requiredMs - elapsed,
          similarUsedAt: kwRecord.lastUsedAt,
        };
      }
    }

    const catRecords = this.records.filter((r) => r.category === category);
    const recentCat = catRecords.filter((r) => {
      const elapsed = now - new Date(r.lastUsedAt).getTime();
      return elapsed < FRESHNESS_RULES.sameCategoryGapHours * 3600 * 1000;
    });

    if (recentCat.length >= 3) {
      const oldest = recentCat.sort((a, b) => new Date(a.lastUsedAt).getTime() - new Date(b.lastUsedAt).getTime())[0];
      const elapsed = now - new Date(oldest.lastUsedAt).getTime();
      const requiredMs = FRESHNESS_RULES.sameCategoryGapHours * 3600 * 1000;
      return {
        allowed: false,
        reason: `Category "${category}" has ${recentCat.length} recent posts. Need ${FRESHNESS_RULES.sameCategoryGapHours}h gap.`,
        waitMs: requiredMs - elapsed,
      };
    }

    return { allowed: true };
  }

  record(keyword: string, category: string) {
    if (!keyword?.trim() || !category?.trim()) throw new Error("Freshness keyword and category are required");
    this.load();
    const kwLower = keyword.toLowerCase();
    const existing = this.records.find((r) => r.keyword === kwLower && r.category === category);
    if (existing) {
      existing.lastUsedAt = new Date().toISOString();
      if (!Number.isSafeInteger(existing.useCount + 1)) throw new Error("Freshness count overflow");
      existing.useCount++;
    } else {
      this.records.push({ keyword: kwLower, category, lastUsedAt: new Date().toISOString(), useCount: 1 });
    }
    if (this.records.length > 5000) this.records = this.records.slice(-4000);
    this.save();
  }

  getRecentByCategory(category: string, hours = 24): FreshnessRecord[] {
    this.load();
    const since = Date.now() - hours * 3600 * 1000;
    return this.records.filter((r) => r.category === category && new Date(r.lastUsedAt).getTime() > since);
  }
}
