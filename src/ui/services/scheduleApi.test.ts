import { afterEach, expect, it, vi } from "vitest";
import { authenticatedFetch } from "./authenticatedFetch";
import { loadScheduleDashboard, runSchedule } from "./scheduleApi";
vi.mock("./authenticatedFetch", () => ({ authenticatedFetch: vi.fn() }));
const request = vi.mocked(authenticatedFetch);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
afterEach(() => vi.resetAllMocks());
it("returns a dashboard only when both authenticated responses succeed", async () => {
  request.mockResolvedValueOnce(json({ status: "ok", schedules: [{ id: "s" }] })).mockResolvedValueOnce(json({ status: "ok", stats: { total: 1 } }));
  await expect(loadScheduleDashboard()).resolves.toEqual({ schedules: [{ id: "s" }], stats: { total: 1 } });
  expect(request.mock.calls.map((call) => call[0])).toEqual(["/api/schedule?limit=100", "/api/schedule/stats"]);
});
it.each([401, 403, 503])("rejects HTTP %i instead of replacing schedules with an empty list", async (status) => {
  request.mockResolvedValueOnce(json({ error: "private upstream detail" }, status)).mockResolvedValueOnce(json({ status: "ok", stats: {} }));
  await expect(loadScheduleDashboard()).rejects.toThrow("Schedule request failed");
});
it("rejects malformed list and stats envelopes", async () => {
  for (const [list, stats] of [[{ status: "ok" }, { status: "ok", stats: {} }], [{ status: "ok", schedules: [] }, { status: "error" }], [{ status: "ok", schedules: [] }, { status: "ok", stats: [] }]]) {
    request.mockResolvedValueOnce(json(list)).mockResolvedValueOnce(json(stats));
    await expect(loadScheduleDashboard()).rejects.toThrow();
  }
});
it("distinguishes accepted runs from deferred or blocked runs", async () => {
  request.mockResolvedValueOnce(json({ status: "ok", success: true })).mockResolvedValueOnce(json({ status: "ok", success: false }));
  await expect(runSchedule("schedule/1")).resolves.toBe(true);
  expect(request).toHaveBeenNthCalledWith(1, "/api/schedule/schedule%2F1/run", { method: "POST" });
  await expect(runSchedule("s")).resolves.toBe(false);
});
it("rejects failed, invalid and lost run responses without dispatching again", async () => {
  request.mockResolvedValueOnce(json({ status: "error" }, 409)).mockResolvedValueOnce(json({ status: "ok" })).mockRejectedValueOnce(new Error("connection lost"));
  for (let attempt = 0; attempt < 3; attempt++) await expect(runSchedule("s")).rejects.toThrow();
  expect(request).toHaveBeenCalledTimes(3);
});
