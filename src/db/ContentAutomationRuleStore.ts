import fs from "fs-extra";
import path from "path";

export type AutomationVideoType = "short" | "long";

export interface ContentAutomationRule {
  id: string;
  tenantId: string;
  name: string;
  sourceIds: string[];
  category: string;
  niche: string;
  platform: string;
  tone: string;
  videoType: AutomationVideoType;
  enabled: boolean;
  maxDraftsPerTick: number;
  createdAt: string;
  updatedAt: string;
}

export class ContentAutomationRuleStore {
  private readonly storePath: string;

  constructor(basePath: string) {
    this.storePath = path.join(basePath, "contentAutomationRules.json");
    fs.ensureFileSync(this.storePath);
    if (!fs.readFileSync(this.storePath, "utf-8").trim()) fs.writeFileSync(this.storePath, "[]", "utf-8");
  }

  private readAllSync(): ContentAutomationRule[] {
    try {
      const content = fs.readFileSync(this.storePath, "utf-8");
      return content.trim() ? JSON.parse(content) as ContentAutomationRule[] : [];
    } catch {
      return [];
    }
  }

  private writeAllSync(records: ContentAutomationRule[]): void {
    fs.writeFileSync(this.storePath, JSON.stringify(records, null, 2), "utf-8");
  }

  listForTenant(tenantId: string): ContentAutomationRule[] {
    if (!tenantId.trim()) return [];
    return this.readAllSync().filter((rule) => rule.tenantId === tenantId);
  }

  listEnabled(): ContentAutomationRule[] {
    return this.readAllSync().filter((rule) => rule.enabled && Boolean(rule.tenantId));
  }

  create(input: Omit<ContentAutomationRule, "id" | "createdAt" | "updatedAt">): ContentAutomationRule {
    if (!input.tenantId.trim()) throw new Error("tenantId is required");
    if (!input.name.trim()) throw new Error("name is required");
    if (!input.sourceIds.length) throw new Error("At least one sourceId is required");
    const now = new Date().toISOString();
    const record: ContentAutomationRule = {
      ...input,
      id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sourceIds: Array.from(new Set(input.sourceIds.filter(Boolean))),
      maxDraftsPerTick: Math.max(1, Math.min(10, Math.floor(input.maxDraftsPerTick || 1))),
      createdAt: now,
      updatedAt: now,
    };
    const records = this.readAllSync();
    records.push(record);
    this.writeAllSync(records);
    return record;
  }

  setEnabled(tenantId: string, id: string, enabled: boolean): ContentAutomationRule | undefined {
    const records = this.readAllSync();
    const record = records.find((candidate) => candidate.id === id && candidate.tenantId === tenantId);
    if (!record) return undefined;
    record.enabled = enabled;
    record.updatedAt = new Date().toISOString();
    this.writeAllSync(records);
    return record;
  }
}
