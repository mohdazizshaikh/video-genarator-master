/* eslint-disable @remotion/deterministic-randomness */

import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import { logger } from "../logger";

export interface Tenant {
  id: string;
  name: string;
  email: string;
  apiKey: string;
  apiKeyHash: string;
  plan: "free" | "pro" | "enterprise";
  status: "active" | "suspended" | "pending";
  createdAt: string;
  lastLoginAt?: string;
  rotatedAt?: string;
  permissions: string[];
  metadata: Record<string, unknown>;
}

export interface AuthToken {
  tenantId: string;
  name: string;
  plan: string;
  permissions: string[];
  issuedAt: number;
  expiresAt: number;
}

export interface AuthResult {
  success: boolean;
  tenant?: Omit<Tenant, "apiKey" | "apiKeyHash">;
  token?: string;
  error?: string;
}

const jwtSecretCandidate = process.env.JWT_SECRET || "";
const insecureDefaults = new Set([
  "change-this-to-a-random-secret-at-least-32-chars",
  "change-me-in-production",
  "change_me",
  "secret",
  "password",
]);
if (
  !jwtSecretCandidate ||
  jwtSecretCandidate.length < 32 ||
  insecureDefaults.has(jwtSecretCandidate.toLowerCase())
) {
  throw new Error(
    "JWT_SECRET environment variable is required and must be a unique secret at least 32 characters long. " +
      "Generate one with: openssl rand -hex 32",
  );
}
const JWT_SECRET = jwtSecretCandidate;
const TOKEN_TTL_SEC = 3600;

export function verifyJwtToken(token: string): AuthToken | null {
  return verifyJwt(token, JWT_SECRET);
}

function generateApiKey(): string {
  return "ace_" + crypto.randomBytes(24).toString("hex");
}

function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function base64url(data: string): string {
  return Buffer.from(data).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function signJwt(payload: AuthToken, secret: string): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

function verifyJwt(token: string, secret: string): AuthToken | null {
  try {
    const [header, body, sig] = token.split(".");
    const expected = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, "base64").toString()) as AuthToken;
    if (payload.expiresAt < Date.now() / 1000) return null;
    return payload;
  } catch { return null; }
}

export class AuthEngine {
  private dataPath: string;
  private tenants: Tenant[] = [];

  constructor(dataDirPath: string) {
    this.dataPath = path.join(dataDirPath, "auth-tenants.json");
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.dataPath)) this.tenants = fs.readJsonSync(this.dataPath);
    } catch { this.tenants = []; }
  }

  private save() {
    try { fs.writeJsonSync(this.dataPath, this.tenants, { spaces: 2 }); } catch { /* ignore */ }
  }

  registerTenant(name: string, email: string, plan: Tenant["plan"] = "free"): { tenant: Omit<Tenant, "apiKeyHash">; plainApiKey: string } {
    const existing = this.tenants.find((t) => t.email === email);
    if (existing) throw new Error(`Tenant with email ${email} already exists`);

    const apiKey = generateApiKey();
    const tenant: Tenant = {
      id: `tenant_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name, email,
      apiKey: apiKey.substring(0, 12) + "...",
      apiKeyHash: hashApiKey(apiKey),
      plan, status: "active",
      createdAt: new Date().toISOString(),
      permissions: this.getDefaultPermissions(plan),
      metadata: {},
    };

    this.tenants.push(tenant);
    this.save();
    logger.info({ tenantId: tenant.id, name }, "AuthEngine: tenant registered");
    return { tenant: { ...tenant, apiKey: apiKey.substring(0, 12) + "..." }, plainApiKey: apiKey };
  }

  authenticate(apiKey: string): AuthResult {
    try {
      const hash = hashApiKey(apiKey);
      const tenant = this.tenants.find((t) => t.apiKeyHash === hash);

      if (!tenant) return { success: false, error: "Invalid API key" };
      if (tenant.status !== "active") return { success: false, error: `Account ${tenant.status}` };

      tenant.lastLoginAt = new Date().toISOString();
      this.save();

      const payload: AuthToken = {
        tenantId: tenant.id, name: tenant.name, plan: tenant.plan,
        permissions: tenant.permissions,
        issuedAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC,
      };

      const token = signJwt(payload, JWT_SECRET);
      const safeTenant = { ...tenant } as Omit<Tenant, "apiKey" | "apiKeyHash"> & Record<string, unknown>;
      delete safeTenant.apiKey;
      delete safeTenant.apiKeyHash;
      logger.debug({ tenantId: tenant.id }, "AuthEngine: authenticated");
      return { success: true, tenant: safeTenant, token };
    } catch (err) {
      logger.error({ err }, "AuthEngine.authenticate error");
      return { success: false, error: "Authentication error" };
    }
  }

  verifyToken(token: string): AuthToken | null {
    return verifyJwt(token, JWT_SECRET);
  }

  rotateCredentials(tenantId: string): { plainApiKey: string } {
    const tenant = this.tenants.find((t) => t.id === tenantId);
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`);

    const apiKey = generateApiKey();
    tenant.apiKey = apiKey.substring(0, 12) + "...";
    tenant.apiKeyHash = hashApiKey(apiKey);
    tenant.rotatedAt = new Date().toISOString();
    this.save();
    logger.info({ tenantId }, "AuthEngine: credentials rotated");
    return { plainApiKey: apiKey };
  }

  suspendTenant(tenantId: string): void {
    const t = this.tenants.find((t) => t.id === tenantId);
    if (t) { t.status = "suspended"; this.save(); }
  }

  activateTenant(tenantId: string): void {
    const t = this.tenants.find((t) => t.id === tenantId);
    if (t) { t.status = "active"; this.save(); }
  }

  private getDefaultPermissions(plan: Tenant["plan"]): string[] {
    const base = ["content:read", "content:write", "publish:basic", "release:approve"];
    if (plan === "pro") return [...base, "analytics:read", "export:basic", "ab-testing"];
    if (plan === "enterprise") return [...base, "analytics:read", "analytics:write", "export:full", "ab-testing", "api:advanced", "tenants:manage"];
    return base;
  }

  getTenants(): Omit<Tenant, "apiKey" | "apiKeyHash">[] {
    return this.tenants.map((tenant) => {
      const safeTenant = { ...tenant } as Omit<Tenant, "apiKey" | "apiKeyHash"> & Record<string, unknown>;
      delete safeTenant.apiKey;
      delete safeTenant.apiKeyHash;
      return safeTenant;
    });
  }

  getTenant(id: string): Omit<Tenant, "apiKey" | "apiKeyHash"> | undefined {
    const t = this.tenants.find((t) => t.id === id);
    if (!t) return undefined;
    const safe = { ...t } as Omit<Tenant, "apiKey" | "apiKeyHash"> & Record<string, unknown>;
    delete safe.apiKey;
    delete safe.apiKeyHash;
    return safe;
  }
}
