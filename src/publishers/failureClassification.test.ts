import { describe, expect, it } from "vitest";
import {
  PublishFailureError,
  classifyFailure,
  codeFromHttpStatus,
  collectSecretValues,
  inferFailureCodeFromText,
  isPublishFailureCode,
  isRetryableFailureCode,
  sanitizeProviderMessage,
  toPublishFailureError,
} from "./failureClassification";

describe("classifyFailure", () => {
  it("classifies HTTP statuses into failure codes with correct retryability", () => {
    expect(classifyFailure({ message: "Unauthorized", httpStatus: 401 })).toMatchObject({ code: "credentials_invalid", retryable: false });
    expect(classifyFailure({ message: "Forbidden", httpStatus: 403 })).toMatchObject({ code: "permission_denied", retryable: false });
    expect(classifyFailure({ message: "Too Many Requests", httpStatus: 429 })).toMatchObject({ code: "rate_limited", retryable: true });
    expect(classifyFailure({ message: "Internal Server Error", httpStatus: 500 })).toMatchObject({ code: "provider_unavailable", retryable: true });
    expect(classifyFailure({ message: "Bad Gateway", httpStatus: 502 })).toMatchObject({ code: "provider_unavailable", retryable: true });
    expect(classifyFailure({ message: "Bad Request: invalid video", httpStatus: 400 })).toMatchObject({ code: "payload_rejected", retryable: false });
    expect(classifyFailure({ message: "Unprocessable", httpStatus: 422 })).toMatchObject({ code: "payload_rejected", retryable: false });
  });

  it("treats Telegram destination problems reported as 400s as permission failures", () => {
    expect(classifyFailure({ message: "Bad Request: chat not found", httpStatus: 400 })).toMatchObject({ code: "permission_denied", retryable: false });
    expect(classifyFailure({ message: "Bad Request: bot was blocked by the user", httpStatus: 400 })).toMatchObject({ code: "permission_denied", retryable: false });
  });

  it("prefers a valid publisher-provided code over status inference", () => {
    expect(classifyFailure({ code: "rate_limited", message: "Unauthorized", httpStatus: 401 })).toMatchObject({ code: "rate_limited", retryable: true });
    expect(classifyFailure({ code: "not-a-real-code", message: "Unauthorized", httpStatus: 401 })).toMatchObject({ code: "credentials_invalid" });
  });

  it("infers codes from provider text when no status is available", () => {
    expect(inferFailureCodeFromText("Too Many Requests: retry after 30")).toBe("rate_limited");
    expect(inferFailureCodeFromText("Request failed with status code 401")).toBe("credentials_invalid");
    expect(inferFailureCodeFromText("Forbidden: bot was kicked from the channel chat")).toBe("permission_denied");
    expect(inferFailureCodeFromText("connect ECONNREFUSED 127.0.0.1:443")).toBe("provider_unavailable");
    expect(inferFailureCodeFromText("timeout of 10000ms exceeded")).toBe("provider_unavailable");
    expect(inferFailureCodeFromText("Bad Request: video note is too large")).toBe("payload_rejected");
    expect(inferFailureCodeFromText("something entirely unexpected")).toBe("unknown");
  });

  it("converts provider retry-after hints into milliseconds for rate limits only", () => {
    expect(classifyFailure({ code: "rate_limited", message: "Too Many Requests", retryAfterSeconds: 30 }).retryAfterMs).toBe(30000);
    expect(classifyFailure({ code: "rate_limited", message: "Too Many Requests", retryAfterSeconds: 0 }).retryAfterMs).toBeUndefined();
    expect(classifyFailure({ code: "rate_limited", message: "Too Many Requests" }).retryAfterMs).toBeUndefined();
    expect(classifyFailure({ message: "Unauthorized", httpStatus: 401, retryAfterSeconds: 30 }).retryAfterMs).toBeUndefined();
  });

  it("keeps the unknown class retryable as the conservative default", () => {
    expect(isRetryableFailureCode("unknown")).toBe(true);
    expect(classifyFailure({ message: "something entirely unexpected" })).toMatchObject({ code: "unknown", retryable: true });
  });

  it("exposes HTTP status mapping and code guards", () => {
    expect(codeFromHttpStatus(401, "anything")).toBe("credentials_invalid");
    expect(codeFromHttpStatus(503, "anything")).toBe("provider_unavailable");
    expect(isPublishFailureCode("credentials_invalid")).toBe(true);
    expect(isPublishFailureCode("bogus")).toBe(false);
    expect(isPublishFailureCode(undefined)).toBe(false);
  });
});

describe("sanitizeProviderMessage", () => {
  it("redacts exact secret values", () => {
    const message = sanitizeProviderMessage("provider rejected token 1234567890:AAFsecretValueXYZ", ["1234567890:AAFsecretValueXYZ"]);
    expect(message).toBe("provider rejected token [redacted]");
  });

  it("redacts Telegram bot URLs even without the raw secret list", () => {
    expect(sanitizeProviderMessage("POST https://api.telegram.org/bot1234567890:AAFsecretValueXYZ/sendVideo failed")).toBe(
      "POST https://api.telegram.org/bot[redacted]/sendVideo failed",
    );
  });

  it("redacts OAuth query credentials and bearer headers", () => {
    expect(sanitizeProviderMessage("https://graph.facebook.com/v21.0/me?access_token=EAAabc123&fields=id")).toBe(
      "https://graph.facebook.com/v21.0/me?access_token=[redacted]&fields=id",
    );
    expect(sanitizeProviderMessage("header Authorization: Bearer ya29.a0AfH6SMBxyz123")).toBe("header Authorization: Bearer [redacted]");
  });

  it("ignores short values that are unlikely to be secrets", () => {
    expect(sanitizeProviderMessage("chat 349049 failed", ["349049"])).toBe("chat 349049 failed");
    expect(sanitizeProviderMessage("chat 862950049 failed", ["862950049"])).toBe("chat [redacted] failed");
  });
});

describe("PublishFailureError and toPublishFailureError", () => {
  it("carries classification fields on the error instance", () => {
    const error = new PublishFailureError({ code: "permission_denied", retryable: false, message: "bot was kicked" });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("PublishFailureError");
    expect(error.message).toBe("bot was kicked");
    expect(error.code).toBe("permission_denied");
    expect(error.retryable).toBe(false);
  });

  it("normalizes plain errors and strings, sanitizing with provided secrets", () => {
    const fromError = toPublishFailureError(new Error("Request failed with status code 401"), []);
    expect(fromError.code).toBe("credentials_invalid");
    expect(fromError.retryable).toBe(false);

    const fromString = toPublishFailureError("Provider said: token 1234567890:AAFsecretValueXYZ invalid", ["1234567890:AAFsecretValueXYZ"]);
    expect(fromString.message).not.toContain("AAFsecretValueXYZ");
    expect(fromString.code).toBe("credentials_invalid");
  });

  it("passes already-classified failures through unchanged (idempotent)", () => {
    const original = new PublishFailureError({ code: "rate_limited", retryable: true, retryAfterMs: 5000, message: "slow down" });
    expect(toPublishFailureError(original, ["anything"])).toBe(original);
  });
});

describe("collectSecretValues", () => {
  it("collects string values with the minimum length filter", () => {
    const values = collectSecretValues({ botToken: "1234567890:AAFsecret", chatId: "862950049", count: 5, blank: "  " });
    expect(values).toContain("1234567890:AAFsecret");
    expect(values).toContain("862950049");
    expect(values).not.toContain("  ");
    expect(values).toHaveLength(2);
  });

  it("supports explicit field selection for config containers", () => {
    const values = collectSecretValues({ telegramBotToken: "1234567890:AAFsecret", telegramChannelId: "862950049" }, ["telegramBotToken"]);
    expect(values).toEqual(["1234567890:AAFsecret"]);
    expect(collectSecretValues(undefined)).toEqual([]);
  });
});
