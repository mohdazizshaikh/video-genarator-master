/** Bounded Graph request parsing; errors preserve status for classification but
 * callers must redact credential values before exposing/logging them. */
export async function graphRequest(url: string, init: RequestInit = {}, timeoutMs = 30000): Promise<Record<string, unknown>> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs), redirect: "error" });
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok || !data || typeof data !== "object" || Array.isArray(data) || data.error) {
    const message = (data?.error as { message?: unknown })?.message;
    throw Object.assign(new Error(typeof message === "string" ? message : "Graph request failed"), { response: { status: response.status, data } });
  }
  return data;
}
export function requiredProviderId(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.length > 500 || /\s/.test(value) || ["null", "undefined"].includes(value)) throw new Error("Invalid provider media identifier");
  return value;
}
export function requiredVideoUrl(value: unknown): string {
  try {
    const url = new URL(typeof value === "string" ? value : "");
    if (url.protocol === "https:" && !url.username && !url.password && url.href.length <= 2048) return url.href;
  } catch { /* A local filesystem path is not a provider-fetchable video URL. */ }
  throw new Error("A provider-accessible HTTPS videoUrl is required; local filesystem paths cannot be sent as video URLs");
}
