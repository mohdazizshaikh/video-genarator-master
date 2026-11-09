import crypto from "node:crypto";

interface VideoAccessClaims {
  purpose: "video-playback";
  tenantId: string;
  videoId: string;
  expiresAt: number;
}
const TTL_SECONDS = 60;
function signature(body: string): string {
  const secret = process.env.JWT_SECRET || "";
  if (secret.length < 32) throw new Error("Media signing is not configured");
  return crypto.createHmac("sha256", secret).update(body).digest("base64url");
}
export function createVideoAccessToken(
  tenantId: string,
  videoId: string,
): string {
  if (!tenantId.trim() || !/^[a-zA-Z0-9_-]+$/.test(videoId))
    throw new Error("Invalid video token identity");
  const claims: VideoAccessClaims = {
    purpose: "video-playback",
    tenantId,
    videoId,
    expiresAt: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${body}.${signature(body)}`;
}
export function verifyVideoAccessToken(
  token: string,
  videoId: string,
): VideoAccessClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [body, signed] = parts;
    const expected = signature(body);
    if (
      !signed ||
      signed.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(signed), Buffer.from(expected))
    )
      return null;
    const claims = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as VideoAccessClaims;
    if (
      claims.purpose !== "video-playback" ||
      typeof claims.tenantId !== "string" ||
      !claims.tenantId.trim() ||
      claims.videoId !== videoId ||
      !Number.isFinite(claims.expiresAt) ||
      claims.expiresAt <= Date.now() / 1000
    )
      return null;
    return claims;
  } catch {
    return null;
  }
}
