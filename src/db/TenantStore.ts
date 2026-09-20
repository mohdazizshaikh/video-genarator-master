import fs from "fs-extra";
import path from "path";
import cuid from "cuid";

export type TenantTier = "free" | "pro" | "enterprise";

export interface TenantRecord {
  id: string;
  workspaceName: string;
  tier: TenantTier;
  description?: string;
  logoUrl?: string;
  apiKeys: Record<string, string>;
  encryptedApiKeys?: Record<string, string>;
  quotas?: {
    monthlyRenders?: number;
    monthlyPublishes?: number;
    maxStorageBytes?: number;
  };
  engineConfig: {
    youtube?: { enabled: boolean; channelId?: string };
    telegram?: { enabled: boolean; channelId?: string };
    instagram?: { enabled: boolean; channelId?: string };
    facebook?: { enabled: boolean; channelId?: string };
  };
  createdAt: string;
  updatedAt: string;
}

export class TenantStore {
  private storePath: string;

  constructor(basePath: string) {
    this.storePath = path.join(basePath, "tenants.json");
    fs.ensureFileSync(this.storePath);
    if (!fs.readFileSync(this.storePath, "utf-8").trim()) {
      fs.writeFileSync(this.storePath, "[]", "utf-8");
    }
  }

  private async readAll(): Promise<TenantRecord[]> {
    const content = await fs.readFile(this.storePath, "utf-8");
    if (!content.trim()) return [];
    try {
      return JSON.parse(content) as TenantRecord[];
    } catch {
      await fs.writeFile(this.storePath, "[]", "utf-8");
      return [];
    }
  }

  private async writeAll(records: TenantRecord[]): Promise<void> {
    await fs.writeFile(this.storePath, JSON.stringify(records, null, 2), "utf-8");
  }

  async create(params: {
    id?: string;
    workspaceName: string;
    tier: TenantTier;
    apiKeys?: Record<string, string>;
    encryptedApiKeys?: Record<string, string>;
    description?: string;
    logoUrl?: string;
  }): Promise<TenantRecord> {
    const current = await this.readAll();
    const now = new Date().toISOString();
    const tenant: TenantRecord = {
      id: params.id ?? cuid(),
      workspaceName: params.workspaceName,
      tier: params.tier,
      description: params.description,
      logoUrl: params.logoUrl,
      apiKeys: {},
      encryptedApiKeys: params.encryptedApiKeys ?? {},
      engineConfig: {},
      createdAt: now,
      updatedAt: now,
    };
    current.push(tenant);
    await this.writeAll(current);
    return tenant;
  }

  async list(): Promise<TenantRecord[]> {
    return await this.readAll();
  }

  async get(id: string): Promise<TenantRecord | undefined> {
    return (await this.readAll()).find((t) => t.id === id);
  }

  /** Return a tenant only when the requested resource belongs to the auth tenant. */
  async getForTenant(authTenantId: string, requestedTenantId: string): Promise<TenantRecord | undefined> {
    if (!authTenantId || authTenantId !== requestedTenantId) return undefined;
    return this.get(requestedTenantId);
  }

  async listForTenant(authTenantId: string): Promise<TenantRecord[]> {
    if (!authTenantId) return [];
    const tenant = await this.get(authTenantId);
    return tenant ? [tenant] : [];
  }

  async updateWorkspaceForTenant(
    authTenantId: string,
    requestedTenantId: string,
    updates: { workspaceName?: string; description?: string; logoUrl?: string },
  ): Promise<TenantRecord | undefined> {
    if (!authTenantId || authTenantId !== requestedTenantId) return undefined;
    const current = await this.readAll();
    const idx = current.findIndex((t) => t.id === requestedTenantId);
    if (idx < 0) return undefined;
    current[idx] = { ...current[idx], ...updates, updatedAt: new Date().toISOString() };
    await this.writeAll(current);
    return current[idx];
  }

  async updateKeysForTenant(authTenantId: string, requestedTenantId: string, apiKeys: Record<string, string>): Promise<TenantRecord | undefined> {
    if (!authTenantId || authTenantId !== requestedTenantId) return undefined;
    return this.updateKeys(requestedTenantId, apiKeys);
  }

  async updateKeys(id: string, apiKeys: Record<string, string>): Promise<TenantRecord | undefined> {
    const current = await this.readAll();
    const idx = current.findIndex((t) => t.id === id);
    if (idx < 0) return undefined;
    current[idx] = {
      ...current[idx],
      apiKeys: { ...current[idx].apiKeys, ...apiKeys },
      updatedAt: new Date().toISOString(),
    };
    await this.writeAll(current);
    return current[idx];
  }

  async updateEngineConfigForTenant(
    authTenantId: string,
    requestedTenantId: string,
    engineConfig: TenantRecord["engineConfig"],
  ): Promise<TenantRecord | undefined> {
    if (!authTenantId || authTenantId !== requestedTenantId) return undefined;
    return this.updateEngineConfig(requestedTenantId, engineConfig);
  }

  async updateEngineConfig(
    id: string,
    engineConfig: TenantRecord["engineConfig"],
  ): Promise<TenantRecord | undefined> {
    const current = await this.readAll();
    const idx = current.findIndex((t) => t.id === id);
    if (idx < 0) return undefined;
    current[idx] = {
      ...current[idx],
      engineConfig: {
        ...current[idx].engineConfig,
        ...engineConfig,
      },
      updatedAt: new Date().toISOString(),
    };
    await this.writeAll(current);
    return current[idx];
  }

  async updateEncryptedKeysForTenant(authTenantId: string, requestedTenantId: string, encryptedApiKeys: Record<string, string>): Promise<TenantRecord | undefined> {
    if (!authTenantId || authTenantId !== requestedTenantId) return undefined;
    return this.updateEncryptedKeys(requestedTenantId, encryptedApiKeys);
  }

  async deleteEncryptedKeyForTenant(authTenantId: string, requestedTenantId: string, keyId: string): Promise<TenantRecord | undefined> {
    if (!authTenantId || authTenantId !== requestedTenantId) return undefined;
    const current = await this.readAll();
    const idx = current.findIndex((t) => t.id === requestedTenantId);
    if (idx < 0) return undefined;
    const next = { ...(current[idx].encryptedApiKeys ?? {}) };
    delete next[keyId];
    current[idx] = { ...current[idx], encryptedApiKeys: next, updatedAt: new Date().toISOString() };
    await this.writeAll(current);
    return current[idx];
  }

  async updateEncryptedKeys(id: string, encryptedApiKeys: Record<string, string>): Promise<TenantRecord | undefined> {
    const current = await this.readAll();
    const idx = current.findIndex((t) => t.id === id);
    if (idx < 0) return undefined;
    current[idx] = {
      ...current[idx],
      encryptedApiKeys: {
        ...(current[idx].encryptedApiKeys ?? {}),
        ...encryptedApiKeys,
      },
      updatedAt: new Date().toISOString(),
    };
    await this.writeAll(current);
    return current[idx];
  }

  async updateQuotasForTenant(
    authTenantId: string,
    requestedTenantId: string,
    quotas: NonNullable<TenantRecord["quotas"]>,
  ): Promise<TenantRecord | undefined> {
    if (!authTenantId || authTenantId !== requestedTenantId) return undefined;
    return this.updateQuotas(requestedTenantId, quotas);
  }

  async updateQuotas(
    id: string,
    quotas: NonNullable<TenantRecord["quotas"]>,
  ): Promise<TenantRecord | undefined> {
    const current = await this.readAll();
    const idx = current.findIndex((t) => t.id === id);
    if (idx < 0) return undefined;
    current[idx] = {
      ...current[idx],
      quotas: {
        ...(current[idx].quotas ?? {}),
        ...quotas,
      },
      updatedAt: new Date().toISOString(),
    };
    await this.writeAll(current);
    return current[idx];
  }
}
