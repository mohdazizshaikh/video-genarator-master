import crypto from "node:crypto";
import path from "node:path";
import fs from "fs-extra";

export interface RenderExecution {
  id: string;
  tenantId: string;
  renderJobId: string;
  state: "claimed" | "rendering" | "completed" | "reconciling";
  videoId?: string;
  artifactId?: string;
  contentVersionId?: string;
  outputPath?: string;
  error?: string;
  deadlineAt: string;
  createdAt: string;
  updatedAt: string;
}

/** File-mode execution binding. Atomic rename and synchronous mutations coordinate
 * instances in one process; a database claim is required for multiple processes. */
export class RenderExecutionStore {
  private file: string;
  constructor(directory: string) { this.file = path.join(directory, "render-executions.json"); }

  private read(): RenderExecution[] {
    const rows: unknown = fs.existsSync(this.file) ? fs.readJsonSync(this.file) : [];
    if (!Array.isArray(rows) || rows.some((row) => !row || typeof row.id !== "string" || typeof row.tenantId !== "string" || !row.tenantId.trim() || typeof row.renderJobId !== "string" || !row.renderJobId.trim() || !Number.isFinite(Date.parse(row.deadlineAt)) || !["claimed", "rendering", "completed", "reconciling"].includes(row.state))) throw new Error("Invalid render execution store; reconciliation is required");
    return rows as RenderExecution[];
  }

  private write(rows: RenderExecution[]) {
    fs.ensureDirSync(path.dirname(this.file));
    const temporary = `${this.file}.${crypto.randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, JSON.stringify(rows, null, 2), { flag: "wx", mode: 0o600 });
      fs.renameSync(temporary, this.file);
    } finally { fs.removeSync(temporary); }
  }

  get(tenantId: string, renderJobId: string): RenderExecution | undefined {
    if (!tenantId || !renderJobId) return undefined;
    return this.read().find((row) => row.tenantId === tenantId && row.renderJobId === renderJobId);
  }

  claim(tenantId: string, renderJobId: string, timeoutMs: number): { execution: RenderExecution; created: boolean } {
    if (!tenantId?.trim() || !renderJobId?.trim() || !Number.isFinite(timeoutMs) || timeoutMs < 1) throw new Error("Invalid render execution claim");
    const rows = this.read();
    const existing = rows.find((row) => row.tenantId === tenantId && row.renderJobId === renderJobId);
    if (existing) return { execution: existing, created: false };
    const now = Date.now();
    const execution: RenderExecution = { id: `render_execution_${crypto.randomUUID()}`, tenantId, renderJobId, state: "claimed", deadlineAt: new Date(now + timeoutMs).toISOString(), createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() };
    rows.push(execution); this.write(rows);
    return { execution, created: true };
  }

  attachVideo(tenantId: string, renderJobId: string, executionId: string, videoId: string): RenderExecution {
    return this.update(tenantId, renderJobId, executionId, (row) => {
      if (row.state !== "claimed" || row.videoId || !/^[a-zA-Z0-9_-]+$/.test(videoId)) throw new Error("Render execution cannot be rebound");
      return { ...row, videoId, state: "rendering" };
    });
  }

  complete(tenantId: string, renderJobId: string, executionId: string, output: Required<Pick<RenderExecution, "videoId" | "artifactId" | "contentVersionId" | "outputPath">>): RenderExecution {
    return this.update(tenantId, renderJobId, executionId, (row) => {
      if (row.state === "completed" && row.videoId === output.videoId && row.artifactId === output.artifactId && row.contentVersionId === output.contentVersionId && row.outputPath === output.outputPath) return row;
      if (row.state !== "rendering" || row.videoId !== output.videoId) throw new Error("Render completion identity mismatch");
      return { ...row, ...output, state: "completed", error: undefined };
    });
  }

  reconcile(tenantId: string, renderJobId: string, executionId: string, error: string): RenderExecution {
    return this.update(tenantId, renderJobId, executionId, (row) => ({ ...row, state: "reconciling", error }));
  }

  private update(tenantId: string, renderJobId: string, executionId: string, change: (row: RenderExecution) => RenderExecution): RenderExecution {
    const rows = this.read();
    const index = rows.findIndex((row) => row.tenantId === tenantId && row.renderJobId === renderJobId && row.id === executionId);
    if (index < 0) throw new Error("Render execution not found for workspace");
    rows[index] = { ...change(rows[index]), updatedAt: new Date().toISOString() };
    this.write(rows); return rows[index];
  }
}
