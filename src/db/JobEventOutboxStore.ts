import crypto from "node:crypto";
import path from "node:path";
import fs from "fs-extra";

export type OutboxState = "pending" | "delivered" | "dead_letter";

export interface OutboxEvent {
  id: string;
  tenantId: string;
  eventId: string;
  state: OutboxState;
  attempts: number;
  availableAt: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

function ownerOf(tenantId: string): string {
  if (typeof tenantId !== "string" || tenantId.trim() === "") {
    throw new Error("tenantId is required");
  }
  return tenantId.trim();
}

export class JobEventOutboxStore {
  private readonly filePath: string;
  private rows: OutboxEvent[] = [];
  private loaded = false;

  constructor(dataDirPath: string) {
    this.filePath = path.join(dataDirPath, "job-event-outbox.json");
  }

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    const raw = fs.readJsonSync(this.filePath, { throws: false });
    if (Array.isArray(raw)) {
      this.rows = raw.filter((row) =>
        row && typeof row.id === "string" && typeof row.tenantId === "string" &&
        row.tenantId.trim() !== "" && typeof row.eventId === "string" &&
        ["pending", "delivered", "dead_letter"].includes(row.state),
      ) as OutboxEvent[];
    }
  }

  private persist(): void {
    fs.ensureDirSync(path.dirname(this.filePath));
    const temp = `${this.filePath}.${crypto.randomUUID()}.tmp`;
    fs.writeJsonSync(temp, this.rows, { spaces: 2 });
    fs.moveSync(temp, this.filePath, { overwrite: true });
  }

  enqueue(input: { tenantId: string; eventId: string; availableAt?: string }): OutboxEvent {
    this.load();
    const tenantId = ownerOf(input.tenantId);
    if (!input.eventId) throw new Error("eventId is required");
    const existing = this.rows.find((row) => row.tenantId === tenantId && row.eventId === input.eventId);
    if (existing) return existing;
    const now = new Date().toISOString();
    const row: OutboxEvent = {
      id: `outbox_${crypto.randomUUID()}`,
      tenantId,
      eventId: input.eventId,
      state: "pending",
      attempts: 0,
      availableAt: input.availableAt ?? now,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push(row);
    this.persist();
    return row;
  }

  listPending(tenantId: string, now = new Date().toISOString(), limit = 100): OutboxEvent[] {
    const owner = ownerOf(tenantId);
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error("limit must be between 1 and 1000");
    this.load();
    return this.rows
      .filter((row) => row.tenantId === owner && row.state === "pending" && row.availableAt <= now)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, limit);
  }

  markDelivered(tenantId: string, outboxId: string): OutboxEvent | null {
    return this.transition(tenantId, outboxId, "delivered");
  }

  retry(tenantId: string, outboxId: string, error: string, availableAt: string, maxAttempts = 5): OutboxEvent | null {
    const owner = ownerOf(tenantId);
    if (!error || !availableAt) throw new Error("error and availableAt are required");
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) throw new Error("maxAttempts must be positive");
    this.load();
    const row = this.rows.find((candidate) => candidate.tenantId === owner && candidate.id === outboxId);
    if (!row) return null;
    row.attempts += 1;
    row.lastError = error;
    row.state = row.attempts >= maxAttempts ? "dead_letter" : "pending";
    row.availableAt = availableAt;
    row.updatedAt = new Date().toISOString();
    this.persist();
    return row;
  }

  requeue(tenantId: string, outboxId: string, availableAt = new Date().toISOString()): OutboxEvent | null {
    const owner = ownerOf(tenantId);
    this.load();
    const row = this.rows.find((candidate) => candidate.tenantId === owner && candidate.id === outboxId);
    if (!row) return null;
    if (row.state !== "dead_letter") throw new Error("only dead-letter events can be requeued");
    row.state = "pending";
    row.availableAt = availableAt;
    row.updatedAt = new Date().toISOString();
    this.persist();
    return row;
  }

  listForTenant(tenantId: string, state?: OutboxState): OutboxEvent[] {
    const owner = ownerOf(tenantId);
    this.load();
    return this.rows.filter((row) => row.tenantId === owner && (!state || row.state === state));
  }

  private transition(tenantId: string, outboxId: string, state: OutboxState): OutboxEvent | null {
    const owner = ownerOf(tenantId);
    this.load();
    const row = this.rows.find((candidate) => candidate.tenantId === owner && candidate.id === outboxId);
    if (!row) return null;
    row.state = state;
    row.updatedAt = new Date().toISOString();
    this.persist();
    return row;
  }
}

export default JobEventOutboxStore;
