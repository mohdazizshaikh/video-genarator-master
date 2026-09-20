#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.argv[2] || ".env");
const text = fs.readFileSync(envPath, "utf8");
const values = new Map();
for (const rawLine of text.split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) continue;
  const match = line.match(/^(?:export\s+)?([A-Z0-9_]+)=(.*)$/);
  if (!match) continue;
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  values.set(match[1], value);
}
const required = ["DATABASE_URL", "MINIO_ENDPOINT", "MINIO_ACCESS_KEY", "MINIO_SECRET_KEY", "MINIO_BUCKET", "MINIO_REGION"];
const missing = required.filter((key) => !values.get(key));
const db = values.get("DATABASE_URL") || "";
let parsed = null;
let parseError = null;
try { parsed = new URL(db); } catch (error) { parseError = error instanceof Error ? error.message : "invalid URL"; }
const schemeEnd = db.indexOf("://");
const authorityEnd = schemeEnd >= 0 ? db.indexOf("/", schemeEnd + 3) : -1;
const authority = schemeEnd >= 0 && authorityEnd >= 0 ? db.slice(schemeEnd + 3, authorityEnd) : "";
const urlShape = {
  hasWhitespace: /\s/.test(db),
  atSigns: (db.match(/@/g) || []).length,
  hashSigns: (db.match(/#/g) || []).length,
  questionMarks: (db.match(/\?/g) || []).length,
  percentSigns: (db.match(/%/g) || []).length,
};
let passwordEncodingSafe = false;
try {
  passwordEncodingSafe = Boolean(parsed?.password) && !/[#?\s]/.test(authority) && decodeURIComponent(parsed.password) !== "";
} catch {
  passwordEncodingSafe = false;
}
const result = {
  envPath,
  requiredVariablesPresent: missing.length === 0,
  missingVariables: missing,
  databaseUrl: {
    present: Boolean(db),
    parseable: Boolean(parsed),
    protocol: parsed?.protocol || null,
    host: parsed?.hostname || null,
    passwordEncodingSafe,
    parseError: parseError ? "invalid database URL" : null,
    urlShape,
  },
  secretValuesPrinted: false,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.requiredVariablesPresent && result.databaseUrl.parseable && result.databaseUrl.passwordEncodingSafe ? 0 : 2;
