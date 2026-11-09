import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { beforeEach, afterEach, expect, it } from "vitest";
const project = path.resolve(__dirname, "../..");
const key = "isolated-review-helper-signing-key";
let directory: string;
let data: string;
beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), "migration-review-")); data = path.join(directory, "data"); fs.ensureDirSync(data); });
afterEach(() => fs.removeSync(directory));
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([name, entry]) => `${JSON.stringify(name)}:${canonical(entry)}`).join(",")}}`;
  return JSON.stringify(value);
}
function sign(value: Record<string, unknown>) { return { ...value, signature: crypto.createHmac("sha256", key).update(canonical(value)).digest("hex") }; }
function run(script: string, manifest?: unknown, extraArgs: string[] = []) {
  const args = [path.join(project, "scripts/migrations", script)];
  if (manifest !== undefined) {
    const file = path.join(directory, "review.json"); fs.writeJsonSync(file, manifest);
    args.push(script === "evidence.mjs" ? "--file" : "--manifest", file);
  }
  args.push(...extraArgs);
  const result = spawnSync(process.execPath, args, { cwd: directory, env: { PATH: process.env.PATH || "", DATA_DIR_PATH: data, RECONCILIATION_MANIFEST_HMAC_KEY: key, MIGRATION_EVIDENCE_HMAC_KEY: key }, encoding: "utf8", timeout: 10000 });
  expect(result.error).toBeUndefined(); expect(result.stderr).toBe("");
  return { status: result.status, output: JSON.parse(result.stdout), raw: result.stdout };
}
const evidence = () => ({ version: 1, recordedAt: "2026-10-28T00:00:00Z", approvedBy: "fixture-operator", backup: { verified: true }, readVerify: { match: true, sourceHash: "a".repeat(64), durableHash: "a".repeat(64) }, rollback: { rehearsed: true, result: "restored" }, tenantIsolation: { passed: true } });
const decision = () => ({ version: 1, approvedBy: "fixture-operator", approvedAt: "2026-10-28T00:00:00Z", decisions: [] });
it("accepts correctly signed evidence with equal read-verify hashes", () => {
  const result = run("evidence.mjs", sign(evidence()));
  expect(result.status).toBe(0); expect(result.output.valid).toBe(true); expect(result.output.applied).toBe(false);
});
it("rejects a correctly signed false equality claim", () => {
  const value = evidence(); value.readVerify.durableHash = "b".repeat(64);
  const result = run("evidence.mjs", sign(value));
  expect(result.status).toBe(2); expect(result.output.signatureValid).toBe(true); expect(result.output.valid).toBe(false);
});
it.each(["short", "é".repeat(64), "g".repeat(64), "0".repeat(64)])("handles malformed/incorrect signatures without crashing: %s", (signature) => {
  for (const script of ["evidence.mjs", "reconciliation-decision.mjs"]) {
    const result = run(script, { ...(script === "evidence.mjs" ? evidence() : decision()), signature });
    expect(result.status).toBe(2); expect(result.raw).not.toContain(key); expect(result.raw).not.toContain(signature);
  }
});
it("rejects invalid signed evidence metadata", () => {
  const result = run("evidence.mjs", sign({ ...evidence(), recordedAt: "invalid", approvedBy: {} }));
  expect(result.status).toBe(2); expect(result.output.signatureValid).toBe(true);
});
it("does not treat derived attempts, workspaceId arrays, profiles or registries as unowned flat rows", () => {
  fs.writeJsonSync(path.join(data, "auth-tenants.json"), [{ id: "A", apiKey: "PRIVATE-KEY" }]);
  fs.writeJsonSync(path.join(data, "tenants.json"), [{ id: "A", apiKeys: {} }]);
  fs.writeJsonSync(path.join(data, "publishJobs.json"), [{ id: "job", tenantId: "A" }]);
  fs.writeJsonSync(path.join(data, "publishAttempts.json"), [{ id: "attempt", publishJobId: "job", responseBody: "PRIVATE-RESPONSE" }]);
  fs.writeJsonSync(path.join(data, "connector-secrets.json"), []);
  const plan = run("remediation-plan.mjs"); expect(plan.status).toBe(0); expect(plan.output.blockers).toEqual([]);
  const review = run("reconciliation-decision.mjs", sign(decision())); expect(review.status).toBe(0); expect(review.output.expectedDecisionCount).toBe(0);
  expect(plan.raw + review.raw).not.toContain("PRIVATE-");
});
it("retains unknown, provenance and relationship blockers in both helpers", () => {
  fs.writeJsonSync(path.join(data, "unknown.json"), { body: "PRIVATE-CONTENT" });
  fs.writeJsonSync(path.join(data, "hook-library.json"), [{ id: "hook_builtin_1" }]);
  fs.writeJsonSync(path.join(data, "publishAttempts.json"), [{ publishJobId: "absent" }]);
  const plan = run("remediation-plan.mjs"); expect(plan.status).toBe(2);
  expect(plan.output.blockers.map((issue: { code: string }) => issue.code)).toEqual(expect.arrayContaining(["unreviewed_store_policy", "legacy_state_requires_provenance", "orphan_or_ambiguous_publish_attempt"]));
  const review = run("reconciliation-decision.mjs", sign(decision())); expect(review.status).toBe(2); expect(review.output.signed).toBe(true); expect(review.output.sourceInspectionPass).toBe(false);
  expect(plan.raw + review.raw).not.toContain("PRIVATE-CONTENT");
});
it("mapping proposals do not clear source blockers or modify records", () => {
  const source = path.join(data, "renderJobs.json"); fs.writeJsonSync(source, [{ id: "job" }]);
  const before = fs.readFileSync(source);
  const manifest = sign({ ...decision(), decisions: [{ store: "renderJobs.json", index: 0, action: "map", tenantId: "A" }] });
  const result = run("reconciliation-decision.mjs", manifest);
  expect(result.status).toBe(2); expect(result.output.missing).toEqual([]); expect(result.output.sourceInspectionPass).toBe(false);
  expect(fs.readFileSync(source)).toEqual(before);
});
it("handles missing source directories and symlinked stores without following them", () => {
  fs.removeSync(data); expect(run("remediation-plan.mjs").status).toBe(2);
  fs.ensureDirSync(data); const outside = path.join(directory, "outside.json"); fs.writeJsonSync(outside, [{ tenantId: "A", body: "PRIVATE-OUTSIDE" }]);
  fs.symlinkSync(outside, path.join(data, "renderJobs.json"));
  expect(run("remediation-plan.mjs").output.blockers.map((issue: { code: string }) => issue.code)).toContain("symlink_not_inspected");
  const result = run("reconciliation-decision.mjs", sign(decision())); expect(result.status).toBe(2); expect(result.raw).not.toContain("PRIVATE-OUTSIDE");
});

it("does not let a file-level mapping proposal clear a missing-owner finding", () => {
  fs.writeJsonSync(path.join(data, "renderJobs.json"), [{ id: "job" }]);
  const mapping = path.join(directory, "mapping.json"); fs.writeJsonSync(mapping, { "renderJobs.json": "A" });
  const result = run("remediation-plan.mjs", undefined, ["--mapping-manifest", mapping]);
  expect(result.status).toBe(2); expect(result.output.stores[0].mappingProposed).toBe(true);
  expect(result.output.blockers[0].code).toBe("missing_owner");
});
it("sanitizes malformed manifest parse failures", () => {
  const mapping = path.join(directory, "mapping.json"); fs.writeFileSync(mapping, "{PRIVATE-PARSE-CONTENT");
  const result = run("remediation-plan.mjs", undefined, ["--mapping-manifest", mapping]);
  expect(result.status).toBe(2); expect(result.raw).not.toContain("PRIVATE-PARSE-CONTENT");
});
