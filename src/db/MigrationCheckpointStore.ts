import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface MigrationCheckpoint {
  name: string;
  checksum: string;
  appliedAt: string;
}

export class MigrationCheckpointStore {
  private readonly filePath: string;
  private checkpoints: MigrationCheckpoint[] = [];

  constructor(dataDirPath: string) {
    this.filePath = path.join(dataDirPath, "migration-checkpoints.json");
    this.load();
  }

  list(): MigrationCheckpoint[] {
    return this.checkpoints.map((checkpoint) => ({ ...checkpoint }));
  }

  get(name: string): MigrationCheckpoint | undefined {
    const checkpoint = this.checkpoints.find((entry) => entry.name === name);
    return checkpoint ? { ...checkpoint } : undefined;
  }

  verify(name: string, sql: string): { status: "pending" | "applied" | "drift"; checksum: string; checkpoint?: MigrationCheckpoint } {
    const checksum = MigrationCheckpointStore.checksum(sql);
    const checkpoint = this.get(name);
    if (!checkpoint) return { status: "pending", checksum };
    return checkpoint.checksum === checksum
      ? { status: "applied", checksum, checkpoint }
      : { status: "drift", checksum, checkpoint };
  }

  recordApplied(name: string, sql: string, appliedAt = new Date().toISOString()): MigrationCheckpoint {
    const checksum = MigrationCheckpointStore.checksum(sql);
    const existing = this.get(name);
    if (existing && existing.checksum !== checksum) {
      throw new Error(`Migration checksum drift detected for ${name}`);
    }
    if (existing) return existing;
    const checkpoint: MigrationCheckpoint = { name, checksum, appliedAt };
    this.checkpoints.push(checkpoint);
    this.persist();
    return { ...checkpoint };
  }

  private load(): void {
    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        this.checkpoints = parsed.filter((entry): entry is MigrationCheckpoint =>
          Boolean(entry && typeof entry === "object" && typeof (entry as MigrationCheckpoint).name === "string" && typeof (entry as MigrationCheckpoint).checksum === "string" && typeof (entry as MigrationCheckpoint).appliedAt === "string"),
        );
      }
    } catch {
      this.checkpoints = [];
    }
  }

  private persist(): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tempPath = `${this.filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(this.checkpoints, null, 2) + "\n", "utf8");
    fs.renameSync(tempPath, this.filePath);
  }

  static checksum(sql: string): string {
    return crypto.createHash("sha256").update(sql, "utf8").digest("hex");
  }
}

export default MigrationCheckpointStore;
