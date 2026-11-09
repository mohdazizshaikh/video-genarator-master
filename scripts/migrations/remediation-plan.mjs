#!/usr/bin/env node
import { inspectMigrationData } from "./inspect-data.mjs";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const argValue = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
const root = process.cwd();
const dataDir = argValue("--data-dir") || process.env.DATA_DIR_PATH || path.join(root, "data");
const mappingPath = argValue("--mapping-manifest");
const inspection = inspectMigrationData(dataDir);
const mapping = new Map();
const mappingErrors = [];
if (mappingPath) {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.resolve(mappingPath), "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) mappingErrors.push("mapping manifest must be an object");
    else for (const [key, tenantId] of Object.entries(parsed)) {
      if (!key.trim() || typeof tenantId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(tenantId)) mappingErrors.push("invalid tenant mapping");
      else mapping.set(key, tenantId);
    }
  } catch { mappingErrors.push("mapping manifest unreadable"); }
}
const stores = inspection.stores.map((store) => {
  const issues = inspection.issues.filter((issue) => issue.file === store.name);
  const unownedIndexes = issues.filter((issue) => issue.code === "missing_owner" && issue.index !== undefined).map((issue) => issue.index);
  return { ...store, sha256Before: store.sha256, unownedIndexes, issues, mappingProposed: mapping.has(store.name), proposedAction: issues.length ? "review issues and obtain explicit provenance; mapping proposal does not resolve blockers" : "no ownership issue identified; migration mapping remains separate" };
});
const blockers = [...inspection.issues, ...mappingErrors.map((code) => ({ file: "mapping-manifest", code }))];
const result = { mode: "dry-run-remediation-plan", destructive: false, writesPerformed: false, dataDir, mappingManifest: mappingPath ? path.resolve(mappingPath) : null, generatedAt: new Date().toISOString(), stores, blockers, unknownStores: inspection.unknownStores, workspaceRegistryChecked: inspection.workspaceRegistryChecked, readyForPrimaryReadCutover: false, invariants: ["source files are never overwritten or deleted", "no tenant is inferred from filenames, timestamps, or content", "mapping manifest is validated but never applied", "owner approval is required before quarantine or tenant assignment"], nextAction: blockers.length ? "Resolve blockers and obtain owner approval; rerun this dry-run before any separate migration executor is introduced." : "Review the proposed actions and obtain owner approval; this command still performs no mutation." };
console.log(JSON.stringify(result, null, 2));
process.exitCode = blockers.length ? 2 : 0;
