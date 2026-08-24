import crypto from "node:crypto";
import path from "node:path";
import fs from "fs-extra";

export interface JobEvent {
  id: string;
  tenantId: string;
  jobId: string;
  type: string;
  sequence: number;
  idempotencyKey: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

function tenant(tenantId: string): string {
  if (typeof tenantId !== "string" || tenantId.trim() === "") {
    throw new Error("tenantId is required");
  }
  return tenantId.trim();
}

export class JobEventStore {
  private readonly filePath: string;
  private events: JobEvent[] = [];
  private loaded = false;

  constructor(dataDirPath: string) {
    this.filePath = path.join(dataDirPath, "job-events.json");
  }

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    const raw = fs.readJsonSync(this.filePath, { throws: false });
    if (Array.isArray(raw)) {
      this.events = raw.filter((event) =>
        event && typeof event.id === "string" && typeof event.tenantId === "string" && event.tenantId.trim() !== "",
      ) as JobEvent[];
    }
  }

  private persist(): void {
    fs.ensureDirSync(path.dirname(this.filePath));
    const tempPath = `${this.filePath}.tmp`;
    fs.writeJsonSync(tempPath, this.events, { spaces: 2 });
    fs.moveSync(tempPath, this.filePath, { overwrite: true });
  }

  append(input: Omit<JobEvent, "id" | "sequence" | "createdAt">): JobEvent {
    this.load();
    const owner = tenant(input.tenantId);
    if (!input.jobId || !input.type || !input.idempotencyKey) {
      throw new Error("jobId, type, and idempotencyKey are required");
    }
    const existing = this.events.find(
      (event) => event.tenantId === owner && event.idempotencyKey === input.idempotencyKey,
    );
    if (existing) return existing;
    const prior = this.events.filter((event) => event.tenantId === owner && event.jobId === input.jobId);
    const event: JobEvent = {
      ...input,
      tenantId: owner,
      id: `event_${crypto.randomUUID()}`,
      sequence: prior.length + 1,
      createdAt: new Date().toISOString(),
    };
    this.events.push(event);
    this.persist();
    return event;
  }

  listForTenant(tenantId: string, jobId?: string): JobEvent[] {
    const owner = tenant(tenantId);
    this.load();
    return this.events
      .filter((event) => event.tenantId === owner && (!jobId || event.jobId === jobId))
      .sort((a, b) => a.sequence - b.sequence);
  }
}

export default JobEventStore;
