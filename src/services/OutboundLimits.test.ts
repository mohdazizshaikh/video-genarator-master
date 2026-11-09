import https from "node:https";
import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sendWebhook } from "./WebhookTransport";
import { fetchPublicFeed } from "./PublicFeedTransport";

const resolver = async () => [{ address: "8.8.8.8", family: 4 }];
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
function mockRequest(kind: "oversized" | "stalled" | "aborted", bytes = 0) {
  return vi.spyOn(https, "request").mockImplementation(((_url: unknown, _options: unknown, receive: (res: EventEmitter) => void) => {
    const request = new EventEmitter() as EventEmitter & { end: () => void; destroy: (err: Error) => void };
    request.destroy = vi.fn((err) => { request.emit("error", err); request.emit("close"); });
    request.end = () => {
      if (kind === "stalled") return;
      const response = Object.assign(new EventEmitter(), { statusCode: 200, headers: {} });
      receive(response);
      if (kind === "aborted") response.emit("error", new Error("Response aborted"));
      else response.emit("data", Buffer.alloc(bytes));
      request.emit("close");
    };
    return request;
  }) as typeof https.request);
}
describe("outbound resource limits", () => {
  it.each(["webhook", "feed"])("destroys oversized %s responses", async (kind) => {
    mockRequest("oversized", 2 * 1024 * 1024 + 1);
    const operation = kind === "feed" ? fetchPublicFeed("https://example.com/rss", resolver) : sendWebhook("https://example.com/hook", {}, { resolver });
    await expect(operation).rejects.toThrow(/exceeds.*limit/);
  });
  it.each(["webhook", "feed"])("ends stalled %s requests at their deadline", async (kind) => {
    vi.useFakeTimers();
    mockRequest("stalled");
    const operation = kind === "feed" ? fetchPublicFeed("https://example.com/rss", resolver) : sendWebhook("https://example.com/hook", {}, { resolver });
    const rejected = expect(operation).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(10001);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });
  it("rejects an oversized outgoing payload without opening a connection", async () => {
    const request = mockRequest("stalled");
    await expect(sendWebhook("https://example.com", { large: "x".repeat(1024 * 1024) }, { resolver })).rejects.toThrow("payload exceeds limit");
    expect(request).not.toHaveBeenCalled();
  });
  it("propagates response stream failure", async () => {
    mockRequest("aborted");
    await expect(fetchPublicFeed("https://example.com/rss", resolver)).rejects.toThrow("aborted");
  });
});
