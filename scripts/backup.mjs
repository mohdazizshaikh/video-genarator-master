#!/usr/bin/env node
/**
 * Full data backup — file-backed stores, media artifacts, logs, and encrypted
 * connector secrets.
 *
 * Coverage: everything under DATA_DIR_PATH except re-installable/transient
 * directories (`temp/`, `cache/`, `backups/`, `libs/`) and `.DS_Store`.
 *
 * The deployment `.env` is NEVER included. Restoring encrypted connector
 * secrets requires the operator-held `TENANT_KEYS_SECRET` (and API auth needs
 * `JWT_SECRET`); keep those in the operator secret store, not in backups.
 *
 * Security default: the data directory contains credential material (hashed
 * tenant keys, legacy tenant key fields, encrypted connector secrets), so an
 * archive is only written unencrypted when `--allow-plaintext` is passed
 * explicitly. Set `BACKUP_PASSPHRASE` to enable `--encrypt` (AES-256-CBC,
 * PBKDF2, 200k iterations).
 *
 * Usage:
 *   node scripts/backup.mjs [--output <dir>] [--keep <n>] [--encrypt]
 *                           [--allow-plaintext] [--pause-container <name>]
 *   node scripts/backup.mjs --verify [<archive>]
 *
 * Exit codes: 0 success, 2 verification/guard failure.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const FORMAT = "content-factory-full-backup-v1";
const ARCHIVE_PREFIX = "content-factory-backup-";
const EXCLUDED_TOP_LEVEL = new Set(["temp", "cache", "backups", "libs"]);
const args = process.argv.slice(2);
const valueFor = (flag) => {
  const index = args.indexOf(flag);
  if (index < 0) return undefined;
  const value = args[index + 1];
  return value && !value.startsWith("--") ? value : undefined;
};
const hasFlag = (flag) => args.includes(flag);
const fail = (result) => {
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 2;
};
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const sha256File = (filePath) => {
  const hash = crypto.createHash("sha256");
  const fd = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(1024 * 1024);
    let read;
    while ((read = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, read));
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest("hex");
};
const run = (command, commandArgs) => {
  const result = spawnSync(command, commandArgs, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${command} failed (${result.status}): ${(result.stderr || result.stdout || "").trim().slice(0, 400)}`);
  return result;
};
const listFiles = (root, relative = "") => {
  const entries = fs.readdirSync(path.join(root, relative), { withFileTypes: true });
  const files = [];
  const skippedSymlinks = [];
  for (const entry of entries) {
    const nextRelative = relative ? path.join(relative, entry.name) : entry.name;
    if (!relative && EXCLUDED_TOP_LEVEL.has(entry.name)) continue;
    if (entry.name === ".DS_Store") continue;
    if (entry.isSymbolicLink()) {
      skippedSymlinks.push(nextRelative.split(path.sep).join("/"));
      continue;
    }
    if (entry.isDirectory()) files.push(...listFiles(root, nextRelative));
    else if (entry.isFile()) files.push(nextRelative);
  }
  return files;
};

function createBackup() {
  const startedAt = Date.now();
  const dataDir = path.resolve(valueFor("--data-dir") || process.env.DATA_DIR_PATH || path.join(process.cwd(), "data"));
  const outputDir = path.resolve(valueFor("--output") || process.env.BACKUP_DIR || path.join(process.cwd(), "backups"));
  const keep = Number(valueFor("--keep") ?? process.env.BACKUP_KEEP ?? 7);
  const pauseContainer = valueFor("--pause-container");
  const encrypt = hasFlag("--encrypt");
  const allowPlaintext = hasFlag("--allow-plaintext");
  const passphrase = process.env.BACKUP_PASSPHRASE || "";

  if (!fs.existsSync(dataDir)) return fail({ mode: "create", created: false, error: "data directory not found", dataDir });
  if (!Number.isInteger(keep) || keep < 1) return fail({ mode: "create", created: false, error: "--keep must be a positive integer" });
  if (encrypt && passphrase.length < 12) return fail({ mode: "create", created: false, error: "--encrypt requires BACKUP_PASSPHRASE of at least 12 characters" });
  if (!encrypt && !allowPlaintext) {
    return fail({
      mode: "create",
      created: false,
      error: "refusing to write an unencrypted backup of credential-bearing data",
      remedy: "set BACKUP_PASSPHRASE and pass --encrypt (recommended), or pass --allow-plaintext to override explicitly",
    });
  }

  let containerPaused = false;
  const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cf-backup-"));
  try {
    if (pauseContainer) {
      run("docker", ["stop", pauseContainer]);
      containerPaused = true;
    }

    const files = listFiles(dataDir);
    const manifest = { format: FORMAT, createdAt: new Date().toISOString(), appVersion: JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")).version, sourceDataDir: dataDir, excludedTopLevel: [...EXCLUDED_TOP_LEVEL], files: [], totals: { files: 0, bytes: 0 } };
    for (const relative of files.sort()) {
      const source = path.join(dataDir, relative);
      const destination = path.join(stagingRoot, relative);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination);
      const bytes = fs.statSync(destination).size;
      const mode = (fs.statSync(source).mode & 0o777).toString(8).padStart(3, "0");
      fs.chmodSync(destination, fs.statSync(source).mode & 0o777);
      const entry = { path: relative.split(path.sep).join("/"), bytes, sha256: sha256File(destination), mode };
      manifest.files.push(entry);
      manifest.totals.files += 1;
      manifest.totals.bytes += bytes;
    }
    fs.writeFileSync(path.join(stagingRoot, "BACKUP_MANIFEST.json"), JSON.stringify(manifest, null, 2) + "\n", { mode: 0o600 });

    fs.mkdirSync(outputDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const baseArchive = path.join(outputDir, `${ARCHIVE_PREFIX}${stamp}.tar.gz`);
    run("tar", ["-czf", baseArchive, "-C", stagingRoot, "."]);

    let archive = baseArchive;
    if (encrypt) {
      archive = `${baseArchive}.enc`;
      run("openssl", ["enc", "-aes-256-cbc", "-salt", "-pbkdf2", "-iter", "200000", "-pass", "env:BACKUP_PASSPHRASE", "-in", baseArchive, "-out", archive]);
      fs.rmSync(baseArchive, { force: true });
    }
    const archiveBytes = fs.statSync(archive).size;
    const archiveSha256 = sha256File(archive);
    fs.writeFileSync(`${archive}.sha256`, `${archiveSha256}  ${path.basename(archive)}\n`, { mode: 0o600 });

    const archives = fs.readdirSync(outputDir)
      .filter((name) => name.startsWith(ARCHIVE_PREFIX) && (name.endsWith(".tar.gz") || name.endsWith(".tar.gz.enc")))
      .map((name) => ({ name, fullPath: path.join(outputDir, name), mtimeMs: fs.statSync(path.join(outputDir, name)).mtimeMs }))
      .sort((a, b) => b.mtimeMs - a.mtimeMs);
    const pruned = [];
    for (const stale of archives.slice(keep)) {
      fs.rmSync(stale.fullPath, { force: true });
      fs.rmSync(`${stale.fullPath}.sha256`, { force: true });
      pruned.push(stale.name);
    }

    console.log(JSON.stringify({
      mode: "create",
      created: true,
      archive,
      encrypted: encrypt,
      archiveBytes,
      archiveSha256,
      fileCount: manifest.totals.files,
      dataBytes: manifest.totals.bytes,
      excludedTopLevel: manifest.excludedTopLevel,
      manifest: "BACKUP_MANIFEST.json (inside archive)",
      keptArchives: Math.min(keep, archives.length - pruned.length),
      pruned,
      containerPaused: Boolean(pauseContainer),
      elapsedMs: Date.now() - startedAt,
      warnings: encrypt ? [] : ["archive is NOT encrypted (explicit --allow-plaintext)"],
    }, null, 2));
  } finally {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
    if (containerPaused) {
      try {
        run("docker", ["start", pauseContainer]);
      } catch (error) {
        console.error(JSON.stringify({ warning: "failed to restart paused container", container: pauseContainer, error: String(error).slice(0, 300) }));
        process.exitCode = 2;
      }
    }
  }
}

function verifyBackup() {
  const startedAt = Date.now();
  const explicit = valueFor("--verify");
  const searchDir = path.resolve(valueFor("--output") || process.env.BACKUP_DIR || path.join(process.cwd(), "backups"));
  let archive = explicit ? path.resolve(explicit) : "";
  if (!archive) {
    const candidates = fs.existsSync(searchDir)
      ? fs.readdirSync(searchDir).filter((name) => name.startsWith(ARCHIVE_PREFIX) && (name.endsWith(".tar.gz") || name.endsWith(".tar.gz.enc"))).map((name) => ({ fullPath: path.join(searchDir, name), mtimeMs: fs.statSync(path.join(searchDir, name)).mtimeMs })).sort((a, b) => b.mtimeMs - a.mtimeMs)
      : [];
    if (candidates.length === 0) return fail({ mode: "verify", verified: false, error: "no backup archive found", searchDir });
    archive = candidates[0].fullPath;
  }
  if (!fs.existsSync(archive)) return fail({ mode: "verify", verified: false, error: "backup archive not found", archive });

  const sidecar = `${archive}.sha256`;
  if (fs.existsSync(sidecar)) {
    const expected = fs.readFileSync(sidecar, "utf8").trim().split(/\s+/)[0];
    const actual = sha256File(archive);
    if (expected !== actual) return fail({ mode: "verify", verified: false, archive, error: "archive checksum does not match sidecar", expected, actual });
  }

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "cf-verify-"));
  try {
    let tarball = archive;
    if (archive.endsWith(".enc")) {
      const passphrase = process.env.BACKUP_PASSPHRASE || "";
      if (passphrase.length < 12) return fail({ mode: "verify", verified: false, archive, error: "BACKUP_PASSPHRASE is required to verify an encrypted archive" });
      tarball = path.join(workDir, "archive.tar.gz");
      run("openssl", ["enc", "-d", "-aes-256-cbc", "-pbkdf2", "-iter", "200000", "-pass", "env:BACKUP_PASSPHRASE", "-in", archive, "-out", tarball]);
    }
    const extractDir = path.join(workDir, "extract");
    fs.mkdirSync(extractDir, { recursive: true });
    run("tar", ["-xzf", tarball, "-C", extractDir]);
    const manifestPath = path.join(extractDir, "BACKUP_MANIFEST.json");
    if (!fs.existsSync(manifestPath)) return fail({ mode: "verify", verified: false, archive, error: "BACKUP_MANIFEST.json missing from archive" });
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (manifest.format !== FORMAT) return fail({ mode: "verify", verified: false, archive, error: `unexpected manifest format: ${manifest.format}` });
    const mismatches = [];
    for (const entry of manifest.files || []) {
      const filePath = path.join(extractDir, entry.path);
      if (!fs.existsSync(filePath)) {
        mismatches.push({ path: entry.path, error: "missing" });
        continue;
      }
      const bytes = fs.readFileSync(filePath);
      if (bytes.byteLength !== entry.bytes || sha256(bytes) !== entry.sha256) mismatches.push({ path: entry.path, error: "checksum-or-size-mismatch" });
    }
    const listed = new Set((manifest.files || []).map((entry) => entry.path));
    const extras = listFiles(extractDir).map((relative) => relative.split(path.sep).join("/")).filter((relative) => relative !== "BACKUP_MANIFEST.json" && !listed.has(relative));
    const verified = mismatches.length === 0 && extras.length === 0;
    const result = { mode: "verify", verified, archive, fileCount: (manifest.files || []).length, dataBytes: manifest.totals?.bytes ?? 0, createdAt: manifest.createdAt, mismatches, extras, elapsedMs: Date.now() - startedAt };
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = verified ? 0 : 2;
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

if (hasFlag("--verify")) verifyBackup();
else createBackup();
