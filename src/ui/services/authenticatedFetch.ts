/**
 * Authenticated fetch boundary for protected UI routes.
 *
 * All workspace-owned browser requests should use this helper rather than raw
 * fetch(). It does not invent credentials and it does not bypass fail-closed
 * server authentication. A 401 clears the persisted session and lets Layout
 * redirect the user to secure onboarding.
 */
import { isApiOrigin } from "./apiOrigin";
import { useAuthStore } from "../store/authStore";

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const token = useAuthStore.getState().token;
  const headers = new Headers(init.headers);
  const trustedOrigin = isApiOrigin(input);
  if (!headers.has("Authorization") && token && trustedOrigin) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (
    !trustedOrigin &&
    token &&
    headers.get("Authorization") === `Bearer ${token}`
  )
    headers.delete("Authorization");
  const response = await fetch(input, { ...init, headers });
  if (trustedOrigin && token !== useAuthStore.getState().token)
    throw new Error("Session changed while the request was in flight");
  if (
    trustedOrigin &&
    response.status === 401 &&
    token &&
    token === useAuthStore.getState().token
  ) {
    useAuthStore.getState().logout();
    if (typeof window !== "undefined")
      window.dispatchEvent(new CustomEvent("auth-expired"));
  }
  return response;
}
