#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { inspectMigrationData } from "./inspect-data.mjs";

const root = process.cwd();
try { process.loadEnvFile(path.join(root, ".env")); } catch { /* An absent optional env file is valid in isolated/preconfigured runs. */ }
const dataDir = process.env.DATA_DIR_PATH || path.join(root, "data");
const migrationDir = path.join(root, "migrations");
const checkpointPath = path.join(dataDir, "migration-checkpoints.json");
const requiredEnv = (names) => Object.fromEntries(names.map((name) => [name, Boolean(process.env[name]?.trim())]));
const migrations = fs.existsSync(migrationDir) ? fs.readdirSync(migrationDir).filter((name) => name.endsWith(".sql")).sort().map((name) => {
  const content = fs.readFileSync(path.join(migrationDir, name), "utf8");
  return { name, bytes: Buffer.byteLength(content), sha256: crypto.createHash("sha256").update(content).digest("hex") };
}) : [];
let checkpoints = [];
let checkpointsValid = true;
if (fs.existsSync(checkpointPath)) {
  try { const parsed = JSON.parse(fs.readFileSync(checkpointPath, "utf8")); if (!Array.isArray(parsed) || parsed.some((row) => !row || typeof row.name !== "string" || typeof row.checksum !== "string") || new Set(parsed.map((row) => row.name)).size !== parsed.length) throw new Error("invalid checkpoints"); checkpoints = parsed; } catch { checkpointsValid = false; }
}
const checkpointByName = new Map(checkpoints.map((entry) => [entry.name, entry]));
const migrationChecks = migrations.map((migration) => ({ ...migration, checkpoint: checkpointByName.get(migration.name)?.checksum ?? null, status: !checkpointByName.has(migration.name) ? "pending" : checkpointByName.get(migration.name).checksum === migration.sha256 ? "verified" : "drift" }));
const localFiles = fs.existsSync(dataDir) ? fs.readdirSync(dataDir).filter((name) => name.endsWith(".json")).sort() : [];
const inspection = inspectMigrationData(dataDir);
const malformedStores = inspection.stores.filter((store) => !store.validJson).map((store) => store.name);
const unownedRecords = inspection.issues.filter((issue) => issue.code === "missing_owner").length;
const database = requiredEnv(["DATABASE_URL"]);
const minio = requiredEnv(["MINIO_ENDPOINT", "MINIO_ACCESS_KEY", "MINIO_SECRET_KEY", "MINIO_BUCKET"]);
const approvals = Object.fromEntries(["MIGRATION_BACKUP_APPROVED", "MIGRATION_RECONCILIATION_APPROVED", "MIGRATION_ROLLBACK_APPROVED"].map((name) => [name, process.env[name] === "true"]));
const unreviewedNamespaces = localFiles.filter((name) => ["content-versions.json", "connectors.json", "connector-secrets.json", "releases.json", "artifact-manifests.json", "render-executions.json", "publish-executions.json", "customNewsSources.json", "contentAutomationRules.json", "tenants.json", "branding.json", "ai-learning-model.json", "hook-library.json", "knowledge-base.json", "resource-snapshots.json", "schedules.json"].includes(name));
if (fs.existsSync(path.join(dataDir, "tenant-state"))) unreviewedNamespaces.push("tenant-state/");
const checks = {
  migrationFiles: { pass: migrations.length > 0 && migrationChecks.every((migration) => migration.status !== "drift"), detail: migrations.length ? migrationChecks : "no SQL migrations found" },
  database: { pass: database.DATABASE_URL, detail: "presence checked; value never printed" },
  minio: { pass: Object.values(minio).every(Boolean), detail: "endpoint, access key, secret key, and bucket presence checked; values never printed" },
  reconciliation: { pass: inspection.pass, malformedStores, unownedRecords, issues: inspection.issues, stores: inspection.stores, workspaceRegistryChecked: inspection.workspaceRegistryChecked },
  approvals: { pass: Object.values(approvals).every(Boolean), detail: "backup, reconciliation, and rollback approvals must be explicit environment flags" },
  checkpointIntegrity: { pass: checkpointsValid, detail: "local checkpoint structure only; database checkpoint verification is separate" },
  namespaceCoverage: { pass: unreviewedNamespaces.length === 0, unreviewedNamespaces, detail: "ownership is inspected above; SQL/object-store mapping and encrypted-secret migration for these namespaces remain unimplemented" },
  authoritySafety: { pass: process.env.RELEASE_CONTROL_PRIMARY_READS !== "true", detail: "primary-read cutover must remain disabled until post-migration verification" },
};
const blockingGates = ["migrationFiles", "database", "minio", "reconciliation", "approvals", "authoritySafety", "checkpointIntegrity", "namespaceCoverage"];
const result = { mode: "migration-readiness", generatedAt: new Date().toISOString(), destructive: false, authoritativeStore: "file-backed", dataDir, checks, readyForMigration: blockingGates.every((name) => checks[name].pass), readyForPrimaryReadCutover: false, blockers: blockingGates.filter((name) => !checks[name].pass), invariants: ["this command never connects to PostgreSQL or MinIO", "this command never mutates local stores or applies SQL", "secret values are never printed", "primary-read cutover is not enabled by this command", "tenant ownership is never inferred"], nextAction: "Resolve every blocker, rerun this command, execute the separately reviewed migration runbook, then perform read-verify and rollback drills before any primary-read cutover." };
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.readyForMigration ? 0 : 2;
