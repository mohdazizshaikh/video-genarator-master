#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const argValue = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
const root = process.cwd();
const dataDir = argValue("--data-dir") || process.env.DATA_DIR_PATH || path.join(root, "data");
const mappingPath = argValue("--mapping-manifest");
const files = fs.existsSync(dataDir) ? fs.readdirSync(dataDir).filter((name) => name.endsWith(".json")).sort() : [];
const mapping = new Map();
const mappingErrors = [];
if (mappingPath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.resolve(mappingPath), "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) mappingErrors.push("mapping manifest must be an object");
    else for (const [key, tenantId] of Object.entries(parsed)) {
      if (!key.trim() || typeof tenantId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(tenantId)) mappingErrors.push(`invalid tenant mapping for ${key}`);
      else mapping.set(key, tenantId);
    }
  } catch (error) { mappingErrors.push(`mapping manifest unreadable: ${error.message}`); }
}
const stores = [];
for (const name of files) {
  const filePath = path.join(dataDir, name);
  const raw = fs.readFileSync(filePath);
  const before = crypto.createHash("sha256").update(raw).digest("hex");
  let value;
  let validJson = true;
  try { value = JSON.parse(raw.toString("utf8")); } catch { validJson = false; }
  const unownedIndexes = [];
  if (Array.isArray(value)) value.forEach((record, index) => {
    if (!record || typeof record !== "object" || typeof record.tenantId !== "string" || !record.tenantId.trim()) unownedIndexes.push(index);
  });
  stores.push({ name, path: filePath, validJson, sha256Before: before, records: Array.isArray(value) ? value.length : value && typeof value === "object" ? Object.keys(value).length : 0, unownedIndexes, proposedAction: validJson ? (unownedIndexes.length ? (mapping.has(name) ? "map only after owner approval" : "quarantine pending explicit mapping") : "no action") : "quarantine raw bytes pending owner approval" });
}
const blockers = [
  ...(!fs.existsSync(dataDir) ? ["data directory is absent"] : []),
  ...stores.filter((store) => !store.validJson).map((store) => `malformed JSON: ${store.name}`),
  ...stores.filter((store) => store.unownedIndexes.length && !mapping.has(store.name)).map((store) => `unowned records without mapping: ${store.name}`),
  ...mappingErrors,
];
const result = { mode: "dry-run-remediation-plan", destructive: false, writesPerformed: false, dataDir, mappingManifest: mappingPath ? path.resolve(mappingPath) : null, generatedAt: new Date().toISOString(), stores, blockers, invariants: ["source files are never overwritten or deleted", "no tenant is inferred from filenames, timestamps, or content", "mapping manifest is validated but never applied", "owner approval is required before quarantine or tenant assignment"], nextAction: blockers.length ? "Resolve blockers and obtain owner approval; rerun this dry-run before any separate migration executor is introduced." : "Review the proposed actions and obtain owner approval; this command still performs no mutation." };
console.log(JSON.stringify(result, null, 2));
process.exitCode = blockers.length ? 2 : 0;
