/**
 * Publish-failure classification (P1-03).
 *
 * Providers report failures with very different shapes (HTTP statuses, provider
 * error codes, plain strings). This module normalizes them into bounded,
 * operator-safe failure codes and decides retry terminality:
 *
 *  - credentials_invalid / permission_denied / payload_rejected → terminal (no retry)
 *  - rate_limited (honors provider retry-after)                  → retry
 *  - provider_unavailable                                        → retry
 *  - unknown                                                     → retry (conservative)
 *
 * Every operator-facing message passes through `sanitizeProviderMessage`, so
 * provider secrets (tokens embedded in URLs, credentials echoed in errors)
 * never reach job stores, dead-letters, lifecycle events, or the API.
 */

export type PublishFailureCode =
  | "credentials_invalid"
  | "permission_denied"
  | "rate_limited"
  | "payload_rejected"
  | "provider_unavailable"
  | "unknown";

export interface PublishFailure {
  code: PublishFailureCode;
  /** false => the remaining BullMQ attempts are pointless; fail fast to dead-letter. */
  retryable: boolean;
  /** Only populated for rate_limited when the provider told us when to retry. */
  retryAfterMs?: number;
  /** Operator-facing message with provider secrets redacted. */
  message: string;
}

export class PublishFailureError extends Error {
  readonly code: PublishFailureCode;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;

  constructor(failure: PublishFailure) {
    super(failure.message);
    this.name = "PublishFailureError";
    this.code = failure.code;
    this.retryable = failure.retryable;
    this.retryAfterMs = failure.retryAfterMs;
  }
}

const RETRYABLE_BY_CODE: Record<PublishFailureCode, boolean> = {
  credentials_invalid: false,
  permission_denied: false,
  payload_rejected: false,
  rate_limited: true,
  provider_unavailable: true,
  unknown: true,
};

/** Config fields that may hold provider secrets; used to redact error messages. */
export const CONFIG_SECRET_FIELDS = [
  "telegramBotToken",
  "youtubeClientSecret",
  "youtubeRefreshToken",
  "instagramAccessToken",
  "facebookAccessToken",
  "linkedinAccessToken",
  "twitterAccessToken",
  "twitterApiKey",
  "twitterApiSecret",
  "xBearerToken",
  "xApiKey",
  "xApiSecret",
  "xAccessToken",
  "xAccessSecret",
  "slackWebhookUrl",
  "pagerDutyRoutingKey",
] as const;

export function isPublishFailureCode(value: unknown): value is PublishFailureCode {
  return typeof value === "string" && value in RETRYABLE_BY_CODE;
}

export function isRetryableFailureCode(code: PublishFailureCode): boolean {
  return RETRYABLE_BY_CODE[code];
}

/**
 * Redacts provider secrets from an operator-facing error message. Works on both
 * exact secret values and well-known provider URL/header shapes.
 */
export function sanitizeProviderMessage(message: unknown, secrets: string[] = []): string {
  let safe = String(message ?? "");
  for (const secret of secrets) {
    if (typeof secret === "string" && secret.trim().length >= 8) {
      safe = safe.split(secret).join("[redacted]");
    }
  }
  // Telegram Bot API URLs embed the token: https://api.telegram.org/bot<id>:<token>/...
  safe = safe.replace(/\/bot\d+:[A-Za-z0-9_-]+/g, "/bot[redacted]");
  // OAuth/Graph-style query credentials.
  safe = safe.replace(/([?&](?:access_token|refresh_token|id_token|api_key|apikey|key|token)=)[^&\s"'<>]+/gi, "$1[redacted]");
  // Authorization headers.
  safe = safe.replace(/\b(Bearer)\s+[A-Za-z0-9._~+/=-]{8,}/gi, "$1 [redacted]");
  return safe;
}

/**
 * Text-pattern inference used when the provider did not supply a structured
 * status/error code. Order matters: rate limits and credentials are matched
 * before broader permission/payload patterns.
 */
export function inferFailureCodeFromText(text: string): PublishFailureCode {
  const value = String(text ?? "").toLowerCase();
  if (/too many requests|rate limit|\bquota\b|quota exceeded|\b429\b|retry after|slow down/.test(value)) return "rate_limited";
  if (/invalid[^.]{0,40}(token|credential|grant)|(token|credential|grant)[^.]{0,40}invalid|unauthorized|\b401\b|authentication|not authenticated|authorization[^.]{0,20}fail|expired[^.]{0,20}(token|credential)|(token|credential)[^.]{0,20}expired/.test(value)) {
    return "credentials_invalid";
  }
  if (/forbidden|\b403\b|permission|access denied|chat not found|blocked|kicked|deactivated|not enough rights|no rights|insufficient[^.]{0,20}(scope|privilege)/.test(value)) {
    return "permission_denied";
  }
  if (/timeout|timed out|econn|enotfound|eai_again|socket|network|unavailable|bad gateway|\b50[0234]\b/.test(value)) return "provider_unavailable";
  if (/bad request|\b400\b|\b422\b|invalid[^.]{0,60}(format|payload|parameter|video|media|file)|unsupported|too large/.test(value)) {
    return "payload_rejected";
  }
  return "unknown";
}

export function codeFromHttpStatus(status: number, message: string): PublishFailureCode {
  if (status === 401) return "credentials_invalid";
  if (status === 403) return "permission_denied";
  if (status === 429) return "rate_limited";
  if (status === 400 || status === 422) {
    // Telegram (and other providers) report destination problems as 400s.
    const textCode = inferFailureCodeFromText(message);
    if (textCode === "credentials_invalid" || textCode === "permission_denied" || textCode === "rate_limited") return textCode;
    return "payload_rejected";
  }
  if (status >= 500) return "provider_unavailable";
  return inferFailureCodeFromText(message);
}

export interface ClassifyFailureInput {
  /** Publisher-provided code (wins when valid); free-form providers may omit it. */
  code?: string;
  /** Sanitized, operator-facing message. */
  message: string;
  httpStatus?: number;
  retryAfterSeconds?: number;
}

export function classifyFailure(input: ClassifyFailureInput): PublishFailure {
  const code = isPublishFailureCode(input.code)
    ? input.code
    : typeof input.httpStatus === "number"
      ? codeFromHttpStatus(input.httpStatus, input.message)
      : inferFailureCodeFromText(input.message);
  const retryAfterMs =
    code === "rate_limited" && typeof input.retryAfterSeconds === "number" && Number.isFinite(input.retryAfterSeconds) && input.retryAfterSeconds > 0
      ? Math.round(input.retryAfterSeconds * 1000)
      : undefined;
  return { code, retryable: RETRYABLE_BY_CODE[code], retryAfterMs, message: input.message };
}

/**
 * Normalizes any thrown value into a classified, sanitized failure. Already
 * classified failures pass through untouched (idempotent).
 */
export function toPublishFailureError(error: unknown, secrets: string[] = []): PublishFailureError {
  if (error instanceof PublishFailureError) return error;
  const rawMessage = error instanceof Error ? error.message : String(error ?? "Unknown publish failure");
  const message = sanitizeProviderMessage(rawMessage, secrets);
  return new PublishFailureError(classifyFailure({ message }));
}

/**
 * Collects candidate secret values from a credentials/config container.
 * With `fieldNames` only those keys are read; otherwise every string value is
 * considered. Values shorter than 8 characters are ignored to avoid mangling
 * unrelated text during sanitization.
 */
export function collectSecretValues(
  source: Record<string, unknown> | undefined,
  fieldNames?: readonly string[],
): string[] {
  if (!source) return [];
  const keys = fieldNames ?? Object.keys(source);
  const values: string[] = [];
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length >= 8) values.push(value);
  }
  return values;
}
