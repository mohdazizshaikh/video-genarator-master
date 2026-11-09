import fs from "node:fs";
import crypto from "node:crypto";

const FORMAT = "content-factory-full-backup-auth-v1";
export function backupAuthPolicy() {
  const flag = process.env.BACKUP_AUTH_REQUIRED;
  if (flag !== undefined && !["true", "false"].includes(flag)) throw new Error("invalid backup authentication policy");
  const raw = process.env.BACKUP_AUTH_KEY || "";
  if (raw && !/^[a-f0-9]{64}$/i.test(raw)) throw new Error("backup authentication key must be 32 bytes encoded as hex");
  const key = raw ? Buffer.from(raw, "hex") : undefined;
  if (flag === "true" && !key) throw new Error("backup authentication key required");
  return { key, required: flag === "true" || !!key };
}
function fingerprint(archive) {
  const fd = fs.openSync(archive, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try {
    const before = fs.fstatSync(fd);
    if (!before.isFile()) throw new Error("regular archive required");
    const hash = crypto.createHash("sha256"), buffer = Buffer.alloc(1024 * 1024); let count;
    while ((count = fs.readSync(fd, buffer)) > 0) hash.update(buffer.subarray(0, count));
    const after = fs.fstatSync(fd);
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs) throw new Error("archive changed while hashing");
    return { archiveSha256: hash.digest("hex"), archiveBytes: before.size };
  } finally { fs.closeSync(fd); }
}
const macFor = (key, record) => crypto.createHmac("sha256", key).update(`${FORMAT}\n${record.archiveSha256}\n${record.archiveBytes}\n`, "utf8").digest("hex");
export function signBackupArchive(archive) {
  const { key } = backupAuthPolicy();
  if (!key) return false;
  const record = { format: FORMAT, algorithm: "HMAC-SHA256", ...fingerprint(archive) };
  fs.writeFileSync(`${archive}.auth.json`, `${JSON.stringify({ ...record, mac: macFor(key, record) }, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  return true;
}
export function authenticateBackupArchive(archive, contentPath = archive) {
  const { key, required } = backupAuthPolicy();
  const location = `${archive}.auth.json`, stat = fs.lstatSync(location, { throwIfNoEntry: false });
  if (!stat) { if (required) throw new Error("backup authentication sidecar required"); return false; }
  if (!key || stat.isSymbolicLink() || !stat.isFile() || stat.size > 4096) throw new Error("authentication sidecar or key invalid");
  const fd = fs.openSync(location, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  let record;
  try { if (!fs.fstatSync(fd).isFile() || fs.fstatSync(fd).size > 4096) throw new Error("regular bounded authentication sidecar required"); record = JSON.parse(fs.readFileSync(fd, "utf8")); }
  finally { fs.closeSync(fd); }
  if (!record || typeof record !== "object" || Array.isArray(record) || Object.keys(record).sort().join(",") !== "algorithm,archiveBytes,archiveSha256,format,mac" || record.format !== FORMAT || record.algorithm !== "HMAC-SHA256" || !/^[a-f0-9]{64}$/.test(record.archiveSha256) || !Number.isSafeInteger(record.archiveBytes) || record.archiveBytes <= 0 || !/^[a-f0-9]{64}$/.test(record.mac)) throw new Error("invalid authentication record");
  const actual = fingerprint(contentPath);
  if (actual.archiveSha256 !== record.archiveSha256 || actual.archiveBytes !== record.archiveBytes || !crypto.timingSafeEqual(Buffer.from(macFor(key, record), "hex"), Buffer.from(record.mac, "hex"))) throw new Error("backup authentication failed");
  return true;
}
