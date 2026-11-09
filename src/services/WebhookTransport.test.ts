import { afterEach, describe, expect, it, vi } from "vitest";
import https from "node:https";
import { EventEmitter } from "node:events";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { sendWebhook } from "./WebhookTransport";
import { isBlockedIp, prepareWebhookUrl, sanitizeWebhookError } from "./webhookSecurity";
import { WebhookNotificationEngine } from "./WebhookNotificationEngine";

const resolver = vi.fn(async () => [{ address: "8.8.8.8", family: 4 }]);
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
function transport(status = 204) {
  return vi.spyOn(https, "request").mockImplementation(((_url: unknown, _options: unknown, callback: (response: EventEmitter) => void) => {
    const req = new EventEmitter() as EventEmitter & { end: () => void; destroy: (err: Error) => void };
    req.destroy = (err) => { req.emit("error", err); req.emit("close"); };
    req.end = () => {
      const response = Object.assign(new EventEmitter(), { statusCode: status });
      callback(response);
      response.emit("end");
      req.emit("close");
    };
    return req;
  }) as typeof https.request);
}
describe("webhook outbound boundary", () => {
  it.each(["127.0.0.1", "10.0.0.1", "::1", "64:ff9b::a00:1", "::ffff:127.0.0.1"])("blocks %s", (ip) => expect(isBlockedIp(ip)).toBe(true));
  it("rejects mixed DNS answers and invalid address families", async () => {
    for (const answers of [[{ address: "8.8.8.8", family: 6 }], [{ address: "8.8.8.8", family: 4 }, { address: "127.0.0.1", family: 4 }]]) {
      await expect(prepareWebhookUrl("https://example.com", async () => answers)).rejects.toThrow();
    }
  });
  it("pins the connection while retaining Host and TLS servername", async () => {
    const request = transport();
    await sendWebhook("https://example.com/hook", { ok: true }, { resolver });
    expect(request.mock.calls[0][0]).toBe("https://8.8.8.8/hook");
    expect(request.mock.calls[0][1]).toMatchObject({ servername: "example.com", headers: { Host: "example.com" }, agent: false });
  });
  it("does not follow redirects or accept provider spoofing", async () => {
    const request = transport(302);
    await expect(sendWebhook("https://example.com", {}, { resolver })).rejects.toThrow("HTTP 302");
    expect(request).toHaveBeenCalledTimes(1);
    await expect(sendWebhook("https://example.com/services/x", {}, { resolver, provider: "slack" })).rejects.toThrow("Slack");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("blocks routing headers and private destinations before opening a connection", async () => {
    const request = transport();
    await expect(sendWebhook("https://127.0.0.1", {})).rejects.toThrow();
    await expect(sendWebhook("https://example.com", {}, { resolver, headers: { Host: "localhost" } })).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it("redacts destination credentials and custom authorization values", () => {
    expect(sanitizeWebhookError("https://example.com/hook?token=hidden Bearer abcdef secret-header", ["secret-header"])).not.toMatch(/hidden|abcdef|secret-header/);
  });
  it("rejects unsafe destinations on create and update without changing stored records", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "webhook-validation-"));
    vi.stubEnv("TENANT_KEYS_SECRET", "test-only-webhook-encryption-secret");
    try {
      const engine = new WebhookNotificationEngine(dir, resolver);
      const config = { tenantId: "a", name: "one", channel: "custom" as const, customUrl: "https://127.0.0.1", enabled: true, events: ["video.ready" as const] };
      await expect(engine.addWebhook(config)).rejects.toThrow();
      expect(engine.getWebhooks("a")).toEqual([]);
      const hook = await engine.addWebhook({ ...config, customUrl: "https://example.com/hook" });
      const before = fs.readFileSync(path.join(dir, "webhooks.json"), "utf8");
      await expect(engine.updateWebhook("a", hook.id, { customUrl: "https://127.0.0.1" })).rejects.toThrow();
      expect(fs.readFileSync(path.join(dir, "webhooks.json"), "utf8")).toBe(before);
    } finally { fs.removeSync(dir); }
  });
  it("keeps webhook ownership and tests only the chosen disabled hook", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "webhook-boundary-"));
    try {
      vi.stubEnv("TENANT_KEYS_SECRET", "test-only-webhook-encryption-secret");
      const engine = new WebhookNotificationEngine(dir, resolver);
      const first = await engine.addWebhook({ tenantId: "a", name: "one", channel: "custom", customUrl: "https://example.com/secret-hook", enabled: false, events: ["cost.alert"] });
      await engine.addWebhook({ tenantId: "a", name: "two", channel: "custom", customUrl: "https://example.com/secret-hook", enabled: true, events: ["video.ready"] });
      await engine.updateWebhook("a", first.id, { tenantId: "b", triggerCount: 999 });
      expect(engine.getWebhooks("b")).toEqual([]);
      const stored = fs.readFileSync(path.join(dir, "webhooks.json"), "utf8");
      expect(stored).not.toContain("https://example.com/secret-hook");
      expect(new WebhookNotificationEngine(dir).getWebhooks("a")).toHaveLength(2);
      vi.stubEnv("TENANT_KEYS_SECRET", "wrong-key");
      expect(() => new WebhookNotificationEngine(dir)).toThrow();
      expect(fs.readFileSync(path.join(dir, "webhooks.json"), "utf8")).toBe(stored);
      vi.stubEnv("TENANT_KEYS_SECRET", "test-only-webhook-encryption-secret");
      transport(500);
      const results = await engine.testWebhook("a", first.id);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ webhookId: first.id, success: false });
      expect(engine.getWebhooks("a")[0]).toMatchObject({ enabled: false, triggerCount: 0 });
    } finally { fs.removeSync(dir); }
  });
});
