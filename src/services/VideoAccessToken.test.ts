import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createVideoAccessToken,
  verifyVideoAccessToken,
} from "./VideoAccessToken";
beforeEach(() => {
  vi.stubEnv(
    "JWT_SECRET",
    "isolated-test-media-signing-secret-with-32-characters",
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
describe("short-lived video links", () => {
  it("binds the signature to one video and owner and rejects tampering", () => {
    const token = createVideoAccessToken("A", "video-id-123");
    expect(verifyVideoAccessToken(token, "video-id-123")?.tenantId).toBe("A");
    expect(verifyVideoAccessToken(token, "different-video")).toBeNull();
    const [body, signature] = token.split(".");
    const claims = JSON.parse(Buffer.from(body, "base64url").toString());
    claims.tenantId = "B";
    expect(
      verifyVideoAccessToken(
        `${Buffer.from(JSON.stringify(claims)).toString("base64url")}.${signature}`,
        "video-id-123",
      ),
    ).toBeNull();
    expect(verifyVideoAccessToken(`${token}.extra`, "video-id-123")).toBeNull();
  });
  it("expires and fails closed without a signing key", () => {
    vi.useFakeTimers();
    const token = createVideoAccessToken("A", "video-id-123");
    vi.advanceTimersByTime(61_000);
    expect(verifyVideoAccessToken(token, "video-id-123")).toBeNull();
    vi.stubEnv("JWT_SECRET", "");
    expect(() => createVideoAccessToken("A", "video-id-123")).toThrow();
  });
});
