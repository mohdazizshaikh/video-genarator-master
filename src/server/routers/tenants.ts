import { Router } from "express";
import crypto from "node:crypto";
import type { Request, Response } from "express";
import type { Config } from "../../config";
import { TenantStore, type TenantRecord } from "../../db/TenantStore";
import { TenantUsageStore } from "../../db/TenantUsageStore";
import { CryptoService } from "../../services/CryptoService";
import { TenantQuotaService } from "../../services/TenantQuotaService";
import { TenantLoggerService } from "../../services/TenantLoggerService";
import { getAuthenticatedTenantId, isAdminRequest, requireAdminKey } from "../auth";

const INSECURE_SECRETS = new Set(["tenant-dev-secret", "change-me-in-production", "change_me", "secret", "password"]);

function sanitizeTenant(tenant: TenantRecord) {
  const { apiKeys, encryptedApiKeys, ...rest } = tenant;
  const masked = Object.keys(encryptedApiKeys ?? {}).reduce<Record<string, string>>(
    (acc, k) => ({ ...acc, [k]: "••••" }),
    {},
  );
  return { ...rest, apiKeys: { ...(apiKeys ?? {}), ...masked } };
}

export class TenantRouter {
  public router: Router;
  private tenantStore: TenantStore;
  private usageStore: TenantUsageStore;
  private crypto: CryptoService;
  private quotaService: TenantQuotaService;
  private tenantLogger: TenantLoggerService;

  constructor(config: Config) {
    this.router = Router();
    this.tenantStore = new TenantStore(config.dataDirPath);
    this.usageStore = new TenantUsageStore(config.dataDirPath);
    const keysSecret = process.env.TENANT_KEYS_SECRET || "";
    if (!keysSecret || INSECURE_SECRETS.has(keysSecret.toLowerCase())) {
      throw new Error(
        "TENANT_KEYS_SECRET environment variable is required and must not be a known default. " +
          "Generate one with: openssl rand -hex 32",
      );
    }
    this.crypto = new CryptoService(keysSecret);
    this.quotaService = new TenantQuotaService();
    this.tenantLogger = new TenantLoggerService(config.dataDirPath);
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.get("/", (req: Request, res: Response) => this.list(req, res));
    this.router.post("/", requireAdminKey, (req: Request, res: Response) => this.create(req, res));
    this.router.post("/bootstrap", (req: Request, res: Response) => this.bootstrap(req, res));
    this.router.get("/:tenantId", (req: Request, res: Response) => this.get(req, res));
    this.router.put("/:tenantId", (req: Request, res: Response) => this.updateWorkspace(req, res));
    this.router.get("/:tenantId/keys", (req: Request, res: Response) => this.listManagedKeys(req, res));
    this.router.post("/:tenantId/keys", (req: Request, res: Response) => this.manageManagedKey(req, res));
    this.router.delete("/:tenantId/keys/:keyId", (req: Request, res: Response) => this.deleteManagedKey(req, res));
    // Provider credential updates remain admin-only.
    this.router.post("/:tenantId/engines", (req: Request, res: Response) => this.updateEngines(req, res));
    this.router.post("/:tenantId/quotas", (req: Request, res: Response) => this.updateQuotas(req, res));
    this.router.get("/:tenantId/billing", (req: Request, res: Response) => this.getBilling(req, res));
    this.router.post("/:tenantId/logs/:engine", (req: Request, res: Response) => this.writeEngineLog(req, res));
  }

  private async create(req: Request, res: Response): Promise<void> {
    const { workspaceName, tier, apiKeys } = req.body;
    if (!workspaceName || !tier) {
      res.status(400).json({ error: "workspaceName and tier are required" });
      return;
    }
    const encrypted: Record<string, string> = apiKeys
      ? Object.fromEntries(
          Object.entries(apiKeys).map(([k, v]) => [k, this.crypto.encrypt(String(v))]),
        )
      : {};
    const tenant = await this.tenantStore.create({ workspaceName, tier, encryptedApiKeys: encrypted });
    res.status(201).json(sanitizeTenant(tenant));
  }

  private async bootstrap(req: Request, res: Response): Promise<void> {
    const authTenantId = getAuthenticatedTenantId(req);
    if (!authTenantId) {
      res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      return;
    }
    const workspaceName = String(req.body?.workspaceName || "").trim();
    const tier = req.body?.tier || "free";
    if (!workspaceName || !["free", "pro", "enterprise"].includes(tier)) {
      res.status(400).json({ error: "workspaceName and a valid tier are required" });
      return;
    }
    const existing = await this.tenantStore.get(authTenantId);
    if (existing) {
      res.json(sanitizeTenant(existing));
      return;
    }
    const tenant = await this.tenantStore.create({
      id: authTenantId,
      workspaceName,
      tier,
    });
    res.status(201).json(sanitizeTenant(tenant));
  }

  private async list(req: Request, res: Response): Promise<void> {
    const authTenantId = getAuthenticatedTenantId(req);
    if (!authTenantId && !isAdminRequest(req)) {
      res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      return;
    }
    const tenants = isAdminRequest(req)
      ? await this.tenantStore.list()
      : await this.tenantStore.listForTenant(authTenantId ?? "");
    res.json(tenants.map(sanitizeTenant));
  }

  private async get(req: Request, res: Response): Promise<void> {
    const authTenantId = getAuthenticatedTenantId(req);
    if (!authTenantId && !isAdminRequest(req)) {
      res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      return;
    }
    const tenant = isAdminRequest(req)
      ? await this.tenantStore.get(req.params.tenantId)
      : await this.tenantStore.getForTenant(authTenantId ?? "", req.params.tenantId);
    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }
    res.json(sanitizeTenant(tenant));
  }

  private async updateWorkspace(req: Request, res: Response): Promise<void> {
    const authTenantId = getAuthenticatedTenantId(req);
    if (!authTenantId && !isAdminRequest(req)) {
      res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      return;
    }
    const workspaceName = String(req.body?.workspaceName || "").trim();
    if (!workspaceName) {
      res.status(400).json({ error: "workspaceName is required" });
      return;
    }
    const updates = { workspaceName, description: req.body?.description, logoUrl: req.body?.logoUrl };
    const updated = isAdminRequest(req)
      ? await this.tenantStore.updateWorkspaceForTenant(req.params.tenantId, req.params.tenantId, updates)
      : await this.tenantStore.updateWorkspaceForTenant(authTenantId ?? "", req.params.tenantId, updates);
    if (!updated) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }
    res.json(sanitizeTenant(updated));
  }

  private async listManagedKeys(req: Request, res: Response): Promise<void> {
    const authTenantId = getAuthenticatedTenantId(req);
    if (!authTenantId || authTenantId !== req.params.tenantId) {
      res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      return;
    }
    const tenant = await this.tenantStore.getForTenant(authTenantId, req.params.tenantId);
    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }
    const keys = Object.keys(tenant.encryptedApiKeys ?? {}).map((id) => ({
      id,
      name: id.split("__")[0],
      prefix: "••••",
      createdAt: tenant.createdAt,
    }));
    res.json(keys);
  }

  private async manageManagedKey(req: Request, res: Response): Promise<void> {
    const authTenantId = getAuthenticatedTenantId(req);
    if (!authTenantId || authTenantId !== req.params.tenantId) {
      res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      return;
    }
    const tenant = await this.tenantStore.getForTenant(authTenantId, req.params.tenantId);
    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }
    const action = req.body?.action;
    const requestedName = String(req.body?.name || "").trim();
    const keyId = action === "regenerate" ? String(req.body?.keyId || "") : `${requestedName}__${crypto.randomBytes(8).toString("hex")}`;
    if (!keyId || (action !== "regenerate" && !requestedName)) {
      res.status(400).json({ error: action === "regenerate" ? "keyId is required" : "name is required" });
      return;
    }
    if (action === "regenerate" && !(tenant.encryptedApiKeys ?? {})[keyId]) {
      res.status(404).json({ error: "API key not found" });
      return;
    }
    const value = `cfk_${crypto.randomBytes(24).toString("hex")}`;
    const updated = await this.tenantStore.updateEncryptedKeysForTenant(authTenantId, req.params.tenantId, { [keyId]: this.crypto.encrypt(value) });
    if (!updated) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }
    res.status(action === "regenerate" ? 200 : 201).json({ id: keyId, name: keyId.split("__")[0], prefix: value.slice(0, 12) + "...", value });
  }

  private async deleteManagedKey(req: Request, res: Response): Promise<void> {
    const authTenantId = getAuthenticatedTenantId(req);
    if (!authTenantId || authTenantId !== req.params.tenantId) {
      res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      return;
    }
    const tenant = await this.tenantStore.getForTenant(authTenantId, req.params.tenantId);
    if (!tenant || !(tenant.encryptedApiKeys ?? {})[req.params.keyId]) {
      res.status(404).json({ error: "API key not found" });
      return;
    }
    await this.tenantStore.deleteEncryptedKeyForTenant(authTenantId, req.params.tenantId, req.params.keyId);
    res.status(204).send();
  }

  private async updateKeys(req: Request, res: Response): Promise<void> {
    const apiKeys = req.body.apiKeys || {};
    const encrypted = Object.fromEntries(
      Object.entries(apiKeys).map(([k, v]) => [k, this.crypto.encrypt(String(v))]),
    );

    const authTenantId = getAuthenticatedTenantId(req);
    if (!authTenantId && !isAdminRequest(req)) {
      res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      return;
    }
    const updated = isAdminRequest(req)
      ? await this.tenantStore.updateEncryptedKeys(req.params.tenantId, encrypted)
      : await this.tenantStore.updateEncryptedKeysForTenant(authTenantId ?? "", req.params.tenantId, encrypted);
    if (!updated) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }
    res.json(sanitizeTenant(updated));
  }

  private async updateEngines(req: Request, res: Response): Promise<void> {
    const authTenantId = getAuthenticatedTenantId(req);
    if (!authTenantId && !isAdminRequest(req)) {
      res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      return;
    }
    const updated = isAdminRequest(req)
      ? await this.tenantStore.updateEngineConfig(req.params.tenantId, req.body.engineConfig || {})
      : await this.tenantStore.updateEngineConfigForTenant(authTenantId ?? "", req.params.tenantId, req.body.engineConfig || {});
    if (!updated) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }
    res.json(sanitizeTenant(updated));
  }

  private async updateQuotas(req: Request, res: Response): Promise<void> {
    const authTenantId = getAuthenticatedTenantId(req);
    if (!authTenantId && !isAdminRequest(req)) {
      res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      return;
    }
    const updated = isAdminRequest(req)
      ? await this.tenantStore.updateQuotas(req.params.tenantId, req.body.quotas || {})
      : await this.tenantStore.updateQuotasForTenant(authTenantId ?? "", req.params.tenantId, req.body.quotas || {});
    if (!updated) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }
    res.json(sanitizeTenant(updated));
  }

  private async getBilling(req: Request, res: Response): Promise<void> {
    const authTenantId = getAuthenticatedTenantId(req);
    if (!authTenantId && !isAdminRequest(req)) {
      res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      return;
    }
    const tenant = isAdminRequest(req)
      ? await this.tenantStore.get(req.params.tenantId)
      : await this.tenantStore.getForTenant(authTenantId ?? "", req.params.tenantId);
    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const usage = await this.usageStore.get(tenant.id, month) ?? {
      tenantId: tenant.id,
      month,
      renders: 0,
      publishes: 0,
      storageBytes: 0,
      estimatedCostUsd: 0,
    };
    const quota = this.quotaService.checkQuota(tenant, usage);
    res.json({ usage, quota });
  }

  private async writeEngineLog(req: Request, res: Response): Promise<void> {
    const { tenantId, engine } = req.params;
    const authTenantId = getAuthenticatedTenantId(req);
    if (!authTenantId && !isAdminRequest(req)) {
      res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
      return;
    }
    if (!isAdminRequest(req) && authTenantId !== tenantId) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }
    const { level = "info", message = "", payload } = req.body || {};
    await this.tenantLogger.log(authTenantId ?? tenantId, engine, level, message, payload);
    res.status(201).json({ ok: true });
  }
}
