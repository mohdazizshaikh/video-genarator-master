import { authenticatedFetch } from "./authenticatedFetch";

/** Reject transport/application errors before a page replaces its last good state. */
async function scheduleRequest(url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const response = await authenticatedFetch(url, init);
  if (!response.ok) throw new Error("Schedule request failed");
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || Array.isArray(body) || (body as Record<string, unknown>).status !== "ok") throw new Error("Invalid schedule response");
  return body as Record<string, unknown>;
}

export async function loadScheduleDashboard<T, S>(): Promise<{ schedules: T[]; stats: S }> {
  const [list, summary] = await Promise.all([scheduleRequest("/api/schedule?limit=100"), scheduleRequest("/api/schedule/stats")]);
  if (!Array.isArray(list.schedules) || !summary.stats || typeof summary.stats !== "object" || Array.isArray(summary.stats)) throw new Error("Invalid schedule dashboard");
  return { schedules: list.schedules as T[], stats: summary.stats as S };
}

export async function runSchedule(id: string): Promise<boolean> {
  const response = await scheduleRequest(`/api/schedule/${encodeURIComponent(id)}/run`, { method: "POST" });
  if (typeof response.success !== "boolean") throw new Error("Invalid schedule run response");
  return response.success;
}
