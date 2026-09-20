/**
 * Encrypted connector secret storage.
 *
 * Metadata and secrets are deliberately separate. The secret file contains only
 * encrypted values keyed by workspace and connector identity. Callers must
 * provide the workspace scope for every read; plaintext is never serialized in
 * metadata responses, queue payloads, or logs.
 */
import fs from "fs-extra";
import path from "path";
import { CryptoService } from "../services/CryptoService";

interface SecretRecord {
  workspaceId: string;
  connectorId: string;
  encrypted: string;
  updatedAt: string;
}

export class ConnectorSecretStore {
  private readonly filePath: string;
  private readonly crypto: CryptoService;

  constructor(dataDirPath: string, encryptionSecret: string) {
    if (!encryptionSecret.trim()) throw new Error("Connector secret encryption key is required");
    this.filePath = path.join(dataDirPath, "connector-secrets.json");
    this.crypto = new CryptoService(encryptionSecret);
  }

  private read(): SecretRecord[] {
    try {
      const value = fs.readJsonSync(this.filePath);
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  private write(records: SecretRecord[]): void {
    fs.ensureFileSync(this.filePath);
    fs.writeJsonSync(this.filePath, records, { spaces: 2 });
  }

  put(workspaceId: string, connectorId: string, value: Record<string, string>): void {
    if (!workspaceId.trim() || !connectorId.trim()) throw new Error("workspaceId and connectorId are required");
    if (!value || Object.keys(value).length === 0 || Object.values(value).some((entry) => !entry.trim())) throw new Error("connector secret is required");
    const records = this.read().filter((record) => !(record.workspaceId === workspaceId && record.connectorId === connectorId));
    records.push({ workspaceId, connectorId, encrypted: this.crypto.encrypt(JSON.stringify(value)), updatedAt: new Date().toISOString() });
    this.write(records);
  }

  get(workspaceId: string, connectorId: string): Record<string, string> | undefined {
    const record = this.read().find((candidate) => candidate.workspaceId === workspaceId && candidate.connectorId === connectorId);
    if (!record) return undefined;
    return JSON.parse(this.crypto.decrypt(record.encrypted)) as Record<string, string>;
  }

  remove(workspaceId: string, connectorId: string): boolean {
    const records = this.read();
    const next = records.filter((record) => !(record.workspaceId === workspaceId && record.connectorId === connectorId));
    if (next.length === records.length) return false;
    this.write(next);
    return true;
  }
}
