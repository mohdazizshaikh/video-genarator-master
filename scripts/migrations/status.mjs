import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationDir = path.join(root, "migrations");
const files = fs.existsSync(migrationDir)
  ? fs.readdirSync(migrationDir).filter((name) => /^\d+_.+\.sql$/.test(name)).sort()
  : [];
const migrations = files.map((name) => {
  const sql = fs.readFileSync(path.join(migrationDir, name), "utf8");
  return { name, checksum: crypto.createHash("sha256").update(sql).digest("hex"), bytes: Buffer.byteLength(sql) };
});

const result = {
  mode: "dry-run",
  databaseConfigured: Boolean(process.env.DATABASE_URL),
  autoApply: false,
  authoritativeStore: "file-backed",
  migrations,
  nextAction: process.env.DATABASE_URL
    ? "Run an approved migration runner only after backup, reconciliation, and rollback gates pass."
    : "DATABASE_URL is absent; no migration can be applied.",
};

console.log(JSON.stringify(result, null, 2));
if (!process.env.DATABASE_URL) process.exitCode = 2;
