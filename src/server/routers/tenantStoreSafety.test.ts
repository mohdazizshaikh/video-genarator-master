import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { TenantRouter } from "./tenants";
import { TenantStore } from "../../db/TenantStore";
import type { Config } from "../../config";
import { dispatch } from "../testing/dispatch";
let directory: string;
beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), "tenant-route-store-safety-")); vi.stubEnv("TENANT_KEYS_SECRET", "isolated-tenant-profile-test-key"); });
afterEach(() => { vi.unstubAllEnvs(); fs.removeSync(directory); });
const auth = { tenantId: "A" };
function router() { return new TenantRouter({ dataDirPath: directory } as Config).router; }
it("reports corruption as a bounded unavailable response without erasing bytes or leaking parse input", async () => {
  const routes = router(), file = path.join(directory, "tenants.json"), content = "{PRIVATE-BROKEN-PROFILE"; fs.writeFileSync(file, content);
  const result = await dispatch(routes, "GET", "/", { auth });
  expect(result.status).toBe(503); expect(result.body).toEqual({ error: "Workspace operation unavailable", code: "WORKSPACE_OPERATION_UNAVAILABLE" });
  expect(JSON.stringify(result.body)).not.toContain("PRIVATE-"); expect(fs.readFileSync(file, "utf8")).toBe(content);
});
it("makes simultaneous workspace bootstrap requests converge on one profile", async () => {
  const routes = router();
  const results = await Promise.all([dispatch(routes, "POST", "/bootstrap", { auth, body: { workspaceName: "first" } }), dispatch(routes, "POST", "/bootstrap", { auth, body: { workspaceName: "second" } })]);
  expect(results.map((result) => result.status).sort()).toEqual([200, 201]);
  const profiles = await new TenantStore(directory).list(); expect(profiles).toHaveLength(1); expect(profiles[0].id).toBe("A");
  expect(results[0].body).toEqual(results[1].body);
});
it("masks legacy plaintext and encrypted credentials in profile list/get responses", async () => {
  const store = new TenantStore(directory); const profile = await store.create({ id: "A", workspaceName: "A", tier: "free", encryptedApiKeys: { encrypted: "PRIVATE-CIPHERTEXT" } });
  fs.writeJsonSync(path.join(directory, "tenants.json"), [{ ...profile, apiKeys: { legacy: "PRIVATE-PLAINTEXT" } }]);
  const routes = router();
  for (const url of ["/", "/A"]) {
    const result = await dispatch(routes, "GET", url, { auth }); expect(result.status).toBe(200);
    expect(JSON.stringify(result.body)).not.toContain("PRIVATE-");
    expect(JSON.stringify(result.body)).toContain("••••");
  }
  expect((await store.get("A"))?.apiKeys.legacy).toBe("PRIVATE-PLAINTEXT");
});
