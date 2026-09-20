import fs from "node:fs";
import path from "node:path";
import { isTenantScopedStore } from "./ownership-policy.mjs";

const root = process.cwd();
try { process.loadEnvFile(path.join(root, ".env")); } catch {}
const dataDir = path.resolve(process.env.DATA_DIR_PATH || path.join(root, "data"));
const safeFields = ["id", "name", "title", "label", "profileId", "jobId", "videoId", "releaseId", "createdAt", "updatedAt", "status", "provider", "platform"];
const result = [];
for (const name of fs.readdirSync(dataDir).filter((entry) => entry.endsWith(".json")).sort()) {
  if (!isTenantScopedStore(name)) continue;
  let records;
  try { records = JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8")); } catch { continue; }
  if (!Array.isArray(records)) continue;
  records.forEach((record, index) => {
    if (!record || typeof record !== "object" || typeof record.tenantId !== "string" || !record.tenantId.trim()) {
      const safe = { store: name, index };
      for (const field of safeFields) if (field in record) safe[field] = String(record[field]).slice(0, 160);
      result.push(safe);
    }
  });
}
console.log(JSON.stringify({ mode: "redacted-unowned-inspection", destructive: false, dataDir, count: result.length, records: result, invariants: ["credentials and secret fields are never printed", "source files are never modified", "ownership is never inferred"] }, null, 2));
