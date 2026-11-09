import { afterEach, describe, expect, it, vi } from "vitest";
import { webhookRequest } from "./webhookApi";
import { authenticatedFetch } from "./authenticatedFetch";
vi.mock("./authenticatedFetch", () => ({ authenticatedFetch: vi.fn() }));
afterEach(() => vi.resetAllMocks());
describe("webhook action responses", () => {
  it("rejects failed deletes and toggles instead of letting the page report success", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue(new Response(JSON.stringify({ error: "Webhook not found" }), { status: 404 }));
    await expect(webhookRequest("/api/webhooks/missing", { method: "DELETE" })).rejects.toThrow("Webhook not found");
    vi.mocked(authenticatedFetch).mockResolvedValue(new Response("Gateway unavailable", { status: 503 }));
    await expect(webhookRequest("/api/webhooks/id/toggle", { method: "PATCH" })).rejects.toThrow("503");
  });
  it("returns successful data and readable validation messages", async () => {
    vi.mocked(authenticatedFetch).mockResolvedValue(new Response(JSON.stringify({ webhooks: [] })));
    await expect(webhookRequest("/api/webhooks")).resolves.toEqual({ webhooks: [] });
    vi.mocked(authenticatedFetch).mockResolvedValue(new Response(JSON.stringify({ error: "Invalid webhook configuration" }), { status: 400 }));
    await expect(webhookRequest("/api/webhooks", { method: "POST" })).rejects.toThrow("Invalid webhook configuration");
  });
});
