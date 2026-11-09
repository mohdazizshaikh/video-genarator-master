import { authenticatedFetch } from "./authenticatedFetch";

/** Surface server validation failures before UI handlers report success. */
export async function webhookRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(path, init);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(typeof body?.error === "string" ? body.error : `Webhook request failed (${response.status})`);
  }
  if (body === null) throw new Error("Invalid webhook response");
  return body as T;
}
