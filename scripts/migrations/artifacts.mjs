#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataDir = process.env.DATA_DIR_PATH || path.join(root, "data");
const manifestPath = path.join(dataDir, "artifact-manifests.json");
const requiredApprovals = ["MIGRATION_BACKUP_APPROVED", "MIGRATION_RECONCILIATION_APPROVED", "MIGRATION_ROLLBACK_APPROVED"];
const blockers = [];
if (process.env.MIGRATION_EXECUTE !== "true") blockers.push("MIGRATION_EXECUTE must equal true");
if (process.env.RELEASE_CONTROL_PRIMARY_READS === "true") blockers.push("primary-read cutover must remain disabled during artifact migration");
for (const name of requiredApprovals) if (process.env[name] !== "true") blockers.push(`${name} must equal true`);
for (const name of ["MINIO_ENDPOINT", "MINIO_ACCESS_KEY", "MINIO_SECRET_KEY", "MINIO_BUCKET"]) if (!process.env[name]?.trim()) blockers.push(`${name} is absent`);
let manifests = [];
try { const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf8")); if (!Array.isArray(parsed)) throw new Error("manifest root must be an array"); manifests = parsed; } catch { blockers.push("artifact manifest is unreadable or has an invalid root shape"); }
if (!manifests.length) blockers.push("artifact manifest has no records");
const dataRoot = fs.existsSync(dataDir) ? fs.realpathSync(dataDir) : null;
const prefixFor = (tenantId) => `${tenantId.replace(/[^a-zA-Z0-9_-]/g, "-")}/`;
const prepared = [];
const seenIds = new Set();
const seenKeys = new Set();
const prefixes = new Map();
for (const manifest of manifests) {
  const errors = [];
  if (!manifest || typeof manifest !== "object") errors.push("manifest record is not an object");
  const tenantId = manifest?.tenantId;
  if (typeof manifest?.id !== "string" || !manifest.id.trim() || seenIds.has(manifest.id)) errors.push("manifest identity is missing or duplicated");
  seenIds.add(manifest?.id);
  const objectKey = manifest?.objectKey;
  const localPath = manifest?.localPath;
  if (typeof tenantId !== "string" || !tenantId.trim()) errors.push("tenantId is required");
  if (typeof objectKey !== "string" || !objectKey.trim()) errors.push("objectKey is required");
  if (typeof objectKey === "string") { if (seenKeys.has(objectKey)) errors.push("objectKey is duplicated"); seenKeys.add(objectKey); if (objectKey.split("/").some((part) => part === "." || part === ".." || !part)) errors.push("objectKey has invalid path segments"); }
  if (typeof tenantId === "string") { const prefix = prefixFor(tenantId); if (prefixes.has(prefix) && prefixes.get(prefix) !== tenantId) errors.push("sanitized tenant prefix collides with another owner"); prefixes.set(prefix, tenantId); }
  if (typeof localPath !== "string" || !localPath.trim()) errors.push("localPath is required");
  if (typeof tenantId === "string" && typeof objectKey === "string" && !objectKey.startsWith(prefixFor(tenantId))) errors.push("objectKey is outside tenant prefix");
  let sourcePath = null;
  let stat = null;
  if (dataRoot && typeof localPath === "string") {
    sourcePath = fs.existsSync(localPath) ? fs.realpathSync(localPath) : path.resolve(localPath);
    const isContained = sourcePath === dataRoot || sourcePath.startsWith(`${dataRoot}${path.sep}`);
    if (!isContained) errors.push("localPath is outside DATA_DIR_PATH");
    else if (!fs.existsSync(sourcePath)) errors.push("localPath does not exist");
    else { stat = fs.statSync(sourcePath); if (!stat.isFile()) errors.push("localPath is not a file"); }
  }
  let checksumSha256 = null;
  if (stat && errors.length === 0) checksumSha256 = crypto.createHash("sha256").update(fs.readFileSync(sourcePath)).digest("hex");
  if (checksumSha256 && checksumSha256 !== manifest.checksumSha256) errors.push("source checksum differs from manifest");
  if (!Number.isSafeInteger(manifest?.sizeBytes) || manifest.sizeBytes < 0) errors.push("manifest sizeBytes is required and must be a nonnegative safe integer");
  if (stat && stat.size !== manifest.sizeBytes) errors.push("source size differs from manifest");
  prepared.push({ id: manifest?.id ?? null, tenantId: typeof tenantId === "string" ? tenantId : null, objectKey: typeof objectKey === "string" ? objectKey : null, sourcePath, sizeBytes: stat?.size ?? null, checksumSha256, errors });
}
if (prepared.some((record) => record.errors.length)) blockers.push("one or more artifact manifest records failed local validation");
if (blockers.length) {
  console.log(JSON.stringify({ mode: "artifact-migration", destructive: true, executed: false, records: prepared.map(({ id, tenantId, objectKey, sizeBytes, checksumSha256, errors }) => ({ id, tenantId, objectKey, sizeBytes, checksumSha256, errors })), blockers, invariants: ["no MinIO connection is opened while preconditions fail", "local files are never deleted or rewritten", "source paths must remain inside DATA_DIR_PATH", "object keys must remain under sanitized tenant prefixes", "manifest checksums and sizes must match before upload", "secret values are never printed"] }, null, 2));
  process.exitCode = 2;
} else {
  let client;
  try {
    const { HeadBucketCommand, HeadObjectCommand, PutObjectCommand, S3Client } = await import("@aws-sdk/client-s3");
    client = new S3Client({ endpoint: process.env.MINIO_ENDPOINT, region: process.env.MINIO_REGION || "us-east-1", forcePathStyle: true, credentials: { accessKeyId: process.env.MINIO_ACCESS_KEY, secretAccessKey: process.env.MINIO_SECRET_KEY } });
    await client.send(new HeadBucketCommand({ Bucket: process.env.MINIO_BUCKET }));
    const uploaded = [];
    for (const record of prepared) {
      await client.send(new PutObjectCommand({ Bucket: process.env.MINIO_BUCKET, Key: record.objectKey, Body: fs.createReadStream(record.sourcePath), ContentLength: record.sizeBytes, ContentType: manifests.find((entry) => entry.id === record.id)?.mimeType || "application/octet-stream", Metadata: { sha256: record.checksumSha256, tenantid: record.tenantId } }));
      const head = await client.send(new HeadObjectCommand({ Bucket: process.env.MINIO_BUCKET, Key: record.objectKey }));
      if (Number(head.ContentLength) !== record.sizeBytes || head.Metadata?.sha256 !== record.checksumSha256) throw new Error(`uploaded artifact verification failed for ${record.id}`);
      uploaded.push({ id: record.id, tenantId: record.tenantId, objectKey: record.objectKey, checksumSha256: record.checksumSha256, sizeBytes: record.sizeBytes, metadataVerified: true, contentVerified: false });
    }
    console.log(JSON.stringify({ mode: "artifact-migration", destructive: true, executed: true, bucket: process.env.MINIO_BUCKET, uploaded, invariants: ["local files remain available for rollback", "size and supplied SHA-256 metadata are checked; independent object-content verification is still required", "primary-read cutover remains disabled"] }, null, 2));
  } catch {
    console.error(JSON.stringify({ mode: "artifact-migration", destructive: true, executed: false, error: "Artifact migration failed; inspect the object store and local manifest before retrying", nextAction: "Inspect the object store and local manifest before retrying; local files remain authoritative." }, null, 2));
    process.exitCode = 1;
  } finally {
    client?.destroy();
  }
}
