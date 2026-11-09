import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterEach, beforeEach, expect, it } from "vitest";
const script = path.resolve(__dirname, "../../scripts/migrations/backup.mjs");
let directory: string, data: string, output: string;
beforeEach(() => { directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "migration-backup-"))); data = path.join(directory, "data"); output = path.join(directory, "output"); fs.ensureDirSync(data); fs.writeFileSync(path.join(data, "records.json"), "{PRIVATE-MALFORMED-RAW"); });
afterEach(() => fs.removeSync(directory));
function run(args: string[]) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: directory, env: { PATH: process.env.PATH || "" }, encoding: "utf8", timeout: 10000 });
  expect(result.error).toBeUndefined(); expect(result.stderr).toBe("");
  expect(result.stdout).not.toContain("PRIVATE-MALFORMED-RAW");
  return { status: result.status, output: JSON.parse(result.stdout) };
}
function create() { const result = run(["--data-dir", data, "--output", output]); expect(result.status).toBe(0); return result.output.backupPath as string; }
function edit(backup: string, mutation: (manifest: { files: { path: string; bytes: number; sha256: string }[]; format: string }) => void) { const file = path.join(backup, "BACKUP_MANIFEST.json"), manifest = fs.readJsonSync(file); mutation(manifest); fs.writeJsonSync(file, manifest); }
function verify(backup: string) { return run(["--verify", "--backup", backup]); }
it("copies malformed bytes and nested tenant namespaces with restricted permissions and no source changes", () => {
  const nested = path.join(data, "tenant-state/owner/nested/backups"); fs.ensureDirSync(nested); fs.writeJsonSync(path.join(nested, "state.json"), { tenantId: "A" });
  fs.writeFileSync(path.join(data, ".env"), "PRIVATE-ENV");
  const before = fs.readFileSync(path.join(data, "records.json"));
  const backup = create();
  expect(fs.readFileSync(path.join(backup, "records.json"))).toEqual(before);
  expect(fs.readFileSync(path.join(data, "records.json"))).toEqual(before);
  expect(fs.existsSync(path.join(backup, ".env"))).toBe(false);
  expect(fs.existsSync(path.join(backup, "tenant-state/owner/nested/backups/state.json"))).toBe(true);
  expect(fs.statSync(backup).mode & 0o777).toBe(0o700);
  expect(fs.statSync(path.join(backup, "records.json")).mode & 0o777).toBe(0o600);
  expect(verify(backup).output).toMatchObject({ verified: true, restoreRehearsed: false, encrypted: false, fileCount: 2 });
});
it("uses unique destinations and does not replace previous backups", () => {
  const first = create(), original = fs.readFileSync(path.join(first, "BACKUP_MANIFEST.json"));
  const second = create(); expect(second).not.toBe(first);
  expect(fs.readFileSync(path.join(first, "BACKUP_MANIFEST.json"))).toEqual(original);
  expect(fs.readdirSync(output).filter((name) => name.startsWith(".metadata-incomplete-"))).toEqual([]);
});
it.each(["../outside.json", "/outside.json", "nested/../../outside.json", "a\\b.json", "C:/outside.json", "a//b.json", "./records.json"])("rejects unsafe manifest path %s", (unsafe) => {
  const backup = create(); edit(backup, (manifest) => { manifest.files[0].path = unsafe; }); expect(verify(backup).status).toBe(2);
});
it.each(["empty", "duplicate", "wrong-format", "bad-hash", "bad-size", "missing-entry"])("rejects malformed or incomplete manifests: %s", (kind) => {
  const backup = create(); edit(backup, (manifest) => {
    if (kind === "empty" || kind === "missing-entry") manifest.files = [];
    if (kind === "duplicate") manifest.files.push({ ...manifest.files[0] });
    if (kind === "wrong-format") manifest.format = "unknown";
    if (kind === "bad-hash") manifest.files[0].sha256 = "invalid";
    if (kind === "bad-size") manifest.files[0].bytes = -1;
  }); expect(verify(backup).status).toBe(2);
});
it.each(["changed", "missing", "extra-json", "extra-binary", "symlink-file", "symlink-directory", "symlink-manifest"])("rejects backup tampering: %s", (kind) => {
  fs.ensureDirSync(path.join(data, "nested")); fs.writeJsonSync(path.join(data, "nested/state.json"), {});
  const backup = create(), file = path.join(backup, "records.json");
  if (kind === "changed") fs.writeFileSync(file, "changed");
  if (kind === "missing") fs.removeSync(file);
  if (kind.startsWith("extra")) fs.writeFileSync(path.join(backup, kind === "extra-json" ? "extra.json" : "extra.bin"), "extra");
  if (kind === "symlink-file") { fs.removeSync(file); fs.symlinkSync(path.join(data, "records.json"), file); }
  if (kind === "symlink-directory") { fs.removeSync(path.join(backup, "nested")); fs.symlinkSync(path.join(data, "nested"), path.join(backup, "nested")); }
  if (kind === "symlink-manifest") { fs.moveSync(path.join(backup, "BACKUP_MANIFEST.json"), path.join(directory, "manifest.json")); fs.symlinkSync(path.join(directory, "manifest.json"), path.join(backup, "BACKUP_MANIFEST.json")); }
  expect(verify(backup).status).toBe(2);
});
it("rejects symlinked source files, directories and source root", () => {
  const outside = path.join(directory, "outside.json"); fs.writeJsonSync(outside, {});
  fs.symlinkSync(outside, path.join(data, "linked.json"));
  expect(run(["--data-dir", data, "--output", output]).status).toBe(2);
  fs.removeSync(path.join(data, "linked.json")); fs.symlinkSync(directory, path.join(data, "linked-directory"));
  expect(run(["--data-dir", data, "--output", output]).status).toBe(2);
  fs.removeSync(path.join(data, "linked-directory")); const alias = path.join(directory, "alias"); fs.symlinkSync(data, alias);
  expect(run(["--data-dir", alias, "--output", output]).status).toBe(2);
});
it("excludes only declared root backup and whisper runtime namespaces", () => {
  fs.ensureDirSync(path.join(data, "libs/whisper")); fs.writeJsonSync(path.join(data, "libs/whisper/vendor.json"), {});
  fs.ensureDirSync(path.join(data, "backups")); fs.writeJsonSync(path.join(data, "backups/prior.json"), {});
  const backup = create(); expect(verify(backup).output.fileCount).toBe(1);
});
it("supports the default root backup folder but rejects custom nested output and symlinked output", () => {
  const result = run(["--data-dir", data]); expect(result.status).toBe(0); expect(verify(result.output.backupPath).status).toBe(0);
  expect(run(["--data-dir", data, "--output", path.join(data, "custom-output")]).status).toBe(2);
  fs.ensureDirSync(output); const alias = path.join(directory, "output-alias"); fs.symlinkSync(output, alias);
  expect(run(["--data-dir", data, "--output", alias]).status).toBe(2);
});
it("fails closed for missing arguments, missing data, empty data and malformed manifest JSON", () => {
  expect(run(["--verify"]).status).toBe(2);
  expect(run(["--verify", "--backup"]).status).toBe(2);
  expect(run(["--data-dir", path.join(directory, "missing")]).status).toBe(2);
  const backup = create(); fs.writeFileSync(path.join(backup, "BACKUP_MANIFEST.json"), "{PRIVATE-MALFORMED-RAW"); expect(verify(backup).status).toBe(2);
  fs.removeSync(path.join(data, "records.json")); expect(run(["--data-dir", data, "--output", output]).status).toBe(2);
});
it("rejects omitted manifest entries even when other valid files remain", () => {
  fs.writeJsonSync(path.join(data, "second.json"), {}); const backup = create();
  edit(backup, (manifest) => { manifest.files.pop(); }); expect(verify(backup).status).toBe(2);
});
it("does not treat a rewritten manifest and changed bytes as cryptographic authenticity", () => {
  const backup = create(), bytes = Buffer.from("changed by backup owner"); fs.writeFileSync(path.join(backup, "records.json"), bytes);
  edit(backup, (manifest) => { manifest.files[0].bytes = bytes.length; manifest.files[0].sha256 = crypto.createHash("sha256").update(bytes).digest("hex"); });
  // SHA-256 integrity is intentionally distinct from signed/off-host authenticity.
  expect(verify(backup).output.verified).toBe(true);
});

it("cleans only its staging directory when final publication fails", () => {
  fs.ensureDirSync(output); fs.writeFileSync(path.join(output, "existing-backup-sentinel"), "keep");
  const before = fs.readFileSync(path.join(data, "records.json"));
  const injection = 'import fs from "node:fs";fs.renameSync=()=>{throw new Error("PRIVATE-FAILURE")};';
  const result = spawnSync(process.execPath, ["--import", `data:text/javascript,${encodeURIComponent(injection)}`, script, "--data-dir", data, "--output", output], { cwd: directory, env: { PATH: process.env.PATH || "" }, encoding: "utf8", timeout: 10000 });
  expect(result.status).toBe(2); expect(result.stdout).not.toContain("PRIVATE-FAILURE");
  expect(fs.readdirSync(output)).toEqual(["existing-backup-sentinel"]);
  expect(fs.readFileSync(path.join(data, "records.json"))).toEqual(before);
});

it("rejects source bytes that change between copy and recheck", () => {
  const source = path.join(data, "records.json"), original = fs.readFileSync(source);
  const injection = `import fs from "node:fs";
const originalOpen=fs.openSync, originalRead=fs.readFileSync, originalClose=fs.closeSync;
const tracked=new Set();let reads=0;
fs.openSync=function(file,...args){const fd=originalOpen.call(this,file,...args);if(file===${JSON.stringify(source)})tracked.add(fd);return fd};
fs.closeSync=function(fd){tracked.delete(fd);return originalClose.call(this,fd)};
fs.readFileSync=function(file,...args){if(tracked.has(file)&&++reads===2)return Buffer.from("different bytes");return originalRead.call(this,file,...args)};`;
  const result = spawnSync(process.execPath, ["--import", `data:text/javascript,${encodeURIComponent(injection)}`, script, "--data-dir", data, "--output", output], { cwd: directory, env: { PATH: process.env.PATH || "" }, encoding: "utf8", timeout: 10000 });
  expect(result.status).toBe(2); expect(JSON.parse(result.stdout).created).toBe(false);
  expect(fs.readdirSync(output)).toEqual([]); expect(fs.readFileSync(source)).toEqual(original);
});
