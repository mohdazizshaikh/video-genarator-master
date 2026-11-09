import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { publicationFixture } from "../server/testing/publicationFixture";
import { PublishExecutionStore } from "../db/PublishExecutionStore";
const project = path.resolve(__dirname, "../..");
let directory: string;
let fixture: Awaited<ReturnType<typeof publicationFixture>>;
beforeEach(async () => {
  vi.stubEnv("TENANT_KEYS_SECRET", "isolated-reconciliation-key");
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "migration-ownership-")); fixture = await publicationFixture(directory);
});
afterEach(() => { vi.unstubAllEnvs(); fs.removeSync(directory); });
function inspect() {
  const code = `import {inspectMigrationData} from ${JSON.stringify(pathToFileURL(path.join(project, "scripts/migrations/inspect-data.mjs")).href)};console.log(JSON.stringify(inspectMigrationData(process.argv[1])));`;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", code, directory], { env: { PATH: process.env.PATH || "" }, encoding: "utf8", timeout: 10000 });
  expect(result.status, result.stderr).toBe(0);
  return { output: JSON.parse(result.stdout), raw: result.stdout };
}
function change(file: string, mutation: (value: Record<string, any>) => void) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const location = path.join(directory, file); const value = fs.readJsonSync(location); mutation(value); fs.writeJsonSync(location, value);
}
function codes() { return inspect().output.issues.map((issue: { code: string }) => issue.code); }
describe("read-only migration ownership graph", () => {
  it("covers actual wrapped release/connector/version data and derives attempt ownership from its job", async () => {
    await fixture.jobs.addAttempt({ publishJobId: fixture.job.id, attemptNumber: 1, status: "success", responseBody: "private-provider-response" });
    const execution = new PublishExecutionStore(directory); execution.prepare(fixture.binding, fixture.job.id);
    const result = inspect(); expect(result.output.pass).toBe(true);
    expect(result.output.stores.find((store: { name: string }) => store.name === "publishAttempts.json").tenantKeyCounts).toEqual({ A: 1 });
    expect(result.raw).not.toContain("private-provider-response"); expect(result.raw).not.toContain("test-only-publication-token");
  });
  it("rejects cross-workspace destinations and secrets without rewriting their owners", () => {
    change("connectors.json", (value) => { value.connectors[0].workspaceId = "B"; });
    const before = fs.readFileSync(path.join(directory, "connectors.json"), "utf8");
    expect(codes()).toContain("cross_workspace_or_ambiguous_reference");
    expect(fs.readFileSync(path.join(directory, "connectors.json"), "utf8")).toBe(before);
  });
  it("reports orphan attempts instead of inventing direct ownership", async () => {
    await fixture.jobs.addAttempt({ publishJobId: "missing-job", attemptNumber: 1, status: "failed" });
    expect(codes()).toContain("orphan_or_ambiguous_publish_attempt");
  });
  it("rejects ambiguous attempt/job identities across workspaces", async () => {
    await fixture.jobs.addAttempt({ publishJobId: fixture.job.id, attemptNumber: 1, status: "failed" });
    change("publishJobs.json", (value) => { value.push({ ...value[0], tenantId: "B" }); });
    expect(codes()).toContain("orphan_or_ambiguous_publish_attempt");
  });
  it("checks execution target/job/content bindings", () => {
    const executions = new PublishExecutionStore(directory); executions.prepare(fixture.binding, fixture.job.id);
    change("publish-executions.json", (value) => { value[0].contentDigest = "changed"; value[0].destinationId = "changed"; });
    expect(codes()).toContain("execution_approval_mismatch"); expect(codes()).toContain("execution_target_mismatch");
  });
  it("rejects malformed wrapper shapes and duplicate owned identities", () => {
    change("releases.json", (value) => { value.targets.push({ ...value.targets[0] }); });
    expect(codes()).toContain("duplicate_owned_identity");
    fs.writeJsonSync(path.join(directory, "content-versions.json"), []);
    expect(codes()).toContain("invalid_store_shape");
  });
  it("does not print plaintext/opaque secret payloads even when their envelope is invalid", () => {
    change("connector-secrets.json", (value) => { value[0].encrypted = "DO-NOT-PRINT-SECRET"; value[0].accessToken = "DO-NOT-PRINT-PLAINTEXT"; });
    const result = inspect(); expect(result.raw).not.toContain("DO-NOT-PRINT"); expect(codes()).toContain("invalid_encrypted_secret_envelope");
  });
  it("does not silently classify unknown top-level or nested JSON stores as shared", () => {
    fs.writeJsonSync(path.join(directory, "new-unknown.json"), [{ token: "PRIVATE-CONTENT" }]);
    fs.ensureDirSync(path.join(directory, "new-space")); fs.writeJsonSync(path.join(directory, "new-space/data.json"), []);
    expect(inspect().output.unknownStores).toEqual(expect.arrayContaining(["new-unknown.json", "new-space/data.json"]));
    expect(inspect().raw).not.toContain("PRIVATE-CONTENT");
  });
  it("cross-checks owners against an explicitly present workspace registry", () => {
    fs.writeJsonSync(path.join(directory, "auth-tenants.json"), [{ id: "B", apiKey: "DO-NOT-PRINT-KEY" }]);
    expect(codes()).toContain("owner_absent_from_workspace_registry"); expect(inspect().raw).not.toContain("DO-NOT-PRINT-KEY");
  });
});
function namespace(tenantId = "A") {
  const key = crypto.createHash("sha256").update(tenantId).digest("hex"); const location = path.join(directory, "tenant-state", key);
  fs.ensureDirSync(location); fs.writeJsonSync(path.join(location, "workspace-owner.json"), { tenantId, schemaVersion: 1 });
  return location;
}
describe("explicit workspace directory provenance", () => {
  it("covers nested snapshots using a matching owner marker without returning snapshot values", () => {
    const location = namespace(); fs.ensureDirSync(path.join(location, "nested")); fs.writeJsonSync(path.join(location, "nested/engine.json"), { tenantId: "A", apiKey: "PRIVATE-ENGINE-KEY" });
    expect(inspect().output.pass).toBe(true); expect(inspect().raw).not.toContain("PRIVATE-ENGINE-KEY");
  });
  it("rejects marker/hash and nested-owner conflicts", () => {
    const location = namespace(); fs.writeJsonSync(path.join(location, "engine.json"), { nested: { workspaceId: "B" } });
    expect(codes()).toContain("conflicting_directory_owner");
    fs.writeJsonSync(path.join(location, "workspace-owner.json"), { tenantId: "B", schemaVersion: 1 });
    expect(codes()).toContain("workspace_owner_marker_mismatch");
  });
  it("does not follow symlinks inside a workspace namespace", () => {
    const location = namespace(); fs.symlinkSync(path.join(directory, "publishJobs.json"), path.join(location, "linked.json"));
    expect(codes()).toContain("symlink_not_inspected");
  });
});

it("reports runtime Whisper source as an explicit exclusion without hiding unknown application namespaces", () => {
  fs.ensureDirSync(path.join(directory, "libs/whisper")); fs.writeJsonSync(path.join(directory, "libs/whisper/package.json"), { dependency: true });
  fs.ensureDirSync(path.join(directory, "libs/new-application")); fs.writeJsonSync(path.join(directory, "libs/new-application/state.json"), []);
  const result = inspect().output;
  expect(result.excludedNamespaces).toEqual([{ name: "libs/whisper", reason: "runtime_dependency_source", ownershipAssessed: false }]);
  expect(result.unknownStores).toContain("libs/new-application/state.json"); expect(result.unknownStores).not.toContain("libs/whisper/package.json");
});
it("uses the same ownership issues and hashes in the reconciliation CLI", () => {
  const result = spawnSync(process.execPath, [path.join(project, "scripts/migrations/reconcile.mjs")], { cwd: directory, env: { PATH: process.env.PATH || "", DATA_DIR_PATH: directory }, encoding: "utf8", timeout: 10000 });
  expect(result.status).toBe(0);
  const report = JSON.parse(result.stdout); const snapshot = inspect().output;
  expect(report.stores).toEqual(snapshot.stores); expect(report.issues).toEqual(snapshot.issues);
  expect(report.readyForPrimaryReadCutover).toBe(false);
});

describe("reviewed legacy-store ownership policies", () => {
  it("recognizes explicit source/rule owners and profile identities without exposing credentials", () => {
    fs.writeJsonSync(path.join(directory, "customNewsSources.json"), [{ id: "source", tenantId: "A", url: "PRIVATE-FEED" }]);
    fs.writeJsonSync(path.join(directory, "contentAutomationRules.json"), [{ id: "rule", tenantId: "A" }]);
    fs.writeJsonSync(path.join(directory, "tenants.json"), [{ id: "A", apiKeys: {}, encryptedApiKeys: { provider: Buffer.alloc(48, 1).toString("base64") } }]);
    const result = inspect(); expect(result.output.pass).toBe(true);
    expect(result.output.unknownStores).toEqual([]); expect(result.raw).not.toContain("PRIVATE-FEED");
    fs.writeJsonSync(path.join(directory, "tenants.json"), [{ id: "A", apiKeys: { provider: "PRIVATE-TOKEN" } }]);
    expect(codes()).toContain("plaintext_or_invalid_credentials"); expect(inspect().raw).not.toContain("PRIVATE-TOKEN");
  });
  it("blocks missing owners, duplicate identities, absent registry profiles and invalid encryption", () => {
    fs.writeJsonSync(path.join(directory, "customNewsSources.json"), [{ id: "source" }]);
    fs.writeJsonSync(path.join(directory, "contentAutomationRules.json"), [{ id: "rule", tenantId: "A" }, { id: "rule", tenantId: "A" }]);
    fs.writeJsonSync(path.join(directory, "tenants.json"), [{ id: "B", apiKeys: {}, encryptedApiKeys: { provider: "invalid" } }]);
    fs.writeJsonSync(path.join(directory, "auth-tenants.json"), [{ id: "A" }]);
    expect(codes()).toEqual(expect.arrayContaining(["missing_owner", "duplicate_owned_identity", "owner_absent_from_workspace_registry", "invalid_encrypted_secret_envelope"]));
  });
  it("checks branding map owners and excludes only the matching default platform template from registry checks", () => {
    fs.writeJsonSync(path.join(directory, "auth-tenants.json"), [{ id: "A" }]);
    fs.writeJsonSync(path.join(directory, "branding.json"), { default: { tenantId: "default" }, A: { tenantId: "A", name: "PRIVATE-BRAND" } });
    expect(inspect().output.pass).toBe(true); expect(inspect().raw).not.toContain("PRIVATE-BRAND");
    fs.writeJsonSync(path.join(directory, "branding.json"), { A: { tenantId: "B" } });
    expect(codes()).toContain("workspace_map_owner_mismatch");
  });
  it("keeps global learning models and mutable libraries blocked without guessing seed provenance", () => {
    for (const [file, value] of Object.entries({ "ai-learning-model.json": { version: 1 }, "hook-library.json": [{ id: "hook_builtin_1", text: "PRIVATE-HOOK" }], "knowledge-base.json": [{ id: "builtin", description: "PRIVATE-KNOWLEDGE" }] })) fs.writeJsonSync(path.join(directory, file), value);
    const before = fs.readFileSync(path.join(directory, "hook-library.json"));
    const result = inspect(); expect(result.output.unknownStores).toEqual([]);
    expect(result.output.issues.filter((issue: { code: string }) => issue.code === "legacy_state_requires_provenance")).toHaveLength(3);
    expect(result.raw).not.toContain("PRIVATE-"); expect(fs.readFileSync(path.join(directory, "hook-library.json"))).toEqual(before);
  });
  it("recognizes the runtime workspace learning-model map but validates its structure and owners", () => {
    const model = { version: 1, updatedAt: "2026-10-28T00:00:00Z", weights: { successRate: 0.5, engagementRate: 0.3, speedScore: 0.2 }, metrics: { accuracy: 0.5, drift: 0, biasRisk: "low" }, samples: 0 };
    fs.writeJsonSync(path.join(directory, "ai-learning-model.json"), { A: model });
    expect(inspect().output.pass).toBe(true);
    fs.writeJsonSync(path.join(directory, "ai-learning-model.json"), { A: { ...model, tenantId: "B", samples: "invalid" } });
    expect(codes()).toEqual(expect.arrayContaining(["conflicting_owner_fields", "invalid_learning_model_shape"]));
  });
  it("accepts only host telemetry shape and never emits filesystem paths or extra content", () => {
    const snapshot = { timestamp: "2026-10-28T00:00:00Z", uptime: 1, cpu: { loadAvg1m: 0, loadAvg5m: 0, loadAvg15m: 0, cores: 1, usagePercent: 0 }, memory: { totalMb: 1, freeMb: 1, usedMb: 0, usagePercent: 0 }, disk: { totalMb: 1, freeMb: 1, usedMb: 0, usagePercent: 0, path: "PRIVATE-DISK-PATH" } };
    fs.writeJsonSync(path.join(directory, "resource-snapshots.json"), [snapshot]);
    expect(inspect().output.pass).toBe(true); expect(inspect().raw).not.toContain("PRIVATE-DISK-PATH");
    fs.writeJsonSync(path.join(directory, "resource-snapshots.json"), [{ ...snapshot, tenantId: "A" }]);
    expect(codes()).toContain("invalid_platform_telemetry");
    fs.writeJsonSync(path.join(directory, "resource-snapshots.json"), [{ ...snapshot, cpu: { ...snapshot.cpu, token: "PRIVATE" } }]);
    expect(codes()).toContain("invalid_platform_telemetry");
  });
});

it("keeps recognized legacy namespaces blocked on missing migration mappings", () => {
  fs.writeJsonSync(path.join(directory, "customNewsSources.json"), []);
  fs.writeJsonSync(path.join(directory, "resource-snapshots.json"), []);
  const result = spawnSync(process.execPath, [path.join(project, "scripts/migrations/readiness.mjs")], { cwd: directory, env: { PATH: process.env.PATH || "", DATA_DIR_PATH: directory }, encoding: "utf8", timeout: 10000 });
  const output = JSON.parse(result.stdout);
  expect(result.status).toBe(2);
  expect(output.checks.namespaceCoverage.pass).toBe(false);
  expect(output.checks.namespaceCoverage.unreviewedNamespaces).toEqual(expect.arrayContaining(["customNewsSources.json", "resource-snapshots.json"]));
});

it.each(["customNewsSources.json", "contentAutomationRules.json", "tenants.json", "branding.json", "ai-learning-model.json", "hook-library.json", "knowledge-base.json", "resource-snapshots.json"])("blocks invalid reviewed store shape without rewriting %s", (file) => {
  fs.writeJsonSync(path.join(directory, file), null);
  const before = fs.readFileSync(path.join(directory, file));
  const result = inspect();
  expect(result.output.pass).toBe(false);
  expect(result.output.unknownStores).toEqual([]);
  expect(result.output.issues.some((issue: { file: string }) => issue.file === file)).toBe(true);
  expect(fs.readFileSync(path.join(directory, file))).toEqual(before);
});

it("rejects profile IDs that conflict with explicit owner fields", () => {
  fs.writeJsonSync(path.join(directory, "tenants.json"), [{ id: "A", tenantId: "B", apiKeys: {} }]);
  expect(codes()).toContain("conflicting_profile_owner");
});
