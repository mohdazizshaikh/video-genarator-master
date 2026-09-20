/**
 * Workspace-owned connector metadata store.
 *
 * This is the file-backed compatibility implementation of the target connector
 * contract. It stores only credential references and provider metadata; secret
 * values never enter this store, API responses, queue payloads, or logs.
 * Legacy ProfileAccount records are not implicitly converted here. Migration
 * must create an explicit mapping with provenance and owner approval.
 */
import fs from "fs-extra";
import path from "path";
import crypto from "node:crypto";
import type {
  ConnectorPlatform,
  ConnectorStatus,
  DestinationStatus,
} from "../types/ownership.js";

export interface ConnectorRecord {
  id: string;
  workspaceId: string;
  platform: ConnectorPlatform;
  displayName: string;
  status: ConnectorStatus;
  credentialRef: string;
  externalAccountId?: string;
  capabilities: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectorDestinationRecord {
  id: string;
  workspaceId: string;
  connectorId: string;
  externalDestinationId: string;
  displayName: string;
  status: DestinationStatus;
  verificationEvidence: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

interface ConnectorFile {
  connectors: ConnectorRecord[];
  destinations: ConnectorDestinationRecord[];
}

export class ConnectorStore {
  private readonly filePath: string;

  constructor(dataDirPath: string) {
    this.filePath = path.join(dataDirPath, "connectors.json");
  }

  private read(): ConnectorFile {
    try {
      const value = fs.readJsonSync(this.filePath) as Partial<ConnectorFile>;
      return {
        connectors: Array.isArray(value.connectors) ? value.connectors : [],
        destinations: Array.isArray(value.destinations) ? value.destinations : [],
      };
    } catch {
      return { connectors: [], destinations: [] };
    }
  }

  private write(value: ConnectorFile): void {
    fs.ensureFileSync(this.filePath);
    fs.writeJsonSync(this.filePath, value, { spaces: 2 });
  }

  private id(prefix: string): string {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  private now(): string {
    return new Date().toISOString();
  }

  createConnector(params: Omit<ConnectorRecord, "id" | "createdAt" | "updatedAt">): ConnectorRecord {
    if (!params.workspaceId.trim()) throw new Error("workspaceId is required");
    if (!params.credentialRef.trim()) throw new Error("credentialRef is required");
    const file = this.read();
    const duplicate = file.connectors.find(
      (connector) =>
        connector.workspaceId === params.workspaceId &&
        connector.platform === params.platform &&
        connector.externalAccountId === params.externalAccountId,
    );
    if (duplicate) throw new Error("Connector already exists for this workspace and external account");
    const timestamp = this.now();
    const record: ConnectorRecord = { ...params, id: this.id("con"), createdAt: timestamp, updatedAt: timestamp };
    file.connectors.push(record);
    this.write(file);
    return record;
  }

  listConnectors(workspaceId: string): ConnectorRecord[] {
    return this.read().connectors.filter((connector) => connector.workspaceId === workspaceId);
  }

  getConnector(workspaceId: string, connectorId: string): ConnectorRecord | undefined {
    return this.read().connectors.find(
      (connector) => connector.workspaceId === workspaceId && connector.id === connectorId,
    );
  }

  updateConnector(workspaceId: string, connectorId: string, updates: Partial<Pick<ConnectorRecord, "displayName" | "status" | "capabilities" | "externalAccountId">>): ConnectorRecord | undefined {
    const file = this.read();
    const connector = file.connectors.find(
      (candidate) => candidate.workspaceId === workspaceId && candidate.id === connectorId,
    );
    if (!connector) return undefined;
    Object.assign(connector, updates, { updatedAt: this.now() });
    this.write(file);
    return connector;
  }

  createDestination(params: Omit<ConnectorDestinationRecord, "id" | "createdAt" | "updatedAt">): ConnectorDestinationRecord {
    const file = this.read();
    const connector = file.connectors.find(
      (candidate) => candidate.workspaceId === params.workspaceId && candidate.id === params.connectorId,
    );
    if (!connector) throw new Error("Connector not found for workspace");
    const duplicate = file.destinations.find(
      (destination) =>
        destination.workspaceId === params.workspaceId &&
        destination.connectorId === params.connectorId &&
        destination.externalDestinationId === params.externalDestinationId,
    );
    if (duplicate) throw new Error("Destination already exists for this connector");
    const timestamp = this.now();
    const record: ConnectorDestinationRecord = { ...params, id: this.id("dst"), createdAt: timestamp, updatedAt: timestamp };
    file.destinations.push(record);
    this.write(file);
    return record;
  }

  listDestinations(workspaceId: string, connectorId: string): ConnectorDestinationRecord[] {
    const file = this.read();
    if (!file.connectors.some((connector) => connector.workspaceId === workspaceId && connector.id === connectorId)) return [];
    return file.destinations.filter(
      (destination) => destination.workspaceId === workspaceId && destination.connectorId === connectorId,
    );
  }

  updateDestination(workspaceId: string, destinationId: string, updates: Partial<Pick<ConnectorDestinationRecord, "displayName" | "status" | "verificationEvidence">>): ConnectorDestinationRecord | undefined {
    const file = this.read();
    const destination = file.destinations.find(
      (candidate) => candidate.workspaceId === workspaceId && candidate.id === destinationId,
    );
    if (!destination) return undefined;
    Object.assign(destination, updates, { updatedAt: this.now() });
    this.write(file);
    return destination;
  }
}
