#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const root = process.cwd();
const migrationDir = path.join(root, "migrations");
const requiredApprovals = ["MIGRATION_BACKUP_APPROVED", "MIGRATION_RECONCILIATION_APPROVED", "MIGRATION_ROLLBACK_APPROVED"];
const migrations = fs.existsSync(migrationDir) ? fs.readdirSync(migrationDir).filter((name) => name.endsWith(".sql")).sort().map((name) => {
  const sql = fs.readFileSync(path.join(migrationDir, name), "utf8");
  return { name, sql, checksum: crypto.createHash("sha256").update(sql, "utf8").digest("hex") };
}) : [];
const blockers = [];
if (process.env.MIGRATION_EXECUTE !== "true") blockers.push("MIGRATION_EXECUTE must equal true");
if (!process.env.DATABASE_URL?.trim()) blockers.push("DATABASE_URL is absent");
for (const name of requiredApprovals) if (process.env[name] !== "true") blockers.push(`${name} must equal true`);
if (!process.env.MIGRATION_LOCK_OWNER?.trim()) blockers.push("MIGRATION_LOCK_OWNER is absent");
if (process.env.RELEASE_CONTROL_PRIMARY_READS === "true") blockers.push("primary-read cutover must remain disabled during migration");
if (!migrations.length) blockers.push("no SQL migrations found");
if (blockers.length) {
  console.log(JSON.stringify({ mode: "migration-apply", destructive: true, executed: false, blockers, invariants: ["no database connection is opened while preconditions fail", "secret values are never printed", "file-backed authority remains unchanged", "primary-read cutover is never enabled by this command"] }, null, 2));
  process.exitCode = 2;
} else {
  const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000, statement_timeout: 120000, application_name: "content-factory-migration" });
  try {
    await client.connect();
    const checkpoints = new Map();
    try {
      const result = await client.query("SELECT name, checksum FROM migration_checkpoints");
      for (const row of result.rows) checkpoints.set(row.name, row.checksum);
    } catch (error) {
      if (error?.code !== "42P01") throw error;
    }
    for (const migration of migrations) {
      const existing = checkpoints.get(migration.name);
      if (existing && existing !== migration.checksum) throw new Error(`checksum drift detected for ${migration.name}`);
      if (existing === migration.checksum) continue;
      await client.query("BEGIN");
      try {
        await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`content-factory:migration:${migration.name}`]);
        await client.query(migration.sql);
        await client.query("INSERT INTO migration_checkpoints (name, checksum) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET checksum = EXCLUDED.checksum, applied_at = now()", [migration.name, migration.checksum]);
        await client.query("COMMIT");
        checkpoints.set(migration.name, migration.checksum);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      }
    }
    console.log(JSON.stringify({ mode: "migration-apply", destructive: true, executed: true, migrations: migrations.map(({ name, checksum }) => ({ name, checksum, status: checkpoints.get(name) === checksum ? "verified" : "unknown" })), invariants: ["transaction per migration", "database advisory lock per migration", "checksum recorded after successful commit", "primary-read cutover remains disabled"] }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ mode: "migration-apply", destructive: true, executed: false, error: error instanceof Error ? error.message : "migration failed", nextAction: "Inspect the database transaction and migration checkpoint before retrying; do not bypass checksum or approval gates." }, null, 2));
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => undefined);
  }
}
