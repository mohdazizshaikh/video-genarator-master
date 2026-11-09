#!/usr/bin/env node
import path from "node:path";
import { inspectMigrationData } from "./inspect-data.mjs";

const root = process.cwd();
try { process.loadEnvFile(path.join(root, ".env")); } catch { /* Optional env file; preconfigured runs remain supported. */ }
const dataDir = process.env.DATA_DIR_PATH || path.join(root, "data");
const inspection = inspectMigrationData(dataDir);
const manifest = inspection.stores.find((store) => store.name === "artifact-manifests.json");
const result = {
  mode: "reconciliation-report", destructive: false, authoritativeStore: "file-backed", dataDir, generatedAt: new Date().toISOString(),
  storeCount: inspection.stores.length,
  invalidJsonStores: inspection.stores.filter((store) => !store.validJson).map((store) => store.name),
  unownedArrayRecords: inspection.issues.filter((issue) => issue.code === "missing_owner").length,
  artifactManifest: manifest ? { present: true, records: manifest.records, sha256: manifest.sha256 } : { present: false, records: 0 },
  ...inspection,
  blockers: inspection.issues,
  readyForPrimaryReadCutover: false,
  nextAction: "Review issues and mapping/provenance; no ownership is assigned by this read-only report. Passing ownership inspection does not establish SQL/object-store migration coverage or cutover readiness.",
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = inspection.pass ? 0 : 2;
