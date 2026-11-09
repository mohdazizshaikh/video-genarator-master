import crypto from "node:crypto";
import fs from "fs-extra";
import path from "node:path";
import type { PlatformType } from "../types/shorts";

export interface PublishBinding {
  tenantId: string;
  targetId: string;
  releaseId: string;
  connectorId: string;
  destinationId: string;
  platform: PlatformType;
  contentDigest: string;
}
export interface PublishReceipt { externalId: string; publishedUrl?: string }
export interface PublishExecution extends PublishBinding {
  id: string;
  publishJobId: string;
  requestId: string;
  attempt: number;
  state: "prepared" | "dispatching" | "accepted" | "rejected" | "reconciling";
  receipt?: PublishReceipt;
  errorCode?: string;
  observation?: { evidenceReference: string; recordedBy: string; recordedAt: string };
  createdAt: string;
  updatedAt: string;
}

/** File-mode checkpoints: synchronized within one Node process. Cross-process
 * claims and event/outbox transactions require the durable repository phase. */
export class PublishExecutionStore {
  private file: string;
  constructor(directory: string) { this.file = path.join(directory, "publish-executions.json"); }
  private read(): PublishExecution[] {
    const value: unknown = fs.existsSync(this.file) ? fs.readJsonSync(this.file) : [];
    if (!Array.isArray(value) || value.some((row) => !row || typeof row.tenantId !== "string" || !row.tenantId || typeof row.targetId !== "string" || !row.targetId || typeof row.requestId !== "string" || !row.requestId || !["id", "releaseId", "connectorId", "destinationId", "platform", "contentDigest", "publishJobId"].every((key) => typeof row[key] === "string" && row[key].trim()) || !Number.isInteger(row.attempt) || row.attempt < 1 || (row.state === "accepted" && (typeof row.receipt?.externalId !== "string" || !row.receipt.externalId.trim())) || !["prepared", "dispatching", "accepted", "rejected", "reconciling"].includes(row.state))) throw new Error("Invalid publish execution store; reconcile before writing");
    return value as PublishExecution[];
  }
  private write(rows: PublishExecution[]) {
    fs.ensureDirSync(path.dirname(this.file));
    const temporary = `${this.file}.${crypto.randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, JSON.stringify(rows, null, 2), { flag: "wx", mode: 0o600 });
      fs.renameSync(temporary, this.file);
    } finally { fs.removeSync(temporary); }
  }
  get(tenantId: string, targetId: string): PublishExecution | undefined {
    if (!tenantId || !targetId) return undefined;
    return this.read().filter((row) => row.tenantId === tenantId && row.targetId === targetId).at(-1);
  }
  list(tenantId: string, targetId: string): PublishExecution[] {
    if (!tenantId || !targetId) return [];
    return this.read().filter((row) => row.tenantId === tenantId && row.targetId === targetId);
  }
  assertBinding(execution: PublishExecution, binding: PublishBinding) {
    for (const key of ["tenantId", "targetId", "releaseId", "connectorId", "destinationId", "platform", "contentDigest"] as const) {
      if (execution[key] !== binding[key]) throw new Error("Publish execution identity mismatch");
    }
  }
  prepare(binding: PublishBinding, publishJobId: string): PublishExecution {
    if (Object.values(binding).some((value) => typeof value !== "string" || !value.trim()) || !publishJobId) throw new Error("Publish execution identity is required");
    const rows = this.read();
    const history = rows.filter((row) => row.tenantId === binding.tenantId && row.targetId === binding.targetId);
    const prior = history.at(-1);
    if (prior) { this.assertBinding(prior, binding); if (prior.state !== "rejected") return prior; }
    const now = new Date().toISOString();
    const execution: PublishExecution = { ...binding, id: `publish_execution_${crypto.randomUUID()}`, requestId: crypto.randomUUID(), publishJobId, attempt: history.length + 1, state: "prepared", createdAt: now, updatedAt: now };
    rows.push(execution); this.write(rows); return execution;
  }
  dispatch(execution: PublishExecution): PublishExecution {
    return this.update(execution, (row) => {
      if (row.state !== "prepared") throw new Error("Publish request has already started");
      return { ...row, state: "dispatching" };
    });
  }
  accept(execution: PublishExecution, receipt: PublishReceipt): PublishExecution {
    return this.update(execution, (row) => {
      if (!["dispatching", "reconciling"].includes(row.state)) throw new Error("Publish receipt does not match an active dispatch");
      return { ...row, receipt, state: "accepted", errorCode: undefined };
    });
  }
  confirmObserved(execution: PublishExecution, receipt: PublishReceipt, evidenceReference: string, recordedBy: string): PublishExecution {
    if (!recordedBy.trim() || evidenceReference.trim().length < 10 || evidenceReference.length > 500 || Array.from(evidenceReference).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) throw new Error("A bounded provider evidence reference and operator identity are required");
    if (!receipt.externalId || receipt.externalId.length > 500 || /\s/.test(receipt.externalId) || ["null", "undefined"].includes(receipt.externalId)) throw new Error("A canonical provider publication ID is required");
    return this.update(execution, (row) => {
      if (row.state === "accepted" && row.receipt?.externalId === receipt.externalId && row.observation?.evidenceReference === evidenceReference && row.observation?.recordedBy === recordedBy) return row;
      if (row.state !== "reconciling") throw new Error("Only a held publication can be resolved; refresh its latest request state");
      return { ...row, receipt, state: "accepted", errorCode: undefined, observation: { evidenceReference, recordedBy, recordedAt: new Date().toISOString() } };
    });
  }
  reject(execution: PublishExecution, errorCode: string): PublishExecution {
    return this.update(execution, (row) => {
      if (row.state !== "dispatching") throw new Error("Publish rejection does not match an active dispatch");
      return { ...row, state: "rejected", errorCode };
    });
  }
  reconcile(execution: PublishExecution): PublishExecution {
    return this.update(execution, (row) => row.state === "accepted" ? row : { ...row, state: "reconciling", errorCode: "publication_outcome_unknown" });
  }
  private update(execution: PublishExecution, change: (row: PublishExecution) => PublishExecution): PublishExecution {
    const rows = this.read();
    const index = rows.findIndex((row) => row.tenantId === execution.tenantId && row.targetId === execution.targetId && row.id === execution.id && row.requestId === execution.requestId);
    if (index < 0 || rows.filter((row) => row.tenantId === execution.tenantId && row.targetId === execution.targetId).at(-1)?.id !== execution.id) throw new Error("Stale publish execution");
    rows[index] = { ...change(rows[index]), updatedAt: new Date().toISOString() };
    this.write(rows); return rows[index];
  }
}
