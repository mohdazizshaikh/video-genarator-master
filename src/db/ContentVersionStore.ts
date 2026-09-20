import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type ContentVersionStatus = "draft" | "rendering" | "ready" | "failed" | "archived";

export interface ContentVersionRecord {
  id: string;
  workspaceId: string;
  title: string;
  script: string;
  scenes: unknown[];
  metadata: Record<string, unknown>;
  sourceUrls: string[];
  contentSignature: string;
  status: ContentVersionStatus;
  renderOutputPath?: string;
  renderError?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

type ContentVersionFile = { versions: ContentVersionRecord[] };

export class ContentVersionStore {
  private readonly filePath: string;

  constructor(dataDirPath: string) {
    this.filePath = path.join(dataDirPath, "content-versions.json");
  }

  private read(): ContentVersionFile {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, "utf8")) as Partial<ContentVersionFile>;
      return { versions: Array.isArray(parsed.versions) ? parsed.versions : [] };
    } catch {
      return { versions: [] };
    }
  }

  private write(file: ContentVersionFile): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tempPath, `${JSON.stringify(file, null, 2)}\n`, { mode: 0o600 });
    fs.renameSync(tempPath, this.filePath);
  }

  create(params: Omit<ContentVersionRecord, "id" | "createdAt" | "updatedAt" | "status">): ContentVersionRecord {
    if (!params.workspaceId.trim()) throw new Error("workspaceId is required");
    if (!params.title.trim()) throw new Error("title is required");
    if (!params.script.trim()) throw new Error("script is required");
    if (!params.contentSignature.trim()) throw new Error("contentSignature is required");
    const file = this.read();
    const duplicate = file.versions.find((version) => version.workspaceId === params.workspaceId && version.contentSignature === params.contentSignature && version.status !== "archived");
    if (duplicate) throw new Error("Duplicate content signature for workspace");
    const now = new Date().toISOString();
    const version: ContentVersionRecord = { ...params, id: `content-${randomUUID()}`, status: "draft", createdAt: now, updatedAt: now };
    file.versions.push(version);
    this.write(file);
    return version;
  }

  getForWorkspace(workspaceId: string, id: string): ContentVersionRecord | undefined {
    return this.read().versions.find((version) => version.workspaceId === workspaceId && version.id === id);
  }

  listForWorkspace(workspaceId: string): ContentVersionRecord[] {
    return this.read().versions.filter((version) => version.workspaceId === workspaceId);
  }

  updateDraft(workspaceId: string, id: string, updates: Pick<ContentVersionRecord, "title" | "script" | "scenes" | "metadata" | "sourceUrls" | "contentSignature">): ContentVersionRecord | undefined {
    const file = this.read();
    const version = file.versions.find((candidate) => candidate.workspaceId === workspaceId && candidate.id === id);
    if (!version) return undefined;
    const duplicate = file.versions.find((candidate) => candidate.workspaceId === workspaceId && candidate.id !== id && candidate.contentSignature === updates.contentSignature && candidate.status !== "archived");
    if (duplicate) throw new Error("Duplicate content signature for workspace");
    Object.assign(version, updates, { updatedAt: new Date().toISOString() });
    this.write(file);
    return version;
  }

  updateRender(workspaceId: string, id: string, updates: Pick<ContentVersionRecord, "status" | "renderOutputPath" | "renderError">): ContentVersionRecord | undefined {
    const file = this.read();
    const version = file.versions.find((candidate) => candidate.workspaceId === workspaceId && candidate.id === id);
    if (!version) return undefined;
    Object.assign(version, updates, { updatedAt: new Date().toISOString() });
    this.write(file);
    return version;
  }
}
