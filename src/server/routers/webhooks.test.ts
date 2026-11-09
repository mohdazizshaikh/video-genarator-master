import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Config } from "../../config";
import { WebhookNotificationEngine } from "../../services/WebhookNotificationEngine";
import { WebhooksRouter } from "./webhooks";
import { dispatch } from "../testing/dispatch";

let directory: string;
let router: WebhooksRouter["router"];
let engine: WebhookNotificationEngine;
const owner = { tenantId: "owner" };
const input = { name: "Alerts", channel: "custom", events: ["video.ready"], customUrl: "https://example.com/private-token", customHeaders: { Authorization: "Bearer test-secret" } };
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "webhook-routes-"));
  vi.stubEnv("TENANT_KEYS_SECRET", "test-only-key");
  engine = new WebhookNotificationEngine(directory, async () => [{ address: "8.8.8.8", family: 4 }]);
  router = new WebhooksRouter({ dataDirPath: directory } as Config, engine).router;
});
afterEach(() => { fs.removeSync(directory); vi.unstubAllEnvs(); });
describe("webhook HTTP validation contract", () => {
  it("requires an authenticated workspace before CRUD and test routes", async () => {
    expect((await dispatch(router, "POST", "/", { body: input })).status).toBe(401);
    expect((await dispatch(router, "POST", "/missing/test")).status).toBe(401);
  });
  it("rejects bad config and destinations with 400 without writing or reflecting secrets", async () => {
    for (const fields of [{ customUrl: "https://127.0.0.1/secret" }, { channel: "bogus" }, { events: ["bogus"] }, { customHeaders: { Host: "internal" } }, { customHeaders: { Authorization: 55 } }, { name: {} }]) {
      const result = await dispatch(router, "POST", "/", { auth: owner, body: { ...input, ...fields } });
      expect(result.status).toBe(400);
      expect(JSON.stringify(result.body)).not.toContain("test-secret");
    }
    expect(fs.existsSync(path.join(directory, "webhooks.json"))).toBe(false);
  });
  it("returns masked records, ignores immutable edits, and preserves masked secrets", async () => {
    const created = await dispatch(router, "POST", "/", { auth: owner, body: input });
    expect(created.status).toBe(201);
    const hook = (created.body as { webhook: { id: string; customUrl: string } }).webhook;
    expect(hook.customUrl).toBe("[configured]");
    const updated = await dispatch(router, "PUT", `/${hook.id}`, { auth: owner, body: { name: "Renamed", tenantId: "other", id: "forged", triggerCount: 700, customUrl: "[configured]" } });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ webhook: { id: hook.id, tenantId: "owner", triggerCount: 0, customUrl: "[configured]" } });
    expect((await dispatch(router, "GET", "/", { auth: { tenantId: "other" } })).body).toEqual({ webhooks: [] });
    expect(JSON.stringify(fs.readJsonSync(path.join(directory, "webhooks.json")))).not.toContain("private-token");
    expect((await dispatch(router, "PUT", `/${hook.id}`, { auth: owner, body: { customUrl: "http://example.com" } })).status).toBe(400);
  });
  it("uses 404 for missing and foreign test targets without dispatch", async () => {
    const created = await engine.addWebhook({ ...input, channel: "custom", events: ["video.ready"], enabled: true, tenantId: "other" });
    expect((await dispatch(router, "POST", `/${created.id}/test`, { auth: owner })).status).toBe(404);
    expect((await dispatch(router, "POST", "/missing/test", { auth: owner })).status).toBe(404);
    expect(engine.getLogs("other")).toEqual([]);
  });
  it("rejects invalid notification payloads and reports missing storage configuration", async () => {
    expect((await dispatch(router, "POST", "/notify", { auth: owner, body: { event: "bogus", title: {}, message: "test" } })).status).toBe(400);
    vi.stubEnv("TENANT_KEYS_SECRET", "");
    expect((await dispatch(router, "POST", "/", { auth: owner, body: input })).status).toBe(503);
    expect(engine.getWebhooks("owner")).toEqual([]);
  });
});
