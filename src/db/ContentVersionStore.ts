import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type ContentVersionStatus =
  | "draft" | "rendering" | "ready" | "failed" | "archived";

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
    fs.mkdirSync(dataDirPath, { recursive: true });
    try { fs.writeFileSync(this.filePath, '{"versions":[]}', { flag: "wx", mode: 0o600 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  }

  private read(): ContentVersionFile {
    let parsed: unknown;
    try { parsed = JSON.parse(fs.readFileSync(this.filePath, "utf8")); }
    catch { throw new Error("Invalid content version store; reconciliation is required"); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !Array.isArray((parsed as ContentVersionFile).versions))
      throw new Error("Invalid content version store; reconciliation is required");
    const file = parsed as ContentVersionFile, identities = new Set<string>();
    for (const version of file.versions) {
      if (!version || typeof version !== "object" || Array.isArray(version) || typeof version.id !== "string" || !version.id.trim() ||
          typeof version.workspaceId !== "string" || !version.workspaceId.trim() || identities.has(version.id))
        throw new Error("Invalid content version identity; reconciliation is required");
      identities.add(version.id);
    }
    return file;
  }

  private assertEditable(workspaceId: string, id: string): void {
    const releaseFile = path.join(path.dirname(this.filePath), "releases.json");
    if (!fs.existsSync(releaseFile)) return;
    let releases: { releases: Array<{ workspaceId: string; contentVersionId: string; approvalStatus: string }> };
    try { releases = JSON.parse(fs.readFileSync(releaseFile, "utf8")); }
    catch { throw new Error("Invalid release store; content edits are blocked"); }
    if (!releases || !Array.isArray(releases.releases) || releases.releases.some((release) => !release ||
        typeof release.workspaceId !== "string" || !release.workspaceId.trim() || typeof release.contentVersionId !== "string" || !release.contentVersionId.trim() ||
        !["draft", "pending", "approved", "rejected"].includes(release.approvalStatus))) throw new Error("Invalid release store; content edits are blocked");
    if (
      releases.releases?.some(
        (release) =>
          release.workspaceId === workspaceId &&
          release.contentVersionId === id &&
          release.approvalStatus === "approved",
      )
    ) {
      throw new Error(
        "Approved content is immutable; create a new content version",
      );
    }
  }

  private write(file: ContentVersionFile): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(tempPath, `${JSON.stringify(file, null, 2)}\n`, { flag: "wx", mode: 0o600 });
      fs.renameSync(tempPath, this.filePath);
    } finally { fs.rmSync(tempPath, { force: true }); }
  }

  create(
    params: Omit<
      ContentVersionRecord,
      "id" | "createdAt" | "updatedAt" | "status"
    >,
  ): ContentVersionRecord {
    if (!params.workspaceId.trim()) throw new Error("workspaceId is required");
    if (!params.title.trim()) throw new Error("title is required");
    if (!params.script.trim()) throw new Error("script is required");
    if (!params.contentSignature.trim())
      throw new Error("contentSignature is required");
    const file = this.read();
    const duplicate = file.versions.find(
      (version) =>
        version.workspaceId === params.workspaceId &&
        version.contentSignature === params.contentSignature &&
        version.status !== "archived",
    );
    if (duplicate) throw new Error("Duplicate content signature for workspace");
    const now = new Date().toISOString();
    const version: ContentVersionRecord = {
      ...params,
      id: `content-${randomUUID()}`,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    file.versions.push(version);
    this.write(file);
    return version;
  }

  getForWorkspace(
    workspaceId: string,
    id: string,
  ): ContentVersionRecord | undefined {
    return this.read().versions.find(
      (version) => version.workspaceId === workspaceId && version.id === id,
    );
  }

  listForWorkspace(workspaceId: string): ContentVersionRecord[] {
    return this.read().versions.filter(
      (version) => version.workspaceId === workspaceId,
    );
  }

  updateDraft(
    workspaceId: string,
    id: string,
    updates: Pick<
      ContentVersionRecord,
      | "title"
      | "script"
      | "scenes"
      | "metadata"
      | "sourceUrls"
      | "contentSignature"
    >,
  ): ContentVersionRecord | undefined {
    const file = this.read();
    const version = file.versions.find(
      (candidate) =>
        candidate.workspaceId === workspaceId && candidate.id === id,
    );
    if (!version) return undefined;
    this.assertEditable(workspaceId, id);
    const duplicate = file.versions.find(
      (candidate) =>
        candidate.workspaceId === workspaceId &&
        candidate.id !== id &&
        candidate.contentSignature === updates.contentSignature &&
        candidate.status !== "archived",
    );
    if (duplicate) throw new Error("Duplicate content signature for workspace");
    const { title, script, scenes, metadata, sourceUrls, contentSignature } = updates;
    Object.assign(version, { title, script, scenes, metadata, sourceUrls, contentSignature, updatedAt: new Date().toISOString() });
    this.write(file);
    return version;
  }

  updateRender(
    workspaceId: string,
    id: string,
    updates: Pick<
      ContentVersionRecord,
      "status" | "renderOutputPath" | "renderError"
    >,
  ): ContentVersionRecord | undefined {
    const file = this.read();
    const version = file.versions.find(
      (candidate) =>
        candidate.workspaceId === workspaceId && candidate.id === id,
    );
    if (!version) return undefined;
    this.assertEditable(workspaceId, id);
    const { status, renderOutputPath, renderError } = updates;
    if (!["draft", "rendering", "ready", "failed", "archived"].includes(status)) throw new Error("Invalid content version status");
    Object.assign(version, { status, renderOutputPath, renderError, updatedAt: new Date().toISOString() });
    this.write(file);
    return version;
  }
}
