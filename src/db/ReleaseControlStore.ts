import crypto from "node:crypto";
import path from "node:path";
import fs from "fs-extra";

export type ReleaseState = "draft" | "approved" | "released" | "blocked";
export interface ReleaseRecord { id: string; tenantId: string; artifactId: string; state: ReleaseState; reason?: string; updatedAt: string; }

const transitions: Record<ReleaseState, ReleaseState[]> = { draft: ["approved", "blocked"], approved: ["released", "blocked", "draft"], released: ["blocked"], blocked: ["draft"] };
function tenant(tenantId: string): string { if (typeof tenantId !== "string" || tenantId.trim() === "") throw new Error("tenantId is required"); return tenantId.trim(); }

export class ReleaseControlStore {
  private readonly filePath: string;
  private records: ReleaseRecord[] = [];
  private loaded = false;
  constructor(dataDirPath: string) { this.filePath = path.join(dataDirPath, "release-control.json"); }
  private load(): void { if (this.loaded) return; this.loaded = true; const raw = fs.readJsonSync(this.filePath, { throws: false }); if (Array.isArray(raw)) this.records = raw.filter((r) => r && typeof r.id === "string" && typeof r.tenantId === "string" && r.tenantId.trim() !== "") as ReleaseRecord[]; }
  private persist(): void { fs.ensureDirSync(path.dirname(this.filePath)); const tmp = `${this.filePath}.tmp`; fs.writeJsonSync(tmp, this.records, { spaces: 2 }); fs.moveSync(tmp, this.filePath, { overwrite: true }); }
  create(input: { tenantId: string; artifactId: string }): ReleaseRecord { this.load(); const tenantId = tenant(input.tenantId); if (!input.artifactId) throw new Error("artifactId is required"); const now = new Date().toISOString(); const record: ReleaseRecord = { id: `release_${crypto.randomUUID()}`, tenantId, artifactId: input.artifactId, state: "draft", updatedAt: now }; this.records.push(record); this.persist(); return record; }
  getForTenant(tenantId: string, id: string): ReleaseRecord | null { this.load(); const owner = tenant(tenantId); return this.records.find((r) => r.tenantId === owner && r.id === id) || null; }
  listForTenant(tenantId: string): ReleaseRecord[] { this.load(); const owner = tenant(tenantId); return this.records.filter((r) => r.tenantId === owner); }
  transitionForTenant(tenantId: string, id: string, next: ReleaseState, reason?: string): ReleaseRecord { this.load(); const record = this.getForTenant(tenantId, id); if (!record) throw new Error("release not found"); if (!transitions[record.state].includes(next)) throw new Error(`invalid release transition: ${record.state} -> ${next}`); record.state = next; record.reason = reason; record.updatedAt = new Date().toISOString(); this.persist(); return record; }
}
