#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const valueFor = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
const root = process.cwd();
const dataDir = path.resolve(valueFor("--data-dir") || process.env.DATA_DIR_PATH || path.join(root, "data"));
const backupRoot = path.resolve(valueFor("--output") || process.env.BACKUP_DIR || path.join(dataDir, "backups"));
const mode = args.includes("--verify") ? "verify" : "create";
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const listJsonFiles = (dir, relative = "") => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const nextRelative = path.join(relative, entry.name);
    if (entry.isDirectory()) return entry.name === "backups" ? [] : listJsonFiles(path.join(dir, entry.name), nextRelative);
    return entry.name.endsWith(".json") ? [nextRelative] : [];
  });
};
const backupPath = mode === "verify" ? path.resolve(valueFor("--backup") || "") : path.join(backupRoot, `metadata-${new Date().toISOString().replace(/[:.]/g, "-")}`);
if (mode === "verify") {
  const manifestPath = path.join(backupPath, "BACKUP_MANIFEST.json");
  if (!backupPath || !fs.existsSync(manifestPath)) { console.error(JSON.stringify({ mode, verified: false, error: "backup manifest not found", backupPath }, null, 2)); process.exitCode = 2; }
  else {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const mismatches = [];
    for (const entry of manifest.files || []) {
      const filePath = path.join(backupPath, entry.path);
      if (!fs.existsSync(filePath)) { mismatches.push({ path: entry.path, error: "missing" }); continue; }
      const bytes = fs.readFileSync(filePath);
      if (bytes.byteLength !== entry.bytes || digest(bytes) !== entry.sha256) mismatches.push({ path: entry.path, error: "checksum-or-size-mismatch" });
    }
    const result = { mode, destructive: false, verified: mismatches.length === 0, backupPath, fileCount: (manifest.files || []).length, mismatches, invariants: ["source data is never read from or written to during restore verification", "backup files are verified by byte size and SHA-256", "no secrets are included by this metadata-only backup"] };
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.verified ? 0 : 2;
  }
} else {
  if (!fs.existsSync(dataDir)) { console.error(JSON.stringify({ mode, created: false, error: "data directory not found", dataDir }, null, 2)); process.exitCode = 2; }
  else {
    const tempPath = `${backupPath}.tmp-${process.pid}`;
    fs.rmSync(tempPath, { recursive: true, force: true });
    fs.mkdirSync(tempPath, { recursive: true });
    const files = listJsonFiles(dataDir).sort();
    const manifest = { format: "content-factory-metadata-backup-v1", createdAt: new Date().toISOString(), sourceDataDir: dataDir, files: [] };
    for (const relative of files) {
      const source = path.join(dataDir, relative);
      const destination = path.join(tempPath, relative);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      const bytes = fs.readFileSync(source);
      fs.writeFileSync(destination, bytes, { mode: 0o600 });
      manifest.files.push({ path: relative, bytes: bytes.byteLength, sha256: digest(bytes) });
    }
    fs.writeFileSync(path.join(tempPath, "BACKUP_MANIFEST.json"), JSON.stringify(manifest, null, 2) + "\n", { mode: 0o600 });
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.rmSync(backupPath, { recursive: true, force: true });
    fs.renameSync(tempPath, backupPath);
    console.log(JSON.stringify({ mode, destructive: false, created: true, backupPath, fileCount: manifest.files.length, manifest: path.join(backupPath, "BACKUP_MANIFEST.json"), invariants: ["source files are never overwritten or deleted", "malformed JSON is copied as raw bytes", "backup files are written with owner-only permissions", "no .env or plaintext credential is included"] }, null, 2));
  }
}
