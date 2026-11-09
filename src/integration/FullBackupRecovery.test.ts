import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, expect, it } from "vitest";
const project = path.resolve(__dirname, "../..");
let directory: string, data: string, output: string;
beforeEach(() => { directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "full-backup-recovery-"))); data = path.join(directory, "data"); output = path.join(directory, "backups"); fs.ensureDirSync(data); fs.writeJsonSync(path.join(directory, "package.json"), { version: "fixture" }); fs.writeFileSync(path.join(data, "records.json"), "PRIVATE-RAW-RECORDS"); fs.ensureDirSync(path.join(data, "videos")); fs.writeFileSync(path.join(data, "videos/video.mp4"), Buffer.from([0, 1, 2, 255])); });
afterEach(() => fs.removeSync(directory));
function run(script: string, args: string[], extra: Record<string, string> = {}) {
  const result = spawnSync(process.execPath, [path.join(project, "scripts", script), ...args], { cwd: directory, env: { PATH: process.env.PATH || "", DATA_DIR_PATH: data, ...extra }, encoding: "utf8", timeout: 20000 });
  expect(result.error).toBeUndefined(); const raw = result.stdout || result.stderr;
  expect(raw).not.toContain("PRIVATE-RAW-RECORDS"); expect(raw).not.toContain("fixture-passphrase-very-secret");
  return { status: result.status, output: JSON.parse(raw) };
}
function create(encrypt = false, extra: Record<string, string> = {}) {
  const result = run("backup.mjs", ["--data-dir", data, "--output", output, encrypt ? "--encrypt" : "--allow-plaintext"], { ...(encrypt ? { BACKUP_PASSPHRASE: "fixture-passphrase-very-secret" } : {}), ...extra });
  expect(result.status, JSON.stringify(result.output)).toBe(0); return result.output.archive as string;
}
function verify(archive: string) { return run("restore.mjs", ["--backup", archive, "--verify-only"]); }
const digest = (bytes: Buffer) => crypto.createHash("sha256").update(bytes).digest("hex");
function manifest(files = [{ path: "records.json", bytes: Buffer.byteLength("safe"), sha256: digest(Buffer.from("safe")), mode: "644" }]) {
  return { format: "content-factory-full-backup-v1", createdAt: "2026-10-28T00:00:00Z", files, totals: { files: files.length, bytes: files.reduce((sum, file) => sum + file.bytes, 0) } };
}
function archive(entries: { name: string; bytes?: Buffer; type?: string; link?: string; headerSize?: number }[]) {
  const chunks: Buffer[] = [];
  for (const entry of entries) {
    const bytes = entry.bytes || Buffer.alloc(0), header = Buffer.alloc(512);
    header.write(entry.name, 0, 100); header.write("0000600\0", 100); header.write("0000000\0", 108); header.write("0000000\0", 116);
    header.write(`${(entry.headerSize ?? bytes.length).toString(8).padStart(11, "0")}\0`, 124); header.write("00000000000\0", 136); header.fill(32, 148, 156); header.write(entry.type || "0", 156); if (entry.link) header.write(entry.link, 157, 100);
    header.write("ustar\0", 257); header.write("00", 263);
    header.write(`${header.reduce((sum, byte) => sum + byte, 0).toString(8).padStart(6, "0")}\0 `, 148);
    chunks.push(header, bytes, Buffer.alloc((512 - bytes.length % 512) % 512));
  }
  chunks.push(Buffer.alloc(1024)); const file = path.join(directory, `fixture-${crypto.randomUUID()}.tar.gz`); fs.writeFileSync(file, gzipSync(Buffer.concat(chunks))); return file;
}
function fixture(value: unknown = manifest(), extra: { name: string; bytes?: Buffer; type?: string; link?: string; headerSize?: number }[] = []) {
  return archive([{ name: "BACKUP_MANIFEST.json", bytes: Buffer.from(JSON.stringify(value)) }, { name: "records.json", bytes: Buffer.from("safe") }, ...extra]);
}
it("backs up and restores JSON and media byte-for-byte through both verification entry points", () => {
  fs.writeFileSync(path.join(data, ".env"), "PRIVATE-ENV"); const backup = create();
  expect(verify(backup).status).toBe(0); expect(run("backup.mjs", ["--verify", backup]).status).toBe(0);
  const target = path.join(directory, "recovered"), result = run("restore.mjs", ["--backup", backup, "--target", target]); expect(result.status).toBe(0);
  expect(fs.readFileSync(path.join(target, "records.json"))).toEqual(fs.readFileSync(path.join(data, "records.json")));
  expect(fs.readFileSync(path.join(target, "videos/video.mp4"))).toEqual(fs.readFileSync(path.join(data, "videos/video.mp4")));
  expect(fs.existsSync(path.join(target, ".env"))).toBe(false); expect(fs.statSync(path.join(target, "records.json")).mode & 0o777).toBe(0o600);
});
it("round-trips encrypted archives and rejects absent or incorrect passphrases", () => {
  const backup = create(true); expect(verify(backup).status).toBe(2);
  expect(run("restore.mjs", ["--backup", backup, "--verify-only"], { BACKUP_PASSPHRASE: "incorrect-passphrase-long" }).status).toBe(2);
  expect(run("restore.mjs", ["--backup", backup, "--verify-only"], { BACKUP_PASSPHRASE: "fixture-passphrase-very-secret" }).status).toBe(0);
  expect(fs.readdirSync(output).some((name) => name.endsWith(".tar.gz"))).toBe(false);
});
it.each(["../escape", "/absolute", "a/../../escape", "a\\b", "C:/escape", "./../escape"])("rejects unsafe archive path before extraction: %s", (name) => {
  const backup = fixture(manifest(), [{ name, bytes: Buffer.from("malicious") }]); expect(verify(backup).status).toBe(2); expect(run("backup.mjs", ["--verify", backup]).status).toBe(2);
  expect(fs.existsSync(path.join(directory, "escape"))).toBe(false);
});
it.each(["1", "2", "3", "6", "x", "g", "L", "K"])("rejects link/special/extended entry type %s", (type) => {
  expect(verify(fixture(manifest(), [{ name: "unsafe", type, link: "../escape" }])).status).toBe(2);
});
it("rejects duplicate archive entries even when the final bytes would match", () => { expect(verify(fixture(manifest(), [{ name: "records.json", bytes: Buffer.from("safe") }])).status).toBe(2); });
it.each(["empty", "duplicate", "traversal", "bad-total", "bad-hash", "bad-mode", "missing-entry", "extra-file"])("rejects incomplete or malformed manifests: %s", (kind) => {
  const value = manifest();
  if (kind === "empty") { value.files = []; value.totals = { files: 0, bytes: 0 }; }
  if (kind === "duplicate") value.files.push({ ...value.files[0] });
  if (kind === "traversal") value.files[0].path = "../outside";
  if (kind === "bad-total") value.totals.bytes++;
  if (kind === "bad-hash") value.files[0].sha256 = "b".repeat(64);
  if (kind === "bad-mode") value.files[0].mode = "7777";
  if (kind === "missing-entry") value.files[0].path = "missing";
  const extra = kind === "extra-file" ? [{ name: "extra", bytes: Buffer.from("extra") }] : [];
  expect(verify(fixture(value, extra)).status).toBe(2);
});
it("preserves existing targets unless forced and keeps a rollback directory", () => {
  const backup = fixture(), target = path.join(directory, "target"); fs.ensureDirSync(target); fs.writeFileSync(path.join(target, "sentinel"), "keep");
  expect(run("restore.mjs", ["--backup", backup, "--target", target]).status).toBe(2); expect(fs.readFileSync(path.join(target, "sentinel"), "utf8")).toBe("keep");
  const restored = run("restore.mjs", ["--backup", backup, "--target", target, "--force"]); expect(restored.status).toBe(0);
  expect(fs.readFileSync(path.join(restored.output.preRestoreArchive, "sentinel"), "utf8")).toBe("keep"); expect(fs.readFileSync(path.join(target, "records.json"), "utf8")).toBe("safe");
});
it("rejects symlinked targets and protects the canonical live data path", () => {
  const backup = fixture(), alias = path.join(directory, "alias"); fs.symlinkSync(data, alias);
  expect(run("restore.mjs", ["--backup", backup, "--target", alias, "--force"]).status).toBe(2);
  expect(run("restore.mjs", ["--backup", backup, "--target", data]).status).toBe(2);
  expect(fs.readFileSync(path.join(data, "records.json"), "utf8")).toBe("PRIVATE-RAW-RECORDS");
});
it("rejects damaged gzip, header checksums and sidecars without changing a target", () => {
  const backup = fixture(), target = path.join(directory, "untouched");
  fs.writeFileSync(`${backup}.sha256`, "0".repeat(64)); expect(verify(backup).status).toBe(2); fs.removeSync(`${backup}.sha256`);
  fs.writeFileSync(backup, "not gzip"); expect(run("restore.mjs", ["--backup", backup, "--target", target]).status).toBe(2); expect(fs.existsSync(target)).toBe(false);
});
it("refuses source symlinks, nested output and plaintext without explicit opt-in", () => {
  expect(run("backup.mjs", ["--output", output]).status).toBe(2);
  fs.symlinkSync(path.join(data, "records.json"), path.join(data, "link")); expect(run("backup.mjs", ["--output", output, "--allow-plaintext"]).status).toBe(2); fs.removeSync(path.join(data, "link"));
  expect(run("backup.mjs", ["--output", path.join(data, "nested-output"), "--allow-plaintext"]).status).toBe(2);
});

it.each(["copy", "publish", "rollback"])("preserves existing data when restore %s fails", (phase) => {
  const backup = fixture(), target = path.join(directory, "target"); fs.ensureDirSync(target); fs.writeFileSync(path.join(target, "sentinel"), "keep");
  const injection = `import fs from "node:fs";import path from "node:path";const rename=fs.renameSync;
${phase === "copy" ? 'fs.copyFileSync=()=>{throw new Error("PRIVATE-COPY-FAILURE")};' : `fs.renameSync=function(from,to){if(path.basename(from).startsWith(".cf-restore-incomplete-")${phase === "rollback" ? '||from.includes(".pre-restore-")' : ""})throw new Error("PRIVATE-PUBLISH-FAILURE");return rename.call(this,from,to)};`}`;
  const result = run("restore.mjs", ["--backup", backup, "--target", target, "--force"], { NODE_OPTIONS: `--import=data:text/javascript,${encodeURIComponent(injection)}` });
  expect(result.status).toBe(2);
  const retained = phase === "rollback" ? result.output.recoveryDirectory : target;
  expect(fs.readFileSync(path.join(retained, "sentinel"), "utf8")).toBe("keep");
  expect(fs.readdirSync(directory).some((name) => name.startsWith(".cf-restore-incomplete-"))).toBe(false);
});

it.each(["header-checksum", "truncated-payload", "missing-terminator", "trailing-content"])("rejects malformed TAR structure: %s", (kind) => {
  const backup = fixture(); let bytes = gunzipSync(fs.readFileSync(backup));
  if (kind === "header-checksum") bytes[0] ^= 1;
  if (kind === "truncated-payload") bytes = bytes.subarray(0, 600);
  if (kind === "missing-terminator") bytes = bytes.subarray(0, bytes.length - 1024);
  if (kind === "trailing-content") bytes = Buffer.concat([bytes, Buffer.from("unexpected")]);
  fs.writeFileSync(backup, gzipSync(bytes)); expect(verify(backup).status).toBe(2);
});

it("verifies copied target bytes before moving original data aside", () => {
  const backup = fixture(), target = path.join(directory, "target"); fs.ensureDirSync(target); fs.writeFileSync(path.join(target, "sentinel"), "keep");
  const injection = 'import fs from "node:fs";const copy=fs.copyFileSync;fs.copyFileSync=function(source,target,...args){copy.call(this,source,target,...args);fs.writeFileSync(target,"corrupted-copy")};';
  const result = run("restore.mjs", ["--backup", backup, "--target", target, "--force"], { NODE_OPTIONS: `--import=data:text/javascript,${encodeURIComponent(injection)}` });
  expect(result.status).toBe(2); expect(fs.readFileSync(path.join(target, "sentinel"), "utf8")).toBe("keep");
  expect(fs.readdirSync(directory).some((name) => name.includes(".pre-restore-") || name.startsWith(".cf-restore-incomplete-"))).toBe(false);
});

it.each(["--data-dir", "--output", "--keep", "--pause-container"])("rejects a missing explicit backup argument value: %s", (flag) => {
  const result = run("backup.mjs", ["--allow-plaintext", flag]); expect(result.status).toBe(2);
  expect(fs.existsSync(output)).toBe(false);
});
it("rejects a missing restore target value without changing source data", () => {
  const result = run("restore.mjs", ["--backup", fixture(), "--target", "--force"]); expect(result.status).toBe(2);
  expect(fs.readFileSync(path.join(data, "records.json"), "utf8")).toBe("PRIVATE-RAW-RECORDS");
});

function paxRecord(key: string, value: string) {
  const body = `${key}=${value}\n`; let length = Buffer.byteLength(body) + 2;
  while (Buffer.byteLength(`${length} ${body}`) !== length) length = Buffer.byteLength(`${length} ${body}`);
  return Buffer.from(`${length} ${body}`);
}
function paxFixture(attributes: Buffer, name = "placeholder", value = manifest(), headerSize?: number) {
  return archive([{ name: "BACKUP_MANIFEST.json", bytes: Buffer.from(JSON.stringify(value)) }, { name: "PaxHeaders/entry", type: "x", bytes: attributes }, { name, bytes: Buffer.from("safe"), headerSize }]);
}
it("restores long UTF-8 paths with byte-counted per-entry PAX metadata", () => {
  const name = `${"long-segment/".repeat(24)}தமிழ்.json`;
  const value = manifest([{ path: name, bytes: 4, sha256: digest(Buffer.from("safe")), mode: "644" }]);
  const backup = paxFixture(Buffer.concat([paxRecord("path", name), paxRecord("mtime", "123.456"), paxRecord("uname", "fixture")]), "placeholder", value);
  expect(verify(backup).status).toBe(0); expect(run("backup.mjs", ["--verify", backup]).status).toBe(0);
  const target = path.join(directory, "pax-target"); expect(run("restore.mjs", ["--backup", backup, "--target", target]).status).toBe(0);
  expect(fs.readFileSync(path.join(target, name), "utf8")).toBe("safe");
});
it("uses PAX size for exactly one following entry", () => {
  const backup = paxFixture(Buffer.concat([paxRecord("path", "records.json"), paxRecord("size", "4")]), "placeholder", manifest(), 0);
  expect(verify(backup).status).toBe(0);
});
it("consumes path overrides once and detects duplicate effective identities", () => {
  const value = manifest([{ path: "first.json", bytes: 4, sha256: digest(Buffer.from("safe")), mode: "644" }, { path: "records.json", bytes: 4, sha256: digest(Buffer.from("safe")), mode: "644" }]);
  const entries = [{ name: "BACKUP_MANIFEST.json", bytes: Buffer.from(JSON.stringify(value)) }, { name: "PaxHeaders/entry", type: "x", bytes: paxRecord("path", "first.json") }, { name: "placeholder", bytes: Buffer.from("safe") }, { name: "records.json", bytes: Buffer.from("safe") }];
  expect(verify(archive(entries)).status).toBe(0);
  entries[1].bytes = paxRecord("path", "records.json"); expect(verify(archive(entries)).status).toBe(2);
});
it.each(["../escape", "/absolute", "a/../../escape", "a\\b", "C:/escape", "a\npath"])("validates effective PAX paths: %j", (name) => {
  expect(verify(paxFixture(paxRecord("path", name))).status).toBe(2);
});
it.each(["-1", "1.2", "9007199254740992", "107374182401", "04", ""])("rejects invalid PAX size %j", (value) => {
  expect(verify(paxFixture(paxRecord("size", value))).status).toBe(2);
});
it.each(["length", "boundary", "newline", "duplicate", "unknown", "sparse", "binary", "utf8", "empty", "oversized"])("rejects malformed or unsupported PAX records: %s", (kind) => {
  let bytes = paxRecord("path", "records.json");
  if (kind === "length") bytes = Buffer.from("999 path=records.json\n");
  if (kind === "boundary") bytes = Buffer.from("2 path=records.json\n");
  if (kind === "newline") bytes[bytes.length - 1] = 32;
  if (kind === "duplicate") bytes = Buffer.concat([bytes, bytes]);
  if (kind === "unknown") bytes = paxRecord("unreviewed", "value");
  if (kind === "sparse") bytes = paxRecord("GNU.sparse.map", "0,4");
  if (kind === "binary") bytes = paxRecord("hdrcharset", "BINARY");
  if (kind === "utf8") bytes[bytes.length - 2] = 255;
  if (kind === "empty") bytes = Buffer.alloc(0);
  if (kind === "oversized") bytes = Buffer.alloc(1024 * 1024 + 1);
  expect(verify(paxFixture(bytes)).status).toBe(2);
});
it("rejects dangling and chained local headers", () => {
  const entries = [{ name: "BACKUP_MANIFEST.json", bytes: Buffer.from(JSON.stringify(manifest())) }, { name: "PaxHeaders/entry", type: "x", bytes: paxRecord("path", "records.json") }];
  expect(verify(archive(entries)).status).toBe(2);
  expect(verify(archive([...entries, entries[1], { name: "records.json", bytes: Buffer.from("safe") }])).status).toBe(2);
});
it("accepts independently generated system-tar PAX archives with nested UTF-8 paths", () => {
  const payload = path.join(directory, "independent-payload"); fs.ensureDirSync(payload);
  const name = `${"long-segment/".repeat(24)}தமிழ்.json`; fs.ensureDirSync(path.dirname(path.join(payload, name))); fs.writeFileSync(path.join(payload, name), "safe");
  fs.writeJsonSync(path.join(payload, "BACKUP_MANIFEST.json"), manifest([{ path: name, bytes: 4, sha256: digest(Buffer.from("safe")), mode: "644" }]));
  const backup = path.join(directory, "system-pax.tar.gz");
  const result = spawnSync("tar", ["--format=pax", "-czf", backup, "-C", payload, "."], { encoding: "utf8", env: { ...process.env, COPYFILE_DISABLE: "1" }, timeout: 10000 });
  expect(result.status, result.stderr).toBe(0); expect(verify(backup).status).toBe(0);
});

it("ignores framed binary vendor attributes without applying them to restored files", () => {
  const body = Buffer.concat([Buffer.from("SCHILY.xattr.user.fixture="), Buffer.from([0, 255, 10, 61, 128]), Buffer.from("\n")]);
  let length = body.length + 2; while (String(length).length + 1 + body.length !== length) length = String(length).length + 1 + body.length;
  const binaryRecord = Buffer.concat([Buffer.from(`${length} `), body]);
  const backup = paxFixture(Buffer.concat([paxRecord("path", "records.json"), binaryRecord, paxRecord("LIBARCHIVE.xattr.user.fixture", "opaque"), paxRecord("SCHILY.acl.access", "ignored")]));
  expect(verify(backup).output.fileCount).toBe(1);
  const target = path.join(directory, "binary-metadata-target"); expect(run("restore.mjs", ["--backup", backup, "--target", target]).status).toBe(0);
  expect(fs.readdirSync(target)).toEqual(["records.json"]); expect(fs.statSync(path.join(target, "records.json")).mode & 0o777).toBe(0o600);
});
it("creates and restores new full backups with long UTF-8 paths", () => {
  const name = `${"long-segment/".repeat(24)}தமிழ்.json`, file = path.join(data, name);
  fs.ensureDirSync(path.dirname(file)); fs.writeFileSync(file, "long-name-data");
  const backup = create(), target = path.join(directory, "long-path-recovery");
  expect(run("restore.mjs", ["--backup", backup, "--target", target]).status).toBe(0);
  expect(fs.readFileSync(path.join(target, name), "utf8")).toBe("long-name-data");
});
it("consumes local metadata on root directories without leaking the path override", () => {
  const backup = archive([{ name: "BACKUP_MANIFEST.json", bytes: Buffer.from(JSON.stringify(manifest())) }, { name: "PaxHeaders/root", type: "x", bytes: paxRecord("path", "./") }, { name: "placeholder", type: "5" }, { name: "records.json", bytes: Buffer.from("safe") }]);
  expect(verify(backup).status).toBe(0);
});
it("rejects global PAX overrides and excessive local records", () => {
  const backup = archive([{ name: "PaxHeaders/global", type: "g", bytes: paxRecord("path", "records.json") }, { name: "records.json", bytes: Buffer.from("safe") }]);
  expect(verify(backup).status).toBe(2);
  const attributes = Buffer.concat(Array.from({ length: 257 }, (_, index) => paxRecord(`SCHILY.xattr.fixture${index}`, "ignored")));
  expect(verify(paxFixture(attributes)).status).toBe(2);
});
it("still blocks unlisted AppleDouble payloads instead of silently discarding file content", () => {
  const backup = fixture(manifest(), [{ name: "._records.json", bytes: Buffer.from([0, 5, 22, 7, 0, 2, 0, 0]) }]);
  expect(verify(backup).status).toBe(2);
});

const signingKey = "ab".repeat(32);
const authEnvironment = { BACKUP_AUTH_KEY: signingKey, BACKUP_AUTH_REQUIRED: "true" };
it("creates authenticated backups and verifies/restores them through both entry points", () => {
  const backup = create(false, authEnvironment), authFile = `${backup}.auth.json`;
  expect(fs.statSync(authFile).mode & 0o777).toBe(0o600);
  const result = run("restore.mjs", ["--backup", backup, "--verify-only"], authEnvironment);
  expect(result.status).toBe(0); expect(result.output.authenticated).toBe(true); expect(JSON.stringify(result.output)).not.toContain(signingKey);
  expect(run("backup.mjs", ["--verify", backup], authEnvironment).output.authenticated).toBe(true);
  const target = path.join(directory, "authenticated-recovery");
  expect(run("restore.mjs", ["--backup", backup, "--target", target], authEnvironment).output.authenticated).toBe(true);
  expect(fs.readFileSync(path.join(target, "records.json"), "utf8")).toBe("PRIVATE-RAW-RECORDS");
});
it("authenticates encrypted ciphertext before decrypting and exposes no passphrase/key", () => {
  const backup = create(true, authEnvironment), environment = { ...authEnvironment, BACKUP_PASSPHRASE: "fixture-passphrase-very-secret" };
  expect(run("restore.mjs", ["--backup", backup, "--verify-only"], environment).output.authenticated).toBe(true);
  const injection = 'import cp from "node:child_process";import fs from "node:fs";import {syncBuiltinESMExports} from "node:module";cp.spawnSync=()=>{fs.writeFileSync(process.env.DECRYPT_SENTINEL,"invoked");throw new Error("must not decrypt")};syncBuiltinESMExports();';
  const sentinel = path.join(directory, "decrypt-invoked");
  const probeEnvironment = { ...environment, DECRYPT_SENTINEL: sentinel, NODE_OPTIONS: `--import=data:text/javascript,${encodeURIComponent(injection)}` };
  expect(run("restore.mjs", ["--backup", backup, "--verify-only"], probeEnvironment).status).toBe(2);
  expect(fs.existsSync(sentinel)).toBe(true); fs.removeSync(sentinel);
  fs.writeFileSync(backup, "malformed ciphertext");
  const result = run("restore.mjs", ["--backup", backup, "--verify-only"], probeEnvironment);
  expect(result.status).toBe(2); expect(fs.existsSync(sentinel)).toBe(false);
});
it("rejects missing/incorrect keys and unsigned downgrade when a key is configured", () => {
  const signed = create(false, authEnvironment);
  expect(verify(signed).status).toBe(2);
  expect(run("restore.mjs", ["--backup", signed, "--verify-only"], { BACKUP_AUTH_KEY: "cd".repeat(32) }).status).toBe(2);
  fs.removeSync(`${signed}.auth.json`);
  expect(run("restore.mjs", ["--backup", signed, "--verify-only"], { BACKUP_AUTH_KEY: signingKey, BACKUP_AUTH_REQUIRED: "false" }).status).toBe(2);
  expect(verify(signed).output.authenticated).toBe(false);
});
it("rejects rewritten archives even after the attacker updates public checksums and declared fingerprints", () => {
  const backup = create(false, authEnvironment), rewritten = fixture(); fs.copyFileSync(rewritten, backup);
  const bytes = fs.readFileSync(backup), hash = digest(bytes); fs.writeFileSync(`${backup}.sha256`, hash);
  const auth = fs.readJsonSync(`${backup}.auth.json`); auth.archiveSha256 = hash; auth.archiveBytes = bytes.length; fs.writeJsonSync(`${backup}.auth.json`, auth);
  for (const script of ["backup.mjs", "restore.mjs"]) {
    const args = script === "backup.mjs" ? ["--verify", backup] : ["--backup", backup, "--verify-only"];
    expect(run(script, args, authEnvironment).status).toBe(2);
  }
});
it.each(["short", "nonhex", "unicode", "wrong-format", "wrong-size", "extra-field", "malformed", "symlink", "missing"])("rejects invalid authentication records: %s", (kind) => {
  const backup = create(false, authEnvironment), file = `${backup}.auth.json`, auth = fs.readJsonSync(file);
  if (kind === "short") auth.mac = "short";
  if (kind === "nonhex") auth.mac = "g".repeat(64);
  if (kind === "unicode") auth.mac = "é".repeat(64);
  if (kind === "wrong-format") auth.format = "unknown";
  if (kind === "wrong-size") auth.archiveBytes++;
  if (kind === "extra-field") auth.unreviewed = true;
  fs.writeJsonSync(file, auth);
  if (kind === "malformed") fs.writeFileSync(file, "{PRIVATE-RAW-RECORDS");
  if (kind === "symlink") { const other = path.join(directory, "auth-copy.json"); fs.moveSync(file, other); fs.symlinkSync(other, file); }
  if (kind === "missing") fs.removeSync(file);
  const target = path.join(directory, "unchanged-target"); fs.ensureDirSync(target); fs.writeFileSync(path.join(target, "sentinel"), "keep");
  const result = run("restore.mjs", ["--backup", backup, "--target", target, "--force"], authEnvironment);
  expect(result.status).toBe(2); expect(fs.readFileSync(path.join(target, "sentinel"), "utf8")).toBe("keep");
});
it.each([{ BACKUP_AUTH_REQUIRED: "true" }, { BACKUP_AUTH_REQUIRED: "TRUE" }, { BACKUP_AUTH_KEY: "short" }, { BACKUP_AUTH_KEY: "z".repeat(64) }])("rejects invalid authentication policy before creating a backup: %j", (environment) => {
  const result = run("backup.mjs", ["--output", output, "--allow-plaintext"], environment);
  expect(result.status).toBe(2); expect(fs.existsSync(output)).toBe(false);
});
it("keeps unsigned structural verification explicit and does not equate it with authenticity", () => {
  const backup = create();
  expect(run("backup.mjs", ["--verify", backup]).output).toMatchObject({ verified: true, authenticated: false });
  expect(verify(backup).output).toMatchObject({ verified: true, authenticated: false });
});
it("preserves authentication sidecars when archives are renamed and removes them with retention", () => {
  const backup = create(false, authEnvironment), renamed = path.join(output, "renamed.tar.gz");
  for (const suffix of ["", ".sha256", ".auth.json"]) fs.renameSync(`${backup}${suffix}`, `${renamed}${suffix}`);
  expect(run("restore.mjs", ["--backup", renamed, "--verify-only"], authEnvironment).status).toBe(0);
  const first = create(false, authEnvironment);
  const result = run("backup.mjs", ["--output", output, "--allow-plaintext", "--keep", "1"], authEnvironment);
  expect(result.status).toBe(0); expect(result.output.authenticated).toBe(true);
  expect(fs.existsSync(first)).toBe(false); expect(fs.existsSync(`${first}.auth.json`)).toBe(false);
  expect(fs.existsSync(renamed)).toBe(true);
});

it("cleans published sidecars if the final archive rename fails without pruning prior backups", () => {
  const prior = create(false, authEnvironment), original = fs.readFileSync(prior), before = fs.readdirSync(output).sort();
  const injection = 'import fs from "node:fs";const rename=fs.renameSync;fs.renameSync=function(from,to){if(from.includes(".cf-backup-incomplete-")&&(from.endsWith(".tar.gz")||from.endsWith(".tar.gz.enc")))throw new Error("publication failed");return rename.call(this,from,to)};';
  const result = run("backup.mjs", ["--output", output, "--allow-plaintext", "--keep", "1"], { ...authEnvironment, NODE_OPTIONS: `--import=data:text/javascript,${encodeURIComponent(injection)}` });
  expect(result.status).toBe(2); expect(fs.readdirSync(output).sort()).toEqual(before); expect(fs.readFileSync(prior)).toEqual(original);
});
it.each(["oversized", "dangling-symlink", "directory"])("rejects unsafe authentication sidecar storage: %s", (kind) => {
  const backup = create(false, authEnvironment), file = `${backup}.auth.json`; fs.removeSync(file);
  if (kind === "oversized") fs.writeFileSync(file, "x".repeat(4097));
  if (kind === "dangling-symlink") fs.symlinkSync(path.join(directory, "missing-auth"), file);
  if (kind === "directory") fs.mkdirSync(file);
  expect(run("restore.mjs", ["--backup", backup, "--verify-only"], authEnvironment).status).toBe(2);
});

it("restores the authenticated private snapshot if the public archive is replaced after MAC verification", () => {
  const backup = create(false, authEnvironment), target = path.join(directory, "snapshot-recovery");
  const injection = 'import crypto from "node:crypto";import fs from "node:fs";const original=crypto.createHmac;crypto.createHmac=function(...args){const mac=original.apply(this,args),digest=mac.digest;mac.digest=function(...options){const value=digest.apply(this,options);fs.writeFileSync(process.env.REPLACE_ARCHIVE,"tampered public archive");return value};return mac};';
  const result = run("restore.mjs", ["--backup", backup, "--target", target], { ...authEnvironment, REPLACE_ARCHIVE: backup, NODE_OPTIONS: `--import=data:text/javascript,${encodeURIComponent(injection)}` });
  expect(result.status).toBe(0); expect(result.output.authenticated).toBe(true);
  expect(fs.readFileSync(backup, "utf8")).toBe("tampered public archive");
  expect(fs.readFileSync(path.join(target, "records.json"), "utf8")).toBe("PRIVATE-RAW-RECORDS");
});
