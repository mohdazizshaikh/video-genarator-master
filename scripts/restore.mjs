#!/usr/bin/env node
/**
 * Restore a full data backup produced by scripts/backup.mjs.
 *
 * The restore path is fail-closed:
 *   1. archive checksum (sidecar, when present)
 *   2. bounded gzip + restricted USTAR entry validation before extraction
 *   3. exact manifest inventory, totals, sizes and SHA-256
 *   4. explicit target directory — never the live data dir without --force
 *
 * Restored files are prepared privately with mode 0600 before target publication.
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
import { verifyFullArchive, hashFile } from "./full-backup-integrity.mjs";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const valueFor = (flag) => {
  const index = args.indexOf(flag);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error("missing argument value");
  }
  return value;
};
const hasFlag = (flag) => args.includes(flag);
const finish = (result, code = 0) => {
  const stream = code === 0 ? console.log : console.error;
  stream(JSON.stringify(result, null, 2));
  process.exitCode = code;
};
async function restore() {
  const startedAt = Date.now();
  const archiveArg = valueFor("--backup");
  const verifyOnly = hasFlag("--verify-only");
  if (!archiveArg) return finish({ mode: "restore", restored: false, error: "--backup <archive> is required" }, 2);
  const archive = path.resolve(archiveArg);
  const targetArg = valueFor("--target");
  const force = hasFlag("--force");

  let verified;
  try {
    verified = await verifyFullArchive(archive);
  } catch {
    return finish({ mode: "restore", restored: false, verified: false, archive, error: "archive_validation_failed" }, 2);
  }
  const { manifest, extractDir, workDir, authenticated } = verified;

  try {
    if (verifyOnly) {
      return finish({
        mode: "verify-only",
        verified: true,
        authenticated,
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

    // Canonical parent and static symlink checks precede target publication.
    fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    const parent = fs.realpathSync(path.dirname(target));
    const canonicalTarget = path.join(parent, path.basename(target));
    const liveCanonical = fs.existsSync(liveDataDir) ? fs.realpathSync(liveDataDir) : path.join(fs.existsSync(path.dirname(liveDataDir)) ? fs.realpathSync(path.dirname(liveDataDir)) : path.dirname(liveDataDir), path.basename(liveDataDir));
    if ((canonicalTarget === liveCanonical || liveCanonical.startsWith(`${canonicalTarget}${path.sep}`) || canonicalTarget.startsWith(`${liveCanonical}${path.sep}`)) && !force) throw new Error("live target requires force");
    const targetStat = fs.lstatSync(target, { throwIfNoEntry: false });
    if (targetStat && (targetStat.isSymbolicLink() || !targetStat.isDirectory())) throw new Error("target must be a regular directory");
    if (targetStat && fs.readdirSync(target).length && !force) throw new Error("nonempty target requires force");
    const staging = fs.mkdtempSync(path.join(parent, ".cf-restore-incomplete-")); fs.chmodSync(staging, 0o700);
    let preRestoreArchive, mediaFiles = 0;
    try {
      for (const entry of manifest.files) {
        const destination = path.join(staging, entry.path);
        fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
        fs.copyFileSync(path.join(extractDir, entry.path), destination, fs.constants.COPYFILE_EXCL);
        // Archive permission metadata cannot make restored credential files public.
        fs.chmodSync(destination, 0o600);
        if (fs.statSync(destination).size !== entry.bytes || hashFile(destination) !== entry.sha256) throw new Error("restored staging checksum mismatch");
        if (entry.path.startsWith("videos/")) mediaFiles++;
      }
      if (fs.existsSync(target)) {
        preRestoreArchive = `${target}.pre-restore-${crypto.randomUUID()}`;
        fs.renameSync(target, preRestoreArchive);
      }
      try { fs.renameSync(staging, target); }
      catch (error) {
        if (preRestoreArchive && !fs.existsSync(target)) {
          try { fs.renameSync(preRestoreArchive, target); }
          catch { const recoveryError = new Error("rollback publication failed"); recoveryError.recoveryDirectory = preRestoreArchive; throw recoveryError; }
        }
        throw error;
      }
    } finally { fs.rmSync(staging, { recursive: true, force: true }); }

    return finish({
      mode: "restore",
      restored: true,
      verified: true,
      authenticated,
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

restore().catch((error) => finish({ mode: "restore", restored: false, error: "restore_validation_or_io_failed", ...(error.recoveryDirectory ? { recoveryDirectory: error.recoveryDirectory } : {}) }, 2));
