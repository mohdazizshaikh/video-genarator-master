/**
 * Authenticated fetch boundary for protected UI routes.
 *
 * All workspace-owned browser requests should use this helper rather than raw
 * fetch(). It does not invent credentials and it does not bypass fail-closed
 * server authentication. A 401 clears the persisted session and lets Layout
 * redirect the user to secure onboarding.
 */
import { useAuthStore } from "../store/authStore";

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const token = useAuthStore.getState().token;
  const headers = new Headers(init.headers);
  if (!headers.has("Authorization") && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) {
    useAuthStore.getState().logout();
    window.dispatchEvent(new CustomEvent("auth-expired"));
  }
  return response;
}
