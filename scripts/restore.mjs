#!/usr/bin/env node
/**
 * Restore a full data backup produced by scripts/backup.mjs.
 *
 * The restore path is fail-closed:
 *   1. archive checksum (sidecar, when present)
 *   2. gzip/tar integrity
 *   3. per-file size + SHA-256 against BACKUP_MANIFEST.json
 *   4. explicit target directory — never the live data dir without --force
 *
 * Existing target contents are not overwritten in place: with --force they are
 * renamed to `<target>.pre-restore-<stamp>` first (the rollback artifact).
 *
 * The deployment `.env` is not in the archive. Restoring encrypted connector
 * secrets requires the operator-held TENANT_KEYS_SECRET and API auth requires
 * JWT_SECRET — supply them from the operator secret store at deploy time.
 *
 * Usage:
 *   node scripts/restore.mjs --backup <archive> --target <dir> [--force]
 *   node scripts/restore.mjs --backup <archive> --verify-only
 *
 * Encrypted archives require BACKUP_PASSPHRASE (>= 12 chars).
 *
 * Exit codes: 0 success, 2 verification/guard failure.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const FORMAT = "content-factory-full-backup-v1";
const args = process.argv.slice(2);
const valueFor = (flag) => {
  const index = args.indexOf(flag);
  if (index < 0) return undefined;
  const value = args[index + 1];
  return value && !value.startsWith("--") ? value : undefined;
};
const hasFlag = (flag) => args.includes(flag);
const finish = (result, code = 0) => {
  const stream = code === 0 ? console.log : console.error;
  stream(JSON.stringify(result, null, 2));
  process.exitCode = code;
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
  for (const entry of entries) {
    const nextRelative = relative ? path.join(relative, entry.name) : entry.name;
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) files.push(...listFiles(root, nextRelative));
    else if (entry.isFile()) files.push(nextRelative);
  }
  return files;
};

/** Extract + fully verify an archive into a scratch directory; returns {manifest, extractDir, workDir}. */
function verifyArchive(archive) {
  if (!fs.existsSync(archive)) throw new Error(`backup archive not found: ${archive}`);
  const sidecar = `${archive}.sha256`;
  if (fs.existsSync(sidecar)) {
    const expected = fs.readFileSync(sidecar, "utf8").trim().split(/\s+/)[0];
    const actual = sha256File(archive);
    if (expected !== actual) throw new Error(`archive checksum mismatch (expected ${expected.slice(0, 12)}…, got ${actual.slice(0, 12)}…)`);
  }

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "cf-restore-"));
  try {
    let tarball = archive;
    if (archive.endsWith(".enc")) {
      const passphrase = process.env.BACKUP_PASSPHRASE || "";
      if (passphrase.length < 12) throw new Error("BACKUP_PASSPHRASE (>= 12 chars) is required for an encrypted archive");
      tarball = path.join(workDir, "archive.tar.gz");
      run("openssl", ["enc", "-d", "-aes-256-cbc", "-pbkdf2", "-iter", "200000", "-pass", "env:BACKUP_PASSPHRASE", "-in", archive, "-out", tarball]);
    }
    const extractDir = path.join(workDir, "extract");
    fs.mkdirSync(extractDir, { recursive: true });
    run("tar", ["-xzf", tarball, "-C", extractDir]);
    const manifestPath = path.join(extractDir, "BACKUP_MANIFEST.json");
    if (!fs.existsSync(manifestPath)) throw new Error("BACKUP_MANIFEST.json missing from archive");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (manifest.format !== FORMAT) throw new Error(`unexpected manifest format: ${manifest.format}`);
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
    if (mismatches.length > 0 || extras.length > 0) {
      const error = new Error("archive failed content verification");
      error.detail = { mismatches, extras };
      throw error;
    }
    return { manifest, extractDir, workDir };
  } catch (error) {
    fs.rmSync(workDir, { recursive: true, force: true });
    if (!error.detail) error.detail = {};
    throw error;
  }
}

function restore() {
  const startedAt = Date.now();
  const archiveArg = valueFor("--backup");
  const verifyOnly = hasFlag("--verify-only");
  if (!archiveArg) return finish({ mode: "restore", restored: false, error: "--backup <archive> is required" }, 2);
  const archive = path.resolve(archiveArg);
  const targetArg = valueFor("--target");
  const force = hasFlag("--force");

  let verified;
  try {
    verified = verifyArchive(archive);
  } catch (error) {
    return finish({ mode: "restore", restored: false, verified: false, archive, error: String(error.message), ...(error.detail || {}) }, 2);
  }
  const { manifest, extractDir, workDir } = verified;

  try {
    if (verifyOnly) {
      return finish({
        mode: "verify-only",
        verified: true,
        archive,
        fileCount: manifest.files.length,
        dataBytes: manifest.totals?.bytes ?? 0,
        createdAt: manifest.createdAt,
        elapsedMs: Date.now() - startedAt,
      });
    }

    if (!targetArg) return finish({ mode: "restore", restored: false, verified: true, archive, error: "--target <dir> is required unless --verify-only" }, 2);
    const target = path.resolve(targetArg);
    if (target === path.parse(target).root) return finish({ mode: "restore", restored: false, verified: true, archive, error: "refusing to restore into the filesystem root" }, 2);
    const liveDataDir = path.resolve(process.env.DATA_DIR_PATH || path.join(process.cwd(), "data"));
    if (target === liveDataDir && !force) {
      return finish({ mode: "restore", restored: false, verified: true, archive, error: "target is the live data directory; stop the app and pass --force to restore over it", target }, 2);
    }

    let preRestoreArchive;
    if (fs.existsSync(target)) {
      const existing = fs.readdirSync(target);
      if (existing.length > 0) {
        if (!force) return finish({ mode: "restore", restored: false, verified: true, archive, error: "target exists and is not empty; pass --force to archive it and restore over it", target }, 2);
        preRestoreArchive = `${target}.pre-restore-${new Date().toISOString().replace(/[:.]/g, "-")}`;
        fs.renameSync(target, preRestoreArchive);
      }
    }
    fs.mkdirSync(target, { recursive: true });

    let mediaFiles = 0;
    for (const entry of manifest.files) {
      const source = path.join(extractDir, entry.path);
      const destination = path.join(target, entry.path);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(source, destination);
      fs.chmodSync(destination, parseInt(entry.mode || "644", 8));
      if (entry.path.startsWith("videos/")) mediaFiles += 1;
    }

    return finish({
      mode: "restore",
      restored: true,
      verified: true,
      archive,
      target,
      preRestoreArchive: preRestoreArchive ?? null,
      rollback: preRestoreArchive ? `stop the app, move "${target}" aside and rename "${preRestoreArchive}" back to "${target}", then start the app` : null,
      fileCount: manifest.files.length,
      mediaFiles,
      dataBytes: manifest.totals?.bytes ?? 0,
      createdAt: manifest.createdAt,
      elapsedMs: Date.now() - startedAt,
    });
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

restore();
