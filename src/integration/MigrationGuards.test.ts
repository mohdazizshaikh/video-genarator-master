import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
const project = path.resolve(__dirname, "../..");
let directory: string;
let data: string;
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "migration-guard-")); data = path.join(directory, "data");
  fs.ensureDirSync(data); fs.ensureDirSync(path.join(directory, "migrations"));
  fs.writeFileSync(path.join(directory, "migrations/001_fixture.sql"), "SELECT 1;");
  for (const name of ["apply.mjs", "artifacts.mjs", "readiness.mjs", "ownership-policy.mjs", "inspect-data.mjs"]) fs.copyFileSync(path.join(project, "scripts/migrations", name), path.join(directory, name));
});
afterEach(() => fs.removeSync(directory));
function environment(extra: Record<string, string> = {}) {
  return { PATH: process.env.PATH || "", DATA_DIR_PATH: data, DATABASE_URL: "postgres://fixture:secret@127.0.0.1/isolated", MINIO_ENDPOINT: "http://127.0.0.1:9000", MINIO_ACCESS_KEY: "fixture-access", MINIO_SECRET_KEY: "fixture-secret", MINIO_BUCKET: "fixture-bucket", MIGRATION_EXECUTE: "false", MIGRATION_BACKUP_APPROVED: "true", MIGRATION_RECONCILIATION_APPROVED: "true", MIGRATION_ROLLBACK_APPROVED: "true", MIGRATION_LOCK_OWNER: "fixture-operator", RELEASE_CONTROL_PRIMARY_READS: "false", ...extra };
}
function run(name: string, extra: Record<string, string> = {}) {
  const result = spawnSync(process.execPath, [path.join(directory, name)], { cwd: directory, env: environment(extra), encoding: "utf8", timeout: 10000 });
  expect(result.error).toBeUndefined();
  const output = JSON.parse(result.stdout || result.stderr);
  return { ...result, output };
}
function manifest(owner = "A", key = "A/video/fixture.mp4") {
  const localPath = path.join(data, "fixture.mp4"); fs.writeFileSync(localPath, "fixture bytes");
  return { id: "artifact42", tenantId: owner, localPath, objectKey: key, sizeBytes: 13, checksumSha256: crypto.createHash("sha256").update("fixture bytes").digest("hex") };
}
describe("migration safety entry points in an isolated project with no SDK modules", () => {
  it.each(["apply.mjs", "artifacts.mjs"])("%s reports blockers before loading an execution SDK", (name) => {
    if (name === "artifacts.mjs") fs.writeJsonSync(path.join(data, "artifact-manifests.json"), [manifest()]);
    const result = run(name);
    expect(result.status).toBe(2); expect(result.output.executed).toBe(false);
    expect(result.output.blockers).toContain("MIGRATION_EXECUTE must equal true");
    expect(result.stderr).not.toContain("ERR_MODULE_NOT_FOUND");
  });
  it("does not treat false approval text as approval", () => {
    const result = run("readiness.mjs", { MIGRATION_BACKUP_APPROVED: "false" });
    expect(result.status).toBe(2); expect(result.output.checks.approvals.pass).toBe(false); expect(result.output.readyForMigration).toBe(false);
  });
  it("includes primary-read authority safety in the final readiness decision", () => {
    const result = run("readiness.mjs", { RELEASE_CONTROL_PRIMARY_READS: "true" });
    expect(result.status).toBe(2); expect(result.output.blockers).toContain("authoritySafety");
  });
  it("blocks missing source data and malformed local checkpoints", () => {
    expect(run("readiness.mjs", { DATA_DIR_PATH: path.join(directory, "missing") }).output.checks.reconciliation.pass).toBe(false);
    fs.writeFileSync(path.join(data, "migration-checkpoints.json"), "{broken");
    expect(run("readiness.mjs").output.blockers).toContain("checkpointIntegrity");
    fs.writeJsonSync(path.join(data, "migration-checkpoints.json"), [{ name: "001_fixture.sql", checksum: "a" }, { name: "001_fixture.sql", checksum: "b" }]);
    expect(run("readiness.mjs").output.blockers).toContain("checkpointIntegrity");
  });
  it.each(["releases.json", "publish-executions.json", "schedules.json", "tenant-state/"])("blocks unreviewed namespace coverage for %s", (name) => {
    if (name.endsWith("/")) fs.ensureDirSync(path.join(data, name)); else fs.writeJsonSync(path.join(data, name), []);
    const result = run("readiness.mjs"); expect(result.status).toBe(2); expect(result.output.blockers).toContain("namespaceCoverage");
  });
  it("can pass local structural gates without claiming connectivity or enabling cutover", () => {
    const result = run("readiness.mjs"); expect(result.status).toBe(0);
    expect(result.output).toMatchObject({ readyForMigration: true, readyForPrimaryReadCutover: false, authoritativeStore: "file-backed" });
    expect(fs.readdirSync(data)).toEqual([]);
  });
  it("rejects a symlink escape without loading the object-store client", () => {
    const record = manifest(); const external = path.join(directory, "outside.mp4"); fs.writeFileSync(external, "fixture bytes");
    const link = path.join(data, "link.mp4"); fs.symlinkSync(external, link); record.localPath = link;
    fs.writeJsonSync(path.join(data, "artifact-manifests.json"), [record]);
    const result = run("artifacts.mjs"); expect(result.status).toBe(2); expect(result.output.records[0].errors).toContain("localPath is outside DATA_DIR_PATH");
  });
  it("rejects duplicate object identities and sanitized owner-prefix collisions", () => {
    const a = manifest("A:B", "A-B/video/a.mp4"), b = { ...a, id: "artifact43", tenantId: "A/B", objectKey: "A-B/video/b.mp4" };
    fs.writeJsonSync(path.join(data, "artifact-manifests.json"), [a, b]);
    expect(run("artifacts.mjs").output.records[1].errors).toContain("sanitized tenant prefix collides with another owner");
    fs.writeJsonSync(path.join(data, "artifact-manifests.json"), [a, { ...a }]);
    expect(run("artifacts.mjs").output.records[1].errors).toContain("objectKey is duplicated");
  });
});
function fakeDatabase() {
  const modulePath = path.join(directory, "node_modules/pg"); fs.ensureDirSync(modulePath);
  fs.writeJsonSync(path.join(modulePath, "package.json"), { type: "module", exports: "./index.js" });
  fs.writeFileSync(path.join(modulePath, "index.js"), `import fs from "node:fs";
const trace = (sql) => fs.appendFileSync(process.env.TRACE_FILE, JSON.stringify(sql) + "\\n");
export default { Client: class {
 async connect() { trace("CONNECT"); }
 async query(sql) { trace(sql);
  if (sql.includes("pg_try_advisory_lock")) return { rows: [{ acquired: process.env.TEST_LOCK !== "busy" }] };
  if (sql.startsWith("SELECT name")) return { rows: [] };
  if (sql === "SELECT 1;" && process.env.TEST_FAIL === "true") throw new Error(process.env.DATABASE_URL);
  return { rows: [] };
 }
 async end() { trace("END"); }
} };`);
}
describe("isolated fake database execution (no database socket)", () => {
  function execute(extra: Record<string, string> = {}) { fakeDatabase(); return run("apply.mjs", { MIGRATION_EXECUTE: "true", TRACE_FILE: path.join(directory, "trace.jsonl"), ...extra }); }
  function trace(): string[] { return fs.readFileSync(path.join(directory, "trace.jsonl"), "utf8").trim().split("\n").map((row) => JSON.parse(row)); }
  it("takes the runner lock before reading checkpoints and commits before releasing it", () => {
    const result = execute(); expect(result.status).toBe(0); expect(result.output.executed).toBe(true);
    const sql = trace(); expect(sql.findIndex((row) => row.includes("pg_try_advisory_lock"))).toBeLessThan(sql.findIndex((row) => row.startsWith("SELECT name")));
    expect(sql.indexOf("COMMIT")).toBeLessThan(sql.findIndex((row) => row.includes("pg_advisory_unlock")));
  });
  it("does not inspect checkpoints or run SQL when another runner holds the lock", () => {
    const result = execute({ TEST_LOCK: "busy" }); expect(result.status).toBe(1); expect(result.output.phase).toBe("lock");
    expect(trace().some((row) => row.startsWith("SELECT name") || row === "BEGIN")).toBe(false);
  });
  it("rolls back and releases its lock without exposing connection credentials", () => {
    const result = execute({ TEST_FAIL: "true" }); expect(result.status).toBe(1); expect(result.output.phase).toBe("apply");
    expect(trace()).toContain("ROLLBACK"); expect(trace()).not.toContain("COMMIT");
    expect(result.stderr).not.toContain("postgres://fixture:secret"); expect(trace().some((row) => row.includes("pg_advisory_unlock"))).toBe(true);
  });
});
it("declares loadable SDK dependencies without constructing clients or opening connections", () => {
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", 'import pg from "pg"; import {S3Client} from "@aws-sdk/client-s3"; console.log(JSON.stringify({pg:typeof pg.Client,s3:typeof S3Client}));'], { cwd: project, env: { PATH: process.env.PATH || "" }, encoding: "utf8", timeout: 10000 });
  expect(result.status).toBe(0); expect(JSON.parse(result.stdout)).toEqual({ pg: "function", s3: "function" });
});
