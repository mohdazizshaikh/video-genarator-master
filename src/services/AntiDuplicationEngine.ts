import crypto from "crypto";
import fs from "fs-extra";
import path from "path";
export interface ContentFingerprint { hash: string; title: string; category: string; keywords: string[]; createdAt: string; tenantId?: string; }
export interface DuplicationCheckResult { isDuplicate: boolean; similarity: number; matchedTitle?: string; matchedAt?: string; }
export class AntiDuplicationEngine {
  private fpPath: string;
  private fingerprints: ContentFingerprint[] = [];
  private readonly SIMILARITY_THRESHOLD = 0.70;
  constructor(dataDirPath: string) { this.fpPath = path.join(dataDirPath, "content-fingerprints.json"); this.load(); }
  private load() { try { if (fs.existsSync(this.fpPath)) this.fingerprints = fs.readJsonSync(this.fpPath); } catch { this.fingerprints = []; } }
  private save() { try { fs.writeJsonSync(this.fpPath, this.fingerprints, { spaces: 2 }); } catch { /* ignore */ } }
  private hashText(text: string): string { return crypto.createHash("sha256").update(text.toLowerCase().trim()).digest("hex").substring(0, 16); }
  private cosineSimilarity(a: string[], b: string[]): number { const setA = new Set(a); const setB = new Set(b); const intersection = [...setA].filter((x) => setB.has(x)).length; const union = new Set([...a, ...b]).size; return union === 0 ? 0 : intersection / union; }
  private normalizeTitle(title: string): string { return title.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim(); }
  check(title: string, keywords: string[], category: string, tenantId?: string): DuplicationCheckResult {
    const normalized = this.normalizeTitle(title);
    const hash = this.hashText(normalized);
    const scoped = this.fingerprints.filter((fp) => fp.category === category && (tenantId ? fp.tenantId === tenantId : !fp.tenantId));
    for (const fp of scoped) {
      if (fp.hash === hash) return { isDuplicate: true, similarity: 1, matchedTitle: fp.title, matchedAt: fp.createdAt };
      const sim = this.cosineSimilarity(keywords, fp.keywords);
      if (sim >= this.SIMILARITY_THRESHOLD) return { isDuplicate: true, similarity: sim, matchedTitle: fp.title, matchedAt: fp.createdAt };
    }
    return { isDuplicate: false, similarity: 0 };
  }
  register(title: string, keywords: string[], category: string, tenantId?: string): ContentFingerprint {
    const normalized = this.normalizeTitle(title);
    const fp: ContentFingerprint = { hash: this.hashText(normalized), title, category, keywords, createdAt: new Date().toISOString(), ...(tenantId ? { tenantId } : {}) };
    this.fingerprints.push(fp);
    if (this.fingerprints.length > 10000) this.fingerprints = this.fingerprints.slice(-8000);
    this.save();
    return fp;
  }
  getStats(tenantId?: string): { total: number; byCategory: Record<string, number> } {
    const scoped = tenantId ? this.fingerprints.filter((fp) => fp.tenantId === tenantId) : this.fingerprints.filter((fp) => !fp.tenantId);
    const byCategory: Record<string, number> = {};
    for (const fp of scoped) byCategory[fp.category] = (byCategory[fp.category] || 0) + 1;
    return { total: scoped.length, byCategory };
  }
}
