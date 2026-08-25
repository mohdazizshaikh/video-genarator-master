#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataDir = process.env.DATA_DIR_PATH || path.join(root, "data");
const migrationDir = path.join(root, "migrations");
const checkpointPath = path.join(dataDir, "migration-checkpoints.json");
const lockPath = process.env.MIGRATION_LOCK_PATH || path.join(dataDir, "migration.lock");
const migrations = fs.existsSync(migrationDir)
  ? fs.readdirSync(migrationDir).filter((name) => name.endsWith(".sql")).sort().map((name) => {
      const sql = fs.readFileSync(path.join(migrationDir, name), "utf8");
      return { name, checksum: crypto.createHash("sha256").update(sql, "utf8").digest("hex"), bytes: Buffer.byteLength(sql) };
    })
  : [];
let checkpoints = [];
try {
  const parsed = JSON.parse(fs.readFileSync(checkpointPath, "utf8"));
  checkpoints = Array.isArray(parsed) ? parsed : [];
} catch {}
const checkpointByName = new Map(checkpoints.map((entry) => [entry.name, entry]));
const migrationStatus = migrations.map((migration) => {
  const checkpoint = checkpointByName.get(migration.name);
  return { ...migration, status: !checkpoint ? "pending" : checkpoint.checksum === migration.checksum ? "applied" : "drift", checkpoint: checkpoint ?? null };
});
let lock = null;
try { lock = JSON.parse(fs.readFileSync(lockPath, "utf8")); } catch {}
const localFiles = fs.existsSync(dataDir) ? fs.readdirSync(dataDir).filter((name) => name.endsWith(".json")).sort() : [];
const result = {
  mode: "preflight",
  databaseConfigured: Boolean(process.env.DATABASE_URL),
  autoApply: false,
  authoritativeStore: "file-backed",
  cutoverEnabled: process.env.RELEASE_CONTROL_PRIMARY_READS === "true",
  lock: lock ? { path: lockPath, held: true, owner: lock.owner ?? null, acquiredAt: lock.acquiredAt ?? null } : { path: lockPath, held: false },
  migrations: migrationStatus,
  reconciliation: { dataDir, jsonFileCount: localFiles.length, jsonFiles: localFiles },
  blockers: [
    ...(!process.env.DATABASE_URL ? ["DATABASE_URL is absent"] : []),
    ...(migrationStatus.some((migration) => migration.status === "drift") ? ["migration checksum drift detected"] : []),
    ...(lock ? ["migration lock is held"] : []),
    ...(process.env.RELEASE_CONTROL_PRIMARY_READS !== "true" ? ["primary-read cutover is disabled"] : []),
  ],
  nextAction: "Do not apply SQL from this command. Obtain owner-approved database access, backup, reconciliation sign-off, lock ownership, and rollback approval before migration execution.",
};
console.log(JSON.stringify(result, null, 2));
const blocked = !result.databaseConfigured || result.cutoverEnabled || result.blockers.includes("migration checksum drift detected") || result.lock.held;
process.exitCode = blocked ? 2 : 0;
