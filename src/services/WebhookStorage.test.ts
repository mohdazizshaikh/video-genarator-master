import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebhookNotificationEngine } from "./WebhookNotificationEngine";
import { CryptoService } from "./CryptoService";

let directory: string;
const key = "test-only-migration-key";
const legacy = { tenantId: "a", id: "legacy-owned", name: "Old hook", channel: "custom", enabled: false, events: ["video.ready"], createdAt: "2025-01-01T00:00:00Z", triggerCount: 2, customUrl: "https://example.com/secret-path", customHeaders: { Authorization: "Bearer legacy-secret" } };
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "webhook-migration-"));
  vi.stubEnv("TENANT_KEYS_SECRET", key);
});
afterEach(() => { fs.removeSync(directory); vi.unstubAllEnvs(); });
describe("webhook legacy storage compatibility", () => {
  it("encrypts existing fields and preserves quarantined unowned records on next save", () => {
    const records = [legacy, { ...legacy, id: "unowned", tenantId: undefined }];
    const file = path.join(directory, "webhooks.json");
    fs.writeJsonSync(file, records);
    const engine = new WebhookNotificationEngine(directory);
    expect(engine.getWebhooks("a")).toHaveLength(1);
    engine.toggleWebhook("a", legacy.id);
    const stored = fs.readJsonSync(file);
    expect(stored.schemaVersion).toBe(1);
    expect(fs.readFileSync(file, "utf8")).not.toMatch(/legacy-secret|secret-path/);
    const decrypted = JSON.parse(new CryptoService(key).decrypt(stored.encrypted));
    expect(decrypted[0]).toMatchObject({ ...legacy, enabled: true });
    expect(decrypted[1]).toMatchObject({ id: "unowned", customHeaders: legacy.customHeaders });
    expect(new WebhookNotificationEngine(directory).getWebhooks("a")).toHaveLength(1);
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
  });
  it("preserves legacy bytes and in-memory config if encryption is unavailable", () => {
    const file = path.join(directory, "webhooks.json");
    fs.writeJsonSync(file, [legacy]);
    const before = fs.readFileSync(file, "utf8");
    vi.stubEnv("TENANT_KEYS_SECRET", "");
    const engine = new WebhookNotificationEngine(directory);
    expect(() => engine.toggleWebhook("a", legacy.id)).toThrow("unavailable");
    expect(engine.getWebhooks("a")[0].enabled).toBe(false);
    expect(fs.readFileSync(file, "utf8")).toBe(before);
  });
  it("does not overwrite malformed configuration or logs", () => {
    for (const name of ["webhooks.json", "webhook-logs.json"]) {
      const file = path.join(directory, name);
      fs.writeFileSync(file, "{bad-json");
      expect(() => new WebhookNotificationEngine(directory)).toThrow();
      expect(fs.readFileSync(file, "utf8")).toBe("{bad-json");
      fs.removeSync(file);
    }
  });
});
