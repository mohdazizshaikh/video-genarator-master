/**
 * Authenticated JSON helper for protected UI routes.
 *
 * Wraps `authenticatedFetch` with consistent JSON parsing and error surfaces so
 * workspace-owned pages do not re-implement response handling. Errors carry the
 * server-provided `error` message when available; otherwise a status fallback.
 */
import { authenticatedFetch } from "./authenticatedFetch";

export async function authenticatedJson<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await authenticatedFetch(url, init);
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body && typeof body.error === "string" && body.error.trim()) {
        message = body.error;
      }
    } catch {
      // Non-JSON error bodies keep the status fallback message.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export const jsonPost = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const jsonPatch = (body: unknown): RequestInit => ({
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const jsonPut = (body: unknown): RequestInit => ({
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
