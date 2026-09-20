import crypto from "crypto";

const TOKEN_TTL_SECONDS = 300;
const secret = process.env.JWT_SECRET || "";

type RenderMediaClaims = {
  purpose: "render-media";
  tenantId: string;
  fileName: string;
  expiresAt: number;
};

function encode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function sign(body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("base64url");
}

export function createRenderMediaToken(tenantId: string, fileName: string): string {
  if (!secret || secret.length < 32 || !tenantId || !fileName) {
    throw new Error("Render media token prerequisites are not configured");
  }
  const claims: RenderMediaClaims = {
    purpose: "render-media",
    tenantId,
    fileName,
    expiresAt: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const body = encode(JSON.stringify(claims));
  return `${body}.${sign(body)}`;
}

export function verifyRenderMediaToken(token: string, tenantId: string | undefined, fileName: string): boolean {
  try {
    const [body, signature] = token.split(".");
    if (!body || !signature || !secret) return false;
    const expected = sign(body);
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as RenderMediaClaims;
    return claims.purpose === "render-media"
      && (!tenantId || claims.tenantId === tenantId)
      && claims.fileName === fileName
      && claims.expiresAt >= Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function renderMediaTokenTtlSeconds(): number {
  return TOKEN_TTL_SECONDS;
}
