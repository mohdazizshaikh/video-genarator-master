#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const valueFor = (flag) => { const index = args.indexOf(flag); if (index < 0) return undefined; const value = args[index + 1]; if (!value || value.startsWith("--")) throw new Error("missing_argument_value"); return value; };
const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const format = "content-factory-metadata-backup-v1";
const manifestName = "BACKUP_MANIFEST.json";
const mode = args.includes("--verify") ? "verify" : "create";
const inside = (root, candidate) => candidate === root || candidate.startsWith(`${root}${path.sep}`);
const directory = (location) => {
  const stat = fs.lstatSync(location);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("invalid_or_symlink_directory");
  return fs.realpathSync(location);
};
const safePath = (value) => typeof value === "string" && value.length > 0 && !value.includes("\\") && !value.includes("\0") && !value.includes(":") && !value.startsWith("/") && value.split("/").every((part) => part && part !== "." && part !== "..");
const regularBytes = (file) => {
  const descriptor = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try { if (!fs.fstatSync(descriptor).isFile()) throw new Error("non_regular_file"); return fs.readFileSync(descriptor); }
  finally { fs.closeSync(descriptor); }
};
function inventory(root, source = false) {
  const files = [];
  function walk(location, relative = "") {
    for (const name of fs.readdirSync(location).sort()) {
      const label = relative ? `${relative}/${name}` : name;
      // Match the documented source policy, not every directory called backups.
      if (source && ["backups", "libs/whisper"].includes(label)) {
        if (fs.lstatSync(path.join(location, name)).isSymbolicLink()) throw new Error("symlink_not_allowed");
        continue;
      }
      const file = path.join(location, name), stat = fs.lstatSync(file);
      if (stat.isSymbolicLink()) throw new Error("symlink_not_allowed");
      if (stat.isDirectory()) walk(file, label);
      else if (!stat.isFile()) throw new Error("non_regular_file");
      else if (!source || name.endsWith(".json")) {
        if (!safePath(label) || source && label === manifestName) throw new Error("reserved_or_invalid_path");
        files.push(label);
      }
    }
  }
  walk(root); return files.sort();
}
function verify(backupPath) {
  const root = directory(backupPath);
  const manifest = JSON.parse(regularBytes(path.join(root, manifestName)).toString("utf8"));
  if (!manifest || manifest.format !== format || typeof manifest.createdAt !== "string" || !Number.isFinite(Date.parse(manifest.createdAt)) || !Array.isArray(manifest.files) || !manifest.files.length) throw new Error("invalid_backup_manifest");
  const names = new Set();
  for (const entry of manifest.files) {
    if (!entry || !safePath(entry.path) || !entry.path.endsWith(".json") || entry.path === manifestName || names.has(entry.path) || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error("invalid_backup_manifest_entry");
    names.add(entry.path);
  }
  // Inventory before reading entries prevents traversal through intermediate symlinks.
  const actual = inventory(root).filter((name) => name !== manifestName);
  if (actual.length !== names.size || actual.some((name) => !names.has(name))) throw new Error("backup_inventory_mismatch");
  for (const entry of manifest.files) {
    const bytes = regularBytes(path.join(root, entry.path));
    if (bytes.length !== entry.bytes || digest(bytes) !== entry.sha256) throw new Error("backup_checksum_or_size_mismatch");
  }
  return { fileCount: names.size };
}
let temporary;
try {
  if (mode === "verify") {
    const requested = valueFor("--backup");
    if (!requested) throw new Error("backup_argument_required");
    const backupPath = path.resolve(requested), result = verify(backupPath);
    console.log(JSON.stringify({ mode, destructive: false, verified: true, backupPath, ...result, restoreRehearsed: false, encrypted: false }, null, 2));
  } else {
    const dataDir = directory(path.resolve(valueFor("--data-dir") || process.env.DATA_DIR_PATH || path.join(process.cwd(), "data")));
    const requestedRoot = path.resolve(valueFor("--output") || process.env.BACKUP_DIR || path.join(dataDir, "backups"));
    // A custom child output would recursively capture earlier backups as source.
    if (inside(dataDir, requestedRoot) && requestedRoot !== path.join(dataDir, "backups")) throw new Error("output_inside_source");
    fs.mkdirSync(requestedRoot, { recursive: true, mode: 0o700 });
    const backupRoot = directory(requestedRoot);
    if (inside(dataDir, backupRoot) && backupRoot !== path.join(dataDir, "backups")) throw new Error("output_inside_source");
    const names = inventory(dataDir, true);
    if (!names.length) throw new Error("empty_source_inventory");
    const backupPath = path.join(backupRoot, `metadata-${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID()}`);
    temporary = fs.mkdtempSync(path.join(backupRoot, ".metadata-incomplete-")); fs.chmodSync(temporary, 0o700);
    const manifest = { format, createdAt: new Date().toISOString(), sourceDataDir: dataDir, excludedNamespaces: ["backups", "libs/whisper"], files: [] };
    for (const relative of names) {
      const bytes = regularBytes(path.join(dataDir, relative)), destination = path.join(temporary, relative);
      fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
      fs.writeFileSync(destination, bytes, { flag: "wx", mode: 0o600 });
      manifest.files.push({ path: relative, bytes: bytes.length, sha256: digest(bytes) });
    }
    // Detect additions/removals and changed bytes before publishing the backup.
    if (JSON.stringify(names) !== JSON.stringify(inventory(dataDir, true))) throw new Error("source_inventory_changed");
    for (const entry of manifest.files) if (digest(regularBytes(path.join(dataDir, entry.path))) !== entry.sha256) throw new Error("source_bytes_changed");
    fs.writeFileSync(path.join(temporary, manifestName), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    verify(temporary);
    if (fs.existsSync(backupPath)) throw new Error("backup_destination_exists");
    fs.renameSync(temporary, backupPath); temporary = undefined;
    console.log(JSON.stringify({ mode, destructive: false, created: true, verified: true, backupPath, fileCount: names.length, manifest: path.join(backupPath, manifestName), encrypted: false, restoreRehearsed: false, exclusions: manifest.excludedNamespaces, detail: "Raw JSON may contain credentials. File verification does not establish restore readiness or an atomic source snapshot." }, null, 2));
  }
} catch {
  if (temporary) { try { fs.rmSync(temporary, { recursive: true, force: true }); } catch { /* Only our owned staging directory is cleaned. */ } }
  console.log(JSON.stringify({ mode, destructive: false, created: false, verified: false, error: "backup_validation_or_io_failed", detail: "Check arguments, source stability, regular-file paths, complete inventory and manifest integrity; raw file contents are never printed." }, null, 2));
  process.exitCode = 2;
}
