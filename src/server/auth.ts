import type { Request, Response, NextFunction } from "express";
import { logger } from "../logger";
import { verifyRenderMediaToken } from "../services/RenderMediaToken";

const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "";

export interface AuthClaims {
  tenantId: string;
  name?: string;
  plan?: string;
  permissions?: string[];
  issuedAt?: number;
  expiresAt?: number;
}

export function getAuthenticatedTenantId(req: Request): string | undefined {
  const claims = (req as Request & { auth?: AuthClaims }).auth;
  return claims?.tenantId;
}

export function isAdminRequest(req: Request): boolean {
  return Boolean(ADMIN_API_KEY) && req.get("X-Admin-Key") === ADMIN_API_KEY;
}

export function adminKeyConfigured(): boolean {
  return ADMIN_API_KEY.length > 0;
}

/**
 * Fail-closed admin guard.
 * Requires the X-Admin-Key header to match ADMIN_API_KEY.
 * If the server has no ADMIN_API_KEY configured, the endpoint is disabled (403).
 */
export function requireAdminKey(req: Request, res: Response, next: NextFunction) {
  if (!ADMIN_API_KEY) {
    return res.status(403).json({
      error: "Admin API key is not configured on the server (set ADMIN_API_KEY)",
    });
  }
  const provided = req.get("X-Admin-Key");
  if (!provided || provided !== ADMIN_API_KEY) {
    return res.status(403).json({ error: "Invalid or missing X-Admin-Key header" });
  }
  next();
}

/**
 * Non-blocking token validation. When a valid `Authorization: Bearer` token is
 * supplied it is attached to the request as `req.auth`. Requests without a
 * token (or with an invalid one) are NOT rejected so the existing UI keeps
 * working while clients migrate to authenticated calls.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = (req as Request & { auth?: AuthClaims }).auth;
  if (isAdminRequest(req)) {
    next();
    return;
  }
  if (isValidRenderMediaRequest(req)) {
    next();
    return;
  }
  if (!auth?.tenantId) {
    return res.status(401).json({
      error: "Authentication required",
      code: "AUTH_REQUIRED",
    });
  }
  next();
}

function isValidRenderMediaRequest(req: Request): boolean {
  if (req.method !== "GET" || !(req.path.startsWith("/tmp/") || req.path.startsWith("/music/"))) {
    return false;
  }
  const token = typeof req.query.mediaToken === "string" ? req.query.mediaToken : "";
  const fileName = decodeURIComponent(req.path.split("/").pop() || "");
  return verifyRenderMediaToken(token, undefined, fileName);
}

export function validateTokenIfPresent(req: Request, res: Response, next: NextFunction) {
  const header = req.get("Authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return next();
  }
  const token = header.slice("Bearer ".length).trim();
  try {
    // Lazy require to avoid a circular dependency on module load.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { verifyJwtToken } = require("../services/AuthEngine") as {
      verifyJwtToken: (t: string) => unknown;
    };
    const payload = verifyJwtToken(token);
    if (payload) {
      (req as Request & { auth?: AuthClaims }).auth = payload as AuthClaims;
    }
  } catch {
    // Invalid token is ignored (non-blocking).
  }
  next();
}

export function logAdminKeyStatus() {
  if (!ADMIN_API_KEY) {
    logger.warn(
      "ADMIN_API_KEY is not set — admin endpoints (/api/system/export*, auth/tenants, auth/rotate, tenant keys) are disabled.",
    );
  }
}
