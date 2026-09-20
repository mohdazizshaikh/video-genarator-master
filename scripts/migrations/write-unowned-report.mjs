#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const input = path.resolve(process.argv[2] || "/tmp/unowned-records-report.json");
const output = path.resolve(process.argv[3] || "docs/migrations/OWNERSHIP_QUARANTINE_REPORT.md");
const audit = JSON.parse(fs.readFileSync(input, "utf8"));
const records = Array.isArray(audit.records) ? audit.records : [];
const byStore = new Map();
for (const record of records) {
  const store = String(record.store || "unknown");
  byStore.set(store, (byStore.get(store) || 0) + 1);
}
const rows = [...byStore.entries()].sort(([a], [b]) => a.localeCompare(b));
const generatedAt = new Date().toISOString();
const code = (value) => "`" + String(value) + "`";
const lines = [
  "# Ownership Quarantine Report",
  "",
  `Generated: ${generatedAt}`,
  "",
  "> This is a report-only artifact. It does not assign ownership, delete records, or modify source data.",
  "",
  "## Decision",
  "",
  `The inspection found **${records.length} unowned tenant-scoped records**. They remain blocked from migration until an owner-approved mapping or quarantine decision exists.`,
  "",
  "## Store summary",
  "",
  "| Store | Unowned records | Migration action |",
  "|---|---:|---|",
  ...rows.map(([store, count]) => `| ${code(store)} | ${count} | Quarantine pending explicit ownership decision |`),
  "",
  "## Safety invariants",
  "",
  "| Invariant | Result |",
  "|---|---|",
  "| Credentials and secret fields are printed | No |",
  "| Source files modified by inspection | No |",
  "| Ownership inferred automatically | No |",
  "| Unowned records assigned to Aaditech Solution | No |",
  "| Destructive migration performed | No |",
  "",
  "## Required owner decision",
  "",
  "The owner must provide an explicit mapping for each record, or approve quarantine. Until then, the migration must remain fail-closed and `RELEASE_CONTROL_PRIMARY_READS` must remain disabled.",
  "",
  "## Record references",
  "",
  "Only non-secret stable references are included below. Content, credentials, and payload fields are intentionally excluded.",
  "",
  "| Store | Index | Stable reference | Created | Updated |",
  "|---|---:|---|---|---|",
  ...records.map((record) => {
    const reference = record.videoId || record.jobId || record.id || "not-exposed";
    return `| ${code(record.store || "unknown")} | ${Number.isInteger(record.index) ? record.index : "—"} | ${code(reference)} | ${record.createdAt || "—"} | ${record.updatedAt || "—"} |`;
  }),
  "",
];
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${lines.join("\n")}\n`, { mode: 0o600 });
console.log(JSON.stringify({ output, count: records.length, stores: Object.fromEntries(rows), destructive: false }, null, 2));
