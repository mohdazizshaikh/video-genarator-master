import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Config } from "../../config";
import { SystemEnginesRouter } from "./systemengines";
import { TenantRouter } from "./tenants";
import { PublishRouter } from "./publish";
import { BrandingRouter } from "./branding";
import { AuthEngine } from "../../services/AuthEngine";
import { dispatch } from "../testing/dispatch";

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "security-regression-"));
});
afterEach(() => {
  fs.removeSync(dir);
  vi.unstubAllEnvs();
});
const owner = { tenantId: "workspace-A" };
function system() {
  return new SystemEnginesRouter({ dataDirPath: dir } as Config).router;
}

describe("system engine security boundary", () => {
  it.each([
    ["GET", "/assets"],
    ["GET", "/assets/stats"],
    ["POST", "/assets"],
    ["PATCH", "/assets/example/tags"],
    ["DELETE", "/assets/example"],
    ["GET", "/compliance/logs"],
    ["GET", "/compliance/critical"],
    ["POST", "/compliance/log"],
    ["POST", "/compliance/report"],
  ])("denies anonymous %s %s before invoking handlers", async (method, url) => {
    expect((await dispatch(system(), method, url)).status).toBe(401);
  });

  it("isolates asset mutations and lists between workspaces", async () => {
    const router = system();
    const created = await dispatch(router, "POST", "/assets", {
      auth: owner,
      body: { name: "A asset", type: "image", tags: [], filePath: "" },
    });
    expect(created.status).toBe(201);
    const id = (created.body as { data: { id: string } }).data.id;
    const other = { tenantId: "workspace-B" };
    expect(
      (await dispatch(router, "GET", "/assets", { auth: other })).body,
    ).toMatchObject({ data: [] });
    expect(
      (await dispatch(router, "DELETE", `/assets/${id}`, { auth: other }))
        .status,
    ).toBe(404);
    expect(
      (await dispatch(router, "GET", "/assets", { auth: owner })).body,
    ).toMatchObject({ data: [{ id }] });
  });

  it("derives compliance ownership from auth, not body or query", async () => {
    const router = system();
    const result = await dispatch(router, "POST", "/compliance/log", {
      auth: owner,
      body: {
        action: "settings_changed",
        tenantId: "workspace-B",
        details: { private: true },
      },
    });
    expect(result.body).toMatchObject({ data: { tenantId: owner.tenantId } });
    expect(
      (
        await dispatch(router, "GET", "/compliance/logs?tenantId=workspace-A", {
          auth: { tenantId: "workspace-B" },
        })
      ).body,
    ).toMatchObject({ data: [] });
  });

  it("public signup cannot buy enterprise permissions or expose key hashes", async () => {
    const response = await dispatch(system(), "POST", "/auth/register", {
      body: { name: "User", email: "user@example.invalid", plan: "enterprise" },
    });
    expect(response.status).toBe(201);
    const tenant = (
      response.body as { data: { tenant: Record<string, unknown> } }
    ).data.tenant;
    expect(tenant.plan).toBe("free");
    expect(tenant).not.toHaveProperty("apiKeyHash");
    expect(tenant).not.toHaveProperty("apiKey");
  });
});

describe("branding ownership", () => {
  it.each([
    ["GET", "/workspace-B"],
    ["GET", "/workspace-B/css"],
    ["PUT", "/workspace-B"],
    ["POST", "/workspace-B/reset"],
  ])("rejects A calling %s %s", async (method, url) => {
    const router = new BrandingRouter({ dataDirPath: dir } as Config).router;
    expect((await dispatch(router, method, url, { auth: owner })).status).toBe(
      404,
    );
  });
  it("lists only the caller branding", async () => {
    const router = new BrandingRouter({ dataDirPath: dir } as Config).router;
    await dispatch(router, "POST", "/workspace-B/reset", {
      auth: { tenantId: "workspace-B" },
    });
    const response = await dispatch(router, "GET", "/", { auth: owner });
    expect(
      Object.keys((response.body as { branding: object }).branding),
    ).toEqual([owner.tenantId]);
  });
});

describe("revocable auth sessions", () => {
  it("suspension and key rotation invalidate existing signed tokens across instances", () => {
    vi.stubEnv(
      "JWT_SECRET",
      "isolated-regression-signing-secret-32-characters",
    );
    const engine = new AuthEngine(dir);
    const registered = engine.registerTenant("User", "user@example.invalid");
    const token = engine.authenticate(registered.plainApiKey).token!;
    expect(new AuthEngine(dir).verifyToken(token)?.tenantId).toBe(
      registered.tenant.id,
    );
    new AuthEngine(dir).suspendTenant(registered.tenant.id);
    expect(engine.verifyToken(token)).toBeNull();
    new AuthEngine(dir).activateTenant(registered.tenant.id);
    expect(engine.verifyToken(token)).toBeNull();
    const current = engine.authenticate(registered.plainApiKey).token!;
    expect(engine.verifyToken(current)).not.toBeNull();
    new AuthEngine(dir).rotateCredentials(registered.tenant.id);
    expect(engine.verifyToken(current)).toBeNull();
  });
});

describe("legacy publish boundary", () => {
  it("cannot queue arbitrary paths or create unapproved publish records", async () => {
    const router = new PublishRouter({
      dataDirPath: dir,
      redisEnabled: true,
    } as Config).router;
    const response = await dispatch(router, "POST", "/", {
      auth: owner,
      body: {
        renderOutputPath: "/private/foreign.mp4",
        platform: "telegram",
        channelId: "unapproved",
        title: "Unapproved",
      },
    });
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: "APPROVED_RELEASE_REQUIRED" });
    const storePath = path.join(dir, "publishJobs.json");
    if (fs.existsSync(storePath))
      expect(fs.readJsonSync(storePath)).toEqual([]);
  });
});

describe("workspace entitlement bootstrap", () => {
  it("uses the verified plan and prevents tenants from increasing quota limits", async () => {
    vi.stubEnv("TENANT_KEYS_SECRET", "isolated-tenant-key-encryption-secret-with32characters");
    const router = new TenantRouter({ dataDirPath: dir } as Config).router;
    const result = await dispatch(router, "POST", "/bootstrap", { auth: { ...owner, plan: "free" }, body: { workspaceName: "Workspace", tier: "enterprise" } });
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({ tier: "free" });
    expect((await dispatch(router, "POST", `/${owner.tenantId}/quotas`, { auth: owner, body: { quotas: { maxDailyVideos: 100000 } } })).status).toBe(403);
  });
});
