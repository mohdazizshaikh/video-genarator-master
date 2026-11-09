import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { TenantStore } from "./TenantStore";
let directory: string;
beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), "tenant-store-safety-")); });
afterEach(() => { vi.restoreAllMocks(); fs.removeSync(directory); });
it.each(["", "{broken", "{}", "[null]", "[[]]", '[{"id":""}]', '[{"id":"A"},{"id":"A"}]'])("preserves invalid profile data during reads and rejected mutations: %j", async (content) => {
  const store = new TenantStore(directory), file = path.join(directory, "tenants.json"); fs.writeFileSync(file, content);
  new TenantStore(directory);
  await expect(store.list()).rejects.toThrow();
  await expect(store.create({ workspaceName: "Workspace", tier: "free" })).rejects.toThrow();
  await expect(store.updateEncryptedKeys("A", { provider: "opaque" })).rejects.toThrow();
  await expect(store.updateWorkspaceForTenant("A", "A", { workspaceName: "changed" })).rejects.toThrow();
  await expect(store.updateQuotas("A", { monthlyRenders: 1 })).rejects.toThrow();
  expect(fs.readFileSync(file, "utf8")).toBe(content);
});
it("retains concurrent creates from independent instances and rejects duplicate identities", async () => {
  const first = new TenantStore(directory), second = new TenantStore(directory);
  await Promise.all([first.create({ id: "A", workspaceName: "A", tier: "free" }), second.create({ id: "B", workspaceName: "B", tier: "free" })]);
  expect((await first.list()).map((row) => row.id)).toEqual(["A", "B"]);
  const duplicates = await Promise.allSettled([first.create({ id: "C", workspaceName: "C", tier: "free" }), second.create({ id: "C", workspaceName: "duplicate", tier: "free" })]);
  expect(duplicates.map((row) => row.status)).toEqual(["fulfilled", "rejected"]);
  expect((await first.list()).filter((row) => row.id === "C")).toHaveLength(1);
});
it("merges interleaved profile, credential, engine and quota updates without losing unrelated changes", async () => {
  const first = new TenantStore(directory), second = new TenantStore(directory);
  await first.create({ id: "A", workspaceName: "before", tier: "free", encryptedApiKeys: { obsolete: "old" } });
  await Promise.all([
    first.updateWorkspaceForTenant("A", "A", { workspaceName: "after" }),
    second.updateEncryptedKeysForTenant("A", "A", { youtube: "encrypted-one" }),
    first.updateEncryptedKeysForTenant("A", "A", { telegram: "encrypted-two" }),
    second.deleteEncryptedKeyForTenant("A", "A", "obsolete"),
    first.updateEngineConfig("A", { youtube: { enabled: true } }),
    second.updateEngineConfig("A", { telegram: { enabled: true } }),
    first.updateQuotas("A", { monthlyRenders: 10 }),
    second.updateQuotas("A", { monthlyPublishes: 20 }),
  ]);
  expect(await second.get("A")).toMatchObject({ workspaceName: "after", encryptedApiKeys: { youtube: "encrypted-one", telegram: "encrypted-two" }, engineConfig: { youtube: { enabled: true }, telegram: { enabled: true } }, quotas: { monthlyRenders: 10, monthlyPublishes: 20 } });
  expect((await first.get("A"))?.encryptedApiKeys).not.toHaveProperty("obsolete");
});
it("preserves files and cleans staging when replacement fails", async () => {
  const store = new TenantStore(directory); await store.create({ id: "A", workspaceName: "original", tier: "free" });
  const file = path.join(directory, "tenants.json"), before = fs.readFileSync(file);
  vi.spyOn(fs, "renameSync").mockImplementation(() => { throw new Error("replacement failed"); });
  await expect(store.updateWorkspaceForTenant("A", "A", { workspaceName: "lost" })).rejects.toThrow("replacement failed");
  expect(fs.readFileSync(file)).toEqual(before); expect(fs.readdirSync(directory)).toEqual(["tenants.json"]);
});
it("rejects cross-workspace updates without writing and restricts new file permissions", async () => {
  const store = new TenantStore(directory); await store.create({ id: "A", workspaceName: "A", tier: "free" });
  const file = path.join(directory, "tenants.json"), before = fs.readFileSync(file);
  expect(await store.updateEncryptedKeysForTenant("B", "A", { provider: "forbidden" })).toBeUndefined();
  expect(await store.updateWorkspaceForTenant("B", "A", { workspaceName: "forbidden" })).toBeUndefined();
  expect(fs.readFileSync(file)).toEqual(before); expect(fs.statSync(file).mode & 0o777).toBe(0o600);
});
