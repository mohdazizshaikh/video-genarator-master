#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { isTenantScopedStore } from "./ownership-policy.mjs";

const root = process.cwd();
try { process.loadEnvFile(path.join(root, ".env")); } catch {}
const dataDir = process.env.DATA_DIR_PATH || path.join(root, "data");
const files = fs.existsSync(dataDir) ? fs.readdirSync(dataDir).filter((name) => name.endsWith(".json")).sort() : [];
const stores = files.map((name) => {
  const filePath = path.join(dataDir, name);
  const raw = fs.readFileSync(filePath);
  let validJson = true;
  let value = null;
  try { value = JSON.parse(raw.toString("utf8")); } catch { validJson = false; }
  const records = Array.isArray(value) ? value.length : value && typeof value === "object" ? Object.keys(value).length : 0;
  const tenantKeyCounts = {};
  if (Array.isArray(value)) {
    for (const record of value) {
      const tenantId = !isTenantScopedStore(name) ? "__platform_or_derived__" : record && typeof record === "object" && typeof record.tenantId === "string" && record.tenantId.trim() ? record.tenantId.trim() : "__unowned__";
      tenantKeyCounts[tenantId] = (tenantKeyCounts[tenantId] || 0) + 1;
    }
  }
  return { name, bytes: raw.byteLength, sha256: crypto.createHash("sha256").update(raw).digest("hex"), validJson, records, tenantKeyCounts };
});
const manifestStore = stores.find((store) => store.name === "artifact-manifests.json");
const unownedRecords = stores.reduce((total, store) => total + (isTenantScopedStore(store.name) ? (store.tenantKeyCounts.__unowned__ || 0) : 0), 0);
const result = {
  mode: "reconciliation-report",
  destructive: false,
  authoritativeStore: "file-backed",
  dataDir,
  generatedAt: new Date().toISOString(),
  storeCount: stores.length,
  invalidJsonStores: stores.filter((store) => !store.validJson).map((store) => store.name),
  unownedArrayRecords: unownedRecords,
  artifactManifest: manifestStore ? { present: true, records: manifestStore.records, sha256: manifestStore.sha256 } : { present: false, records: 0 },
  stores,
  blockers: [
    ...(!fs.existsSync(dataDir) ? ["data directory is absent"] : []),
    ...(stores.some((store) => !store.validJson) ? ["one or more JSON stores are malformed"] : []),
    ...(unownedRecords > 0 ? ["unowned array records require quarantine or ownership mapping"] : []),
  ],
  nextAction: "Review this report, back up source data, map or quarantine unowned records, then run approved PostgreSQL/MinIO migration tooling. This command never mutates source files.",
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.blockers.length ? 2 : 0;
