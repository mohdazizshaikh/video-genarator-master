#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const valueFor = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
const root = process.cwd();
const dataDir = path.resolve(valueFor("--data-dir") || process.env.DATA_DIR_PATH || path.join(root, "data"));
const manifestPath = valueFor("--manifest");
const errors = [];
const decisions = [];
let signed = false;
const canonical = (value) => { if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`; if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`; return JSON.stringify(value); };
const validTenant = (value) => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const requiredKey = process.env.RECONCILIATION_MANIFEST_HMAC_KEY;
if (!requiredKey?.trim()) errors.push("RECONCILIATION_MANIFEST_HMAC_KEY is absent");
if (!manifestPath) errors.push("--manifest is required");
let manifest;
if (manifestPath) {
  try { manifest = JSON.parse(fs.readFileSync(path.resolve(manifestPath), "utf8")); } catch (error) { errors.push(`decision manifest is unreadable: ${error instanceof Error ? error.message : "unknown error"}`); }
}
if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) errors.push("decision manifest must be an object");
if (manifest && typeof manifest === "object" && !Array.isArray(manifest)) {
  if (manifest.version !== 1) errors.push("decision manifest version must be 1");
  if (!manifest.approvedBy || !manifest.approvedAt) errors.push("approvedBy and approvedAt are required");
  if (!Array.isArray(manifest.decisions)) errors.push("decisions must be an array");
  const unsigned = { version: manifest.version, approvedBy: manifest.approvedBy, approvedAt: manifest.approvedAt, decisions: manifest.decisions };
  if (requiredKey && typeof manifest.signature === "string") {
    const expected = crypto.createHmac("sha256", requiredKey).update(canonical(unsigned), "utf8").digest("hex");
    signed = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(manifest.signature));
    if (!signed) errors.push("decision manifest signature is invalid");
  } else errors.push("decision manifest signature is required");
  if (Array.isArray(manifest.decisions)) for (const decision of manifest.decisions) {
    const store = decision?.store;
    const index = decision?.index;
    const action = decision?.action;
    if (typeof store !== "string" || !store.endsWith(".json")) errors.push("each decision requires a JSON store name");
    if (!(Number.isInteger(index) && index >= 0) && action !== "quarantine-store") errors.push(`decision index is invalid for ${store ?? "unknown"}`);
    if (!["map", "quarantine", "quarantine-store"].includes(action)) errors.push(`decision action is invalid for ${store ?? "unknown"}`);
    if (action === "map" && !validTenant(decision.tenantId)) errors.push(`mapped decision requires a valid tenantId for ${store ?? "unknown"}:${index}`);
    decisions.push({ store, index: Number.isInteger(index) ? index : null, action, tenantId: action === "map" ? decision.tenantId : undefined });
  }
}
const expected = [];
if (fs.existsSync(dataDir)) for (const store of fs.readdirSync(dataDir).filter((name) => name.endsWith(".json")).sort()) {
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(path.join(dataDir, store), "utf8")); } catch { expected.push(`${store}:malformed`); continue; }
  if (Array.isArray(parsed)) parsed.forEach((record, index) => { if (!record || typeof record !== "object" || typeof record.tenantId !== "string" || !record.tenantId.trim()) expected.push(`${store}:${index}`); });
}
const keys = decisions.map((decision) => `${decision.store}:${decision.index === null ? "malformed" : decision.index}`);
const duplicateKeys = keys.filter((key, index) => keys.indexOf(key) !== index);
const missing = expected.filter((key) => !keys.includes(key));
const unexpected = keys.filter((key) => !expected.includes(key));
if (duplicateKeys.length) errors.push(`duplicate decisions: ${[...new Set(duplicateKeys)].join(", ")}`);
if (missing.length) errors.push(`missing decisions: ${missing.join(", ")}`);
if (unexpected.length) errors.push(`unexpected decisions: ${unexpected.join(", ")}`);
const result = { mode: "reconciliation-decision-validation", destructive: false, applied: false, signed, dataDir, manifest: manifestPath ? path.resolve(manifestPath) : null, expectedDecisionCount: expected.length, suppliedDecisionCount: decisions.length, errors, missing, unexpected, invariants: ["decisions are validated but never applied", "source files are never modified", "no tenant ownership is inferred", "HMAC key and signature are never printed", "quarantine and mapping require explicit owner approval"] };
console.log(JSON.stringify(result, null, 2));
process.exitCode = errors.length ? 2 : 0;
