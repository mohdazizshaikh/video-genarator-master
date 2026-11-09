#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const valueFor = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
const evidencePath = valueFor("--file") || process.env.MIGRATION_EVIDENCE_PATH;
const key = process.env.MIGRATION_EVIDENCE_HMAC_KEY;
const errors = [];
let evidence;
const canonical = (value) => { if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`; if (value && typeof value === "object") return `{${Object.keys(value).sort().map((name) => `${JSON.stringify(name)}:${canonical(value[name])}`).join(",")}}`; return JSON.stringify(value); };
if (!evidencePath) errors.push("--file or MIGRATION_EVIDENCE_PATH is required");
if (!key?.trim()) errors.push("MIGRATION_EVIDENCE_HMAC_KEY is absent");
if (evidencePath) try { evidence = JSON.parse(fs.readFileSync(path.resolve(evidencePath), "utf8")); } catch { errors.push("evidence file is unreadable"); }
if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) errors.push("evidence must be an object");
let signatureValid = false;
if (evidence && typeof evidence === "object" && !Array.isArray(evidence)) {
  if (evidence.version !== 1) errors.push("evidence version must be 1");
  if (typeof evidence.recordedAt !== "string" || !Number.isFinite(Date.parse(evidence.recordedAt)) || typeof evidence.approvedBy !== "string" || !evidence.approvedBy.trim()) errors.push("recordedAt and approvedBy are required");
  if (evidence.backup?.verified !== true) errors.push("backup.verified must be true");
  if (evidence.readVerify?.match !== true || evidence.readVerify?.sourceHash !== evidence.readVerify?.durableHash || !/^[a-f0-9]{64}$/.test(evidence.readVerify?.sourceHash || "") || !/^[a-f0-9]{64}$/.test(evidence.readVerify?.durableHash || "")) errors.push("readVerify must contain matching sourceHash and durableHash values");
  if (evidence.rollback?.rehearsed !== true || evidence.rollback?.result !== "restored") errors.push("rollback rehearsal must be recorded as restored");
  if (evidence.tenantIsolation?.passed !== true) errors.push("tenantIsolation.passed must be true");
  const unsigned = { version: evidence.version, recordedAt: evidence.recordedAt, approvedBy: evidence.approvedBy, backup: evidence.backup, readVerify: evidence.readVerify, rollback: evidence.rollback, tenantIsolation: evidence.tenantIsolation };
  if (key && typeof evidence.signature === "string") {
    const expected = crypto.createHmac("sha256", key).update(canonical(unsigned), "utf8").digest("hex");
    signatureValid = /^[a-f0-9]{64}$/.test(evidence.signature) && crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(evidence.signature, "hex"));
    if (!signatureValid) errors.push("evidence signature is invalid");
  } else errors.push("evidence signature is required");
}
const result = { mode: "migration-evidence-validation", destructive: false, applied: false, signatureValid, evidencePath: evidencePath ? path.resolve(evidencePath) : null, valid: errors.length === 0, errors, invariants: ["evidence is validated but never applied", "source data and durable services are never modified", "secret keys and signature values are never printed", "read-verify, rollback, and tenant isolation must be explicit"] };
console.log(JSON.stringify(result, null, 2));
process.exitCode = errors.length ? 2 : 0;
