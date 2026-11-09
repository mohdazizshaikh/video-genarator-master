import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { createGunzip } from "node:zlib";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { spawnSync } from "node:child_process";
import { authenticateBackupArchive, backupAuthPolicy } from "./full-backup-auth.mjs";

const MAX_BYTES = 100 * 1024 ** 3;
const MANIFEST = "BACKUP_MANIFEST.json";
export function hashFile(file) {
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK), hash = crypto.createHash("sha256");
  try {
    if (!fs.fstatSync(fd).isFile()) throw new Error("regular file required");
    const buffer = Buffer.alloc(1024 * 1024); let count;
    while ((count = fs.readSync(fd, buffer)) > 0) hash.update(buffer.subarray(0, count));
  } finally { fs.closeSync(fd); }
  return hash.digest("hex");
}
const hasControl = (value) => Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
export const safePath = (name) => typeof name === "string" && !!name && !name.includes("\\") && !name.includes(":") && !hasControl(name) && !name.startsWith("/") && name.split("/").every((part) => part && part !== "." && part !== "..");
function number(field) {
  if (field.some((byte) => byte > 127)) throw new Error("unsupported tar numeric encoding");
  const value = field.toString("ascii").replace(/\0.*$/, "").trim();
  if (!/^[0-7]+$/.test(value)) throw new Error("invalid tar number");
  const parsed = parseInt(value, 8); if (!Number.isSafeInteger(parsed)) throw new Error("tar number overflow"); return parsed;
}
function text(field) {
  const bytes = field.subarray(0, field.indexOf(0) < 0 ? field.length : field.indexOf(0));
  const decoded = bytes.toString("utf8"); if (!Buffer.from(decoded).equals(bytes)) throw new Error("invalid tar text"); return decoded;
}
// Support a bounded per-entry PAX subset. Metadata is never applied to files.
function paxAttributes(payload) {
  const attributes = Object.create(null);
  let offset = 0, records = 0;
  while (offset < payload.length) {
    const space = payload.indexOf(32, offset);
    if (space < 0 || space - offset > 8 || !/^[1-9][0-9]*$/.test(payload.subarray(offset, space).toString("utf8"))) throw new Error("invalid pax record length");
    const length = Number(payload.subarray(offset, space).toString("utf8")), end = offset + length;
    if (length <= space - offset + 3 || end > payload.length || payload[end - 1] !== 10 || ++records > 256) throw new Error("invalid pax record boundary");
    const bytes = payload.subarray(space + 1, end - 1), equals = bytes.indexOf(61);
    const keyBytes = bytes.subarray(0, equals), key = keyBytes.toString("utf8");
    if (equals < 1 || keyBytes.length > 512 || !Buffer.from(key).equals(keyBytes) || (hasControl(key) || key.includes(" ")) || Object.hasOwn(attributes, key)) throw new Error("invalid or duplicate pax key");
    // These attributes never affect routing, type, size, permissions or restored
    // content. Some writers use arbitrary binary values; do not decode/apply them.
    if (/^(LIBARCHIVE|SCHILY)\.xattr\..+$/.test(key) || ["SCHILY.acl.access", "SCHILY.acl.default", "SCHILY.acl.ace"].includes(key)) {
      attributes[key] = true; offset = end; continue;
    }
    const valueBytes = bytes.subarray(equals + 1), value = valueBytes.toString("utf8");
    if (!Buffer.from(value).equals(valueBytes) || value.includes("\0")) throw new Error("invalid pax text");
    if (key === "path") { if (!value || Buffer.byteLength(value) > 4096) throw new Error("invalid pax path"); }
    else if (key === "size") { if (!/^(0|[1-9][0-9]*)$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > MAX_BYTES) throw new Error("invalid pax size"); }
    else if (["mtime", "atime", "ctime", "LIBARCHIVE.creationtime"].includes(key)) { if (!/^-?[0-9]+(\.[0-9]+)?$/.test(value)) throw new Error("invalid pax time"); }
    else if (["uid", "gid", "SCHILY.dev", "SCHILY.ino", "SCHILY.nlink"].includes(key)) { if (!/^[0-9]+$/.test(value)) throw new Error("invalid pax numeric metadata"); }
    else if (key === "hdrcharset") { if (!["UTF-8", "ISO-IR 10646 2000 UTF-8"].includes(value)) throw new Error("unsupported pax charset"); }
    else if (!["uname", "gname", "comment", "charset", "SCHILY.fflags"].includes(key)) throw new Error("unsupported pax attribute");
    attributes[key] = value; offset = end;
  }
  if (!records) throw new Error("empty pax header");
  return attributes;
}
function extractRestricted(tarball, target) {
  const fd = fs.openSync(tarball, "r"), size = fs.fstatSync(fd).size, seen = new Set(), files = [];
  let offset = 0, terminated = false, pendingPax, headers = 0;
  const read = (length, position) => { const buffer = Buffer.alloc(length); if (fs.readSync(fd, buffer, 0, length, position) !== length) throw new Error("truncated tar"); return buffer; };
  try {
    while (offset + 512 <= size) {
      const header = read(512, offset); offset += 512;
      if (++headers > 100000) throw new Error("tar header count limit");
      if (header.every((byte) => byte === 0)) {
        if (offset + 512 > size || !read(512, offset).every((byte) => byte === 0)) throw new Error("missing tar terminator");
        offset += 512;
        while (offset < size) { const count = Math.min(1024 * 1024, size - offset); if (!read(count, offset).every((byte) => byte === 0)) throw new Error("trailing tar content"); offset += count; }
        terminated = true; break;
      }
      const checksum = number(header.subarray(148, 156)), check = Buffer.from(header); check.fill(32, 148, 156);
      if (check.reduce((sum, byte) => sum + byte, 0) !== checksum || text(header.subarray(257, 263)) !== "ustar") throw new Error("invalid or unsupported tar header");
      const type = header[156], headerBytes = number(header.subarray(124, 136));
      if (text(header.subarray(157, 257))) throw new Error("tar links are unsupported");
      if (type === 120) {
        if (pendingPax || headerBytes > 1024 * 1024 || offset + Math.ceil(headerBytes / 512) * 512 > size) throw new Error("invalid pax header envelope");
        pendingPax = paxAttributes(read(headerBytes, offset));
        offset += Math.ceil(headerBytes / 512) * 512; continue;
      }
      if (![0, 48, 53].includes(type)) throw new Error("unsupported tar entry type");
      const attributes = pendingPax; pendingPax = undefined;
      const bytes = attributes?.size === undefined ? headerBytes : Number(attributes.size);
      let name = [text(header.subarray(345, 500)), text(header.subarray(0, 100))].filter(Boolean).join("/");
      if (attributes?.path !== undefined) name = attributes.path;
      if (name.startsWith("./")) name = name.slice(2);
      if (type === 53) name = name.replace(/\/$/, "");
      if ((name === "." || name === "") && type === 53 && bytes === 0) continue;
      if (!safePath(name) || seen.has(name) || seen.size >= 100000 || bytes > MAX_BYTES || offset + Math.ceil(bytes / 512) * 512 > size) throw new Error("unsafe or duplicate tar entry");
      seen.add(name);
      const destination = path.join(target, name);
      if (type === 53) { if (bytes !== 0) throw new Error("directory payload"); fs.mkdirSync(destination, { recursive: true, mode: 0o700 }); }
      else {
        fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
        const out = fs.openSync(destination, "wx", 0o600);
        try { let copied = 0; while (copied < bytes) { const chunk = read(Math.min(1024 * 1024, bytes - copied), offset + copied); let written = 0; while (written < chunk.length) written += fs.writeSync(out, chunk, written); copied += chunk.length; } }
        finally { fs.closeSync(out); }
        files.push(name);
      }
      offset += Math.ceil(bytes / 512) * 512;
    }
    if (!terminated || pendingPax) throw new Error("unterminated tar or dangling pax header");
  } finally { fs.closeSync(fd); }
  return files;
}
export async function verifyFullArchive(archive) {
  backupAuthPolicy();
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "cf-safe-restore-")); fs.chmodSync(workDir, 0o700);
  try {
    // Authenticate the private bytes that will actually be decrypted/extracted,
    // never a public pathname that could be replaced after its MAC check.
    const snapshot = path.join(workDir, archive.endsWith(".enc") ? "input.enc" : "input.tar.gz");
    const descriptor = fs.openSync(archive, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
    if (!fs.fstatSync(descriptor).isFile()) { fs.closeSync(descriptor); throw new Error("regular archive required"); }
    let copied = 0;
    await pipeline(fs.createReadStream(undefined, { fd: descriptor, autoClose: true }), new Transform({ transform(chunk, encoding, callback) { copied += chunk.length; callback(copied > MAX_BYTES + 64 * 1024 * 1024 ? new Error("compressed archive size limit") : null, chunk); } }), fs.createWriteStream(snapshot, { flags: "wx", mode: 0o600 }));
    const authenticated = authenticateBackupArchive(archive, snapshot);
    const archiveHash = hashFile(snapshot), sidecarStat = fs.lstatSync(`${archive}.sha256`, { throwIfNoEntry: false });
    if (sidecarStat) {
      if (!sidecarStat.isFile() || sidecarStat.isSymbolicLink() || sidecarStat.size > 1024) throw new Error("invalid checksum sidecar");
      const expected = fs.readFileSync(`${archive}.sha256`, "utf8").trim().split(/\s+/)[0];
      if (!/^[a-f0-9]{64}$/.test(expected) || expected !== archiveHash) throw new Error("archive checksum mismatch");
    }
    let compressed = snapshot;
    if (archive.endsWith(".enc")) {
      if ((process.env.BACKUP_PASSPHRASE || "").length < 12) throw new Error("passphrase required");
      compressed = path.join(workDir, "decrypted.tar.gz");
      const result = spawnSync("openssl", ["enc", "-d", "-aes-256-cbc", "-pbkdf2", "-iter", "200000", "-pass", "env:BACKUP_PASSPHRASE", "-in", snapshot, "-out", compressed], { encoding: "utf8", timeout: 300000 });
      if (result.status !== 0) throw new Error("decryption failed"); fs.chmodSync(compressed, 0o600);
    }
    const tarball = path.join(workDir, "archive.tar"); let total = 0;
    await pipeline(fs.createReadStream(compressed, { flags: fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW }), createGunzip(), new Transform({ transform(chunk, encoding, callback) { total += chunk.length; callback(total > MAX_BYTES ? new Error("archive size limit") : null, chunk); } }), fs.createWriteStream(tarball, { flags: "wx", mode: 0o600 }));
    const extractDir = path.join(workDir, "extract"); fs.mkdirSync(extractDir, { mode: 0o700 });
    const actual = extractRestricted(tarball, extractDir), actualSet = new Set(actual);
    const manifestPath = path.join(extractDir, MANIFEST);
    if (!actualSet.has(MANIFEST) || fs.statSync(manifestPath).size > 32 * 1024 * 1024) throw new Error("manifest absent or too large");
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (!manifest || manifest.format !== "content-factory-full-backup-v1" || !Array.isArray(manifest.files) || !manifest.files.length || typeof manifest.createdAt !== "string" || !Number.isFinite(Date.parse(manifest.createdAt))) throw new Error("invalid manifest");
    const listed = new Set(); let bytes = 0;
    for (const entry of manifest.files) {
      if (!entry || !safePath(entry.path) || entry.path === MANIFEST || listed.has(entry.path) || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !/^[a-f0-9]{64}$/.test(entry.sha256) || entry.mode !== undefined && !/^[0-7]{3}$/.test(entry.mode)) throw new Error("invalid manifest entry");
      listed.add(entry.path); bytes += entry.bytes;
      if (!actualSet.has(entry.path) || fs.statSync(path.join(extractDir, entry.path)).size !== entry.bytes || hashFile(path.join(extractDir, entry.path)) !== entry.sha256) throw new Error("content mismatch");
    }
    if (actual.length !== listed.size + 1 || actual.some((name) => name !== MANIFEST && !listed.has(name)) || manifest.totals?.files !== listed.size || manifest.totals?.bytes !== bytes) throw new Error("inventory or totals mismatch");
    return { manifest, extractDir, workDir, authenticated };
  } catch (error) { fs.rmSync(workDir, { recursive: true, force: true }); throw error; }
}
