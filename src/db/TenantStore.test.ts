import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { TenantStore } from "./TenantStore";

describe("TenantStore", () => {
  it("rejects cross-tenant reads and updates", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "tenant-store-isolation-"));
    const store = new TenantStore(base);
    const first = await store.create({ workspaceName: "first", tier: "free" });
    const second = await store.create({ workspaceName: "second", tier: "pro" });

    expect(await store.listForTenant(first.id)).toEqual([first]);
    expect(await store.getForTenant(first.id, second.id)).toBeUndefined();
    expect(await store.updateEngineConfigForTenant(first.id, second.id, {
      youtube: { enabled: true },
    })).toBeUndefined();
    expect((await store.get(second.id))?.engineConfig).toEqual({});
  });

  it("creates tenant and updates keys + engine config", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "tenant-store-"));
    const store = new TenantStore(base);

    const tenant = await store.create({ workspaceName: "ws", tier: "free" });
    expect(tenant.workspaceName).toBe("ws");

    const withKeys = await store.updateKeys(tenant.id, { youtube: "abc" });
    expect(withKeys?.apiKeys.youtube).toBe("abc");

    const withEngine = await store.updateEngineConfig(tenant.id, {
      youtube: { enabled: true, channelId: "ch1" },
    });
    expect(withEngine?.engineConfig.youtube?.enabled).toBe(true);
  });
});
