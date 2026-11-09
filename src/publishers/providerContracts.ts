import type { PublishResult } from "./PlatformPublisher";
import { PublishFailureError, classifyFailure, sanitizeProviderMessage } from "./failureClassification";

export function canonicalPublication(value: unknown, url?: (id: string) => string): PublishResult {
  if (typeof value !== "string" || !value.trim() || value.length > 500 || /\s/.test(value) || ["null", "undefined"].includes(value)) {
    return { success: false, deliveryOutcome: "unknown", errorCode: "unknown", error: "Provider response did not confirm a publication ID" };
  }
  return { success: true, externalId: value, platformVideoId: value, publishedUrl: url?.(value) };
}

export function providerFailure(error: unknown, secrets: string[], deliveryOutcome: "not_accepted" | "unknown"): PublishResult {
  const response = (error as { response?: { status?: number; data?: { error?: { message?: string }; detail?: string } } })?.response;
  const apiMessage = response?.data?.error?.message;
  const detail = response?.data?.detail;
  const raw = typeof apiMessage === "string" ? apiMessage : typeof detail === "string" ? detail : error instanceof Error ? error.message : "Provider request failed";
  const message = sanitizeProviderMessage(raw, secrets);
  const failure = classifyFailure({ message, httpStatus: typeof response?.status === "number" ? response.status : undefined });
  return { success: false, deliveryOutcome, error: message, errorCode: failure.code };
}

/** Only explicit authentication/permission responses establish invalid access.
 * Transport and service failures must remain distinguishable for preflight retry. */
export async function verifyProviderCredentials(check: () => Promise<unknown>, secrets: string[]): Promise<boolean> {
  try { await check(); return true; }
  catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) return false;
    const failure = providerFailure(error, secrets, "not_accepted");
    throw new PublishFailureError(classifyFailure({ code: failure.errorCode, message: failure.error || "Credential verification unavailable" }));
  }
}

export function unsupportedNativeSchedule(platform: string): PublishResult {
  return { success: false, deliveryOutcome: "not_accepted", errorCode: "payload_rejected", error: `${platform} native scheduling is unsupported; use managed due-time publishing` };
}
