import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { TENANT_SCOPED_STORES } from "./ownership-policy.mjs";

const wrappers = {
  "content-versions.json": { versions: "workspaceId" },
  "connectors.json": { connectors: "workspaceId", destinations: "workspaceId" },
  "releases.json": { releases: "workspaceId", targets: "workspaceId" },
};
const arrays = { "artifact-manifests.json": ["artifacts", "tenantId"], "connector-secrets.json": ["secrets", "workspaceId"], "render-executions.json": ["renderExecutions", "tenantId"], "publish-executions.json": ["publishExecutions", "tenantId"], "publishAttempts.json": ["attempts", null], "publishJobs.json": ["publishJobs", "tenantId"], "renderJobs.json": ["renderJobs", "tenantId"] };
const reviewedLegacyStores = new Set(["customNewsSources.json", "contentAutomationRules.json", "tenants.json", "branding.json", "ai-learning-model.json", "hook-library.json", "knowledge-base.json", "resource-snapshots.json"]);
const object = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const envelope = (value) => typeof value === "string" && /^[A-Za-z0-9+/]+={0,2}$/.test(value) && Buffer.from(value, "base64").length > 32;
const shared = new Set(["migration-checkpoints.json", "auth-tenants.json"]);
const owner = (value) => typeof value === "string" && value.trim() ? value : undefined;

/** Metadata/ownership inspection only. Never decrypt, infer a tenant, mutate
 * records, connect to services or return document/credential values. */
function inspectData(dataDir) {
  const issues = [], stores = [], unknownStores = [], excludedNamespaces = [], collections = new Map();
  let registryIds;
  const issue = (file, code, collection, index) => issues.push({ file, code, ...(collection ? { collection } : {}), ...(index !== undefined ? { index } : {}) });
  const add = (file, name, rows, field, summary) => {
    if (!Array.isArray(rows)) { issue(file, "invalid_collection_shape", name); return; }
    const existing = collections.get(name) || [];
    rows.forEach((record, index) => {
      const ownedBy = field && owner(record?.[field]);
      if (!record || typeof record !== "object" || Array.isArray(record)) issue(file, "invalid_record", name, index);
      else if (field && !ownedBy) issue(file, "missing_owner", name, index);
      if (record?.tenantId !== undefined && record?.workspaceId !== undefined && record.tenantId !== record.workspaceId) issue(file, "conflicting_owner_fields", name, index);
      const entry = { file, name, index, record, owner: ownedBy, summary }; existing.push(entry);
      if (ownedBy) summary.tenantKeyCounts[ownedBy] = (summary.tenantKeyCounts[ownedBy] || 0) + 1;
    });
    summary.records += rows.length; collections.set(name, existing);
  };
  if (!fs.existsSync(dataDir) || !fs.lstatSync(dataDir).isDirectory()) return { stores, issues: [{ file: ".", code: "data_directory_absent_or_invalid" }], unknownStores, workspaceRegistryChecked: false, pass: false };
  const read = (absolute, relative) => {
    if (fs.lstatSync(absolute).isSymbolicLink()) { issue(relative, "symlink_not_inspected"); return; }
    const summary = { name: relative, bytes: 0, sha256: null, validJson: false, records: 0, tenantKeyCounts: Object.create(null), classification: "unknown" };
    stores.push(summary);
    try { const raw = fs.readFileSync(absolute); summary.bytes = raw.length; summary.sha256 = crypto.createHash("sha256").update(raw).digest("hex"); const value = JSON.parse(raw.toString("utf8")); summary.validJson = true; return { value, summary }; }
    catch { issue(relative, "unreadable_or_malformed_json"); }
  };
  for (const name of fs.readdirSync(dataDir).filter((entry) => entry.endsWith(".json")).sort()) {
    const parsed = read(path.join(dataDir, name), name); if (!parsed) continue;
    const { value, summary } = parsed;
    if (wrappers[name]) {
      summary.classification = "workspace_relations";
      if (!value || typeof value !== "object" || Array.isArray(value)) { issue(name, "invalid_store_shape"); continue; }
      if (Object.keys(value).some((key) => !Object.hasOwn(wrappers[name], key))) issue(name, "unreviewed_collection");
      for (const [collection, field] of Object.entries(wrappers[name])) add(name, collection, value[collection], field, summary);
    } else if (arrays[name]) {
      summary.classification = name === "publishAttempts.json" ? "derived_from_publish_job" : "owned_array";
      add(name, arrays[name][0], value, arrays[name][1], summary);
    } else if (reviewedLegacyStores.has(name)) {
      if (["customNewsSources.json", "contentAutomationRules.json", "tenants.json"].includes(name)) {
        summary.classification = name === "tenants.json" ? "workspace_profile_array" : "owned_array";
        add(name, name, value, name === "tenants.json" ? "id" : "tenantId", summary);
        if (name === "tenants.json" && Array.isArray(value)) value.forEach((record, i) => {
          if (!object(record)) return;
          if (["tenantId", "workspaceId"].some((field) => record[field] !== undefined && record[field] !== record.id)) issue(name, "conflicting_profile_owner", name, i);
          if (!object(record.apiKeys) || Object.values(record.apiKeys).some((key) => key !== "" && key !== null && key !== undefined)) issue(name, "plaintext_or_invalid_credentials", name, i);
          if (record.encryptedApiKeys !== undefined && (!object(record.encryptedApiKeys) || Object.values(record.encryptedApiKeys).some((key) => !envelope(key)))) issue(name, "invalid_encrypted_secret_envelope", name, i);
        });
      } else if (["branding.json", "ai-learning-model.json"].includes(name)) {
        summary.classification = "explicit_workspace_map";
        if (!object(value)) { issue(name, "invalid_store_shape"); continue; }
        if (name === "ai-learning-model.json" && Object.hasOwn(value, "version")) {
          summary.classification = "legacy_unowned_learning_model"; summary.records = 1;
          issue(name, "legacy_state_requires_provenance"); continue;
        }
        for (const [key, record] of Object.entries(value)) {
          summary.records++;
          if (!owner(key) || !object(record)) { issue(name, "invalid_workspace_map_entry"); continue; }
          if (name === "branding.json" && record.tenantId !== key) issue(name, "workspace_map_owner_mismatch");
          if (record.workspaceId !== undefined && record.workspaceId !== key || record.tenantId !== undefined && record.tenantId !== key) issue(name, "conflicting_owner_fields");
          // The default branding entry is the explicit platform template, not a workspace.
          if (!(name === "branding.json" && key === "default" && record.tenantId === "default")) summary.tenantKeyCounts[key] = 1;
          if (name === "ai-learning-model.json" && (!Number.isInteger(record.version) || record.version < 1 || !object(record.weights) || ["successRate", "engagementRate", "speedScore"].some((field) => !Number.isFinite(record.weights?.[field])) || !object(record.metrics) || ["accuracy", "drift"].some((field) => !Number.isFinite(record.metrics?.[field])) || !["low", "medium", "high"].includes(record.metrics?.biasRisk) || !Number.isInteger(record.samples) || record.samples < 0 || typeof record.updatedAt !== "string" || !Number.isFinite(Date.parse(record.updatedAt)))) issue(name, "invalid_learning_model_shape");
        }
      } else if (["hook-library.json", "knowledge-base.json"].includes(name)) {
        summary.classification = "legacy_global_mutable_content";
        if (!Array.isArray(value)) issue(name, "invalid_collection_shape");
        else { summary.records = value.length; if (value.length) issue(name, "legacy_state_requires_provenance"); }
      } else {
        summary.classification = "platform_resource_telemetry";
        if (!Array.isArray(value)) { issue(name, "invalid_collection_shape"); continue; }
        summary.records = value.length;
        value.forEach((record, i) => {
          const allowed = ["timestamp", "cpu", "memory", "disk", "uptime"];
          const metrics = { cpu: ["loadAvg1m", "loadAvg5m", "loadAvg15m", "cores", "usagePercent"], memory: ["totalMb", "freeMb", "usedMb", "usagePercent"], disk: ["totalMb", "freeMb", "usedMb", "usagePercent"] };
          if (!object(record) || Object.keys(record).some((key) => !allowed.includes(key)) || typeof record.timestamp !== "string" || !Number.isFinite(Date.parse(record.timestamp)) || !Number.isFinite(record.uptime) || typeof record.disk?.path !== "string" || Object.entries(metrics).some(([section, fields]) => !object(record[section]) || fields.some((field) => !Number.isFinite(record[section][field])) || Object.keys(record[section]).some((field) => !fields.includes(field) && !(section === "disk" && field === "path")))) issue(name, "invalid_platform_telemetry", name, i);
        });
      }
    } else if (TENANT_SCOPED_STORES.has(name)) {
      summary.classification = "direct_tenant_array"; add(name, `direct:${name}`, value, "tenantId", summary);
    } else if (shared.has(name)) {
      summary.classification = "explicit_registry";
      if (name === "auth-tenants.json") {
        if (!Array.isArray(value) || value.some((row) => !owner(row?.id)) || new Set(value.map((row) => row.id)).size !== value.length) issue(name, "invalid_workspace_registry");
        else registryIds = new Set(value.map((row) => row.id));
      }
    }
    else { unknownStores.push(name); issue(name, "unreviewed_store_policy"); }
  }
  const inspectUnknownDirectory = (directory, relative) => {
    if (relative === "libs/whisper") { excludedNamespaces.push({ name: relative, reason: "runtime_dependency_source", ownershipAssessed: false }); return; }
    for (const child of fs.readdirSync(directory).sort()) {
      const location = path.join(directory, child), label = `${relative}/${child}`, stat = fs.lstatSync(location);
      if (stat.isSymbolicLink()) { issue(label, "symlink_not_inspected"); continue; }
      if (stat.isDirectory()) inspectUnknownDirectory(location, label);
      else if (child.endsWith(".json")) { read(location, label); unknownStores.push(label); issue(label, "unreviewed_nested_store_policy"); }
    }
  };
  for (const child of fs.readdirSync(dataDir)) {
    if (child === "tenant-state" || child.endsWith(".json")) continue;
    const location = path.join(dataDir, child), stat = fs.lstatSync(location);
    if (stat.isSymbolicLink()) issue(child, "symlink_not_inspected");
    else if (stat.isDirectory()) inspectUnknownDirectory(location, child);
  }
  const entries = (name) => collections.get(name) || [];
  const index = new Map();
  for (const [name, rows] of collections) {
    if (name.startsWith("direct:") || ["attempts", "secrets"].includes(name)) continue;
    const byId = new Map(); index.set(name, byId);
    for (const entry of rows) {
      if (!owner(entry.record?.id)) { issue(entry.file, "missing_record_identity", name, entry.index); continue; }
      const matches = byId.get(entry.record.id) || [];
      if (matches.some((row) => row.owner === entry.owner)) issue(entry.file, "duplicate_owned_identity", name, entry.index);
      matches.push(entry); byId.set(entry.record.id, matches);
    }
  }
  const relation = (entry, collection, id) => {
    const candidates = owner(id) ? index.get(collection)?.get(id) || [] : [];
    const matches = candidates.filter((row) => row.owner && row.owner === entry.owner);
    if (matches.length !== 1) { issue(entry.file, candidates.length ? "cross_workspace_or_ambiguous_reference" : "orphan_reference", entry.name, entry.index); return; }
    return matches[0].record;
  };
  for (const entry of entries("destinations")) relation(entry, "connectors", entry.record?.connectorId);
  for (const entry of entries("secrets")) {
    relation(entry, "connectors", entry.record?.connectorId);
    const record = entry.record;
    if (!record || Object.keys(record).some((key) => !["workspaceId", "connectorId", "encrypted", "updatedAt"].includes(key)) || typeof record.encrypted !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(record.encrypted) || Buffer.from(record.encrypted, "base64").length <= 32) issue(entry.file, "invalid_encrypted_secret_envelope", entry.name, entry.index);
  }
  for (const entry of entries("releases")) {
    const record = entry.record; relation(entry, "versions", record?.contentVersionId);
    if (record?.approvedContent) relation(entry, "artifacts", record.approvedContent.artifactId);
    if (record?.approvedDestinations !== undefined && !Array.isArray(record.approvedDestinations)) issue(entry.file, "invalid_approval_scope", entry.name, entry.index);
    for (const binding of Array.isArray(record?.approvedDestinations) ? record.approvedDestinations : []) {
      relation(entry, "connectors", binding?.connectorId); const destination = relation(entry, "destinations", binding?.destinationId);
      if (destination && destination.connectorId !== binding.connectorId) issue(entry.file, "destination_connector_mismatch", entry.name, entry.index);
    }
  }
  for (const entry of entries("targets")) {
    const record = entry.record; relation(entry, "releases", record?.releaseId); relation(entry, "connectors", record?.connectorId);
    const destination = relation(entry, "destinations", record?.destinationId);
    if (destination && destination.connectorId !== record.connectorId) issue(entry.file, "destination_connector_mismatch", entry.name, entry.index);
  }
  for (const entry of entries("publishJobs")) if (entry.record?.releaseTargetId) {
    const target = relation(entry, "targets", entry.record.releaseTargetId);
    if (target && (target.connectorId !== entry.record.connectorId || target.destinationId !== entry.record.destinationId)) issue(entry.file, "publish_job_target_mismatch", entry.name, entry.index);
  }
  for (const entry of entries("attempts")) {
    const candidates = index.get("publishJobs")?.get(entry.record?.publishJobId) || [];
    if (candidates.length !== 1 || !candidates[0].owner) issue(entry.file, "orphan_or_ambiguous_publish_attempt", entry.name, entry.index);
    else {
      const ownedBy = candidates[0].owner;
      if (entry.record?.tenantId !== undefined && entry.record.tenantId !== ownedBy) issue(entry.file, "conflicting_derived_owner", entry.name, entry.index);
      entry.summary.tenantKeyCounts[ownedBy] = (entry.summary.tenantKeyCounts[ownedBy] || 0) + 1;
    }
  }
  for (const entry of entries("renderExecutions")) {
    const record = entry.record; relation(entry, "renderJobs", record?.renderJobId);
    for (const [field, collection] of [["artifactId", "artifacts"], ["contentVersionId", "versions"]]) if (record?.[field] || record?.state === "completed") relation(entry, collection, record?.[field]);
  }
  for (const entry of entries("publishExecutions")) {
    const record = entry.record; const target = relation(entry, "targets", record?.targetId); const job = relation(entry, "publishJobs", record?.publishJobId); const release = relation(entry, "releases", record?.releaseId);
    if (target && (target.releaseId !== record.releaseId || target.connectorId !== record.connectorId || target.destinationId !== record.destinationId)) issue(entry.file, "execution_target_mismatch", entry.name, entry.index);
    if (job && (job.releaseTargetId !== record.targetId || job.connectorId !== record.connectorId || job.destinationId !== record.destinationId)) issue(entry.file, "execution_job_mismatch", entry.name, entry.index);
    if (release && release.approvedContent?.contentDigest !== record.contentDigest) issue(entry.file, "execution_approval_mismatch", entry.name, entry.index);
  }
  const tenantRoot = path.join(dataDir, "tenant-state");
  const tenantRootStat = fs.lstatSync(tenantRoot, { throwIfNoEntry: false });
  if (tenantRootStat) {
    if (tenantRootStat.isSymbolicLink() || !tenantRootStat.isDirectory()) issue("tenant-state/", "invalid_tenant_namespace");
    else for (const key of fs.readdirSync(tenantRoot).sort()) {
      const directory = path.join(tenantRoot, key), relative = `tenant-state/${key}`;
      if (fs.lstatSync(directory).isSymbolicLink() || !fs.lstatSync(directory).isDirectory()) { issue(relative, "invalid_tenant_namespace"); continue; }
      const markerPath = path.join(directory, "workspace-owner.json");
      if (!fs.existsSync(markerPath)) { issue(relative, "missing_workspace_owner_marker"); continue; }
      const marker = read(markerPath, `${relative}/workspace-owner.json`);
      const ownedBy = owner(marker?.value?.tenantId);
      if (!ownedBy || marker.value.schemaVersion !== 1 || crypto.createHash("sha256").update(ownedBy).digest("hex") !== key) { issue(relative, "workspace_owner_marker_mismatch"); continue; }
      marker.summary.classification = "workspace_owner_marker"; marker.summary.records = 1; marker.summary.tenantKeyCounts[ownedBy] = 1;
      const walk = (absolute, label) => {
        for (const child of fs.readdirSync(absolute).sort()) {
          if (child === "workspace-owner.json" && absolute === directory) continue;
          const location = path.join(absolute, child), childName = `${label}/${child}`, stat = fs.lstatSync(location);
          if (stat.isSymbolicLink()) { issue(childName, "symlink_not_inspected"); continue; }
          if (stat.isDirectory()) { walk(location, childName); continue; }
          if (!child.endsWith(".json")) { issue(childName, "unreviewed_tenant_namespace_file"); continue; }
          const parsed = read(location, childName); if (!parsed) continue;
          parsed.summary.classification = "explicit_workspace_directory"; parsed.summary.records = Array.isArray(parsed.value) ? parsed.value.length : 1; parsed.summary.tenantKeyCounts[ownedBy] = parsed.summary.records;
          const check = (value) => {
            if (!value || typeof value !== "object") return;
            for (const [field, content] of Object.entries(value)) {
              if (["tenantId", "workspaceId"].includes(field) && content !== ownedBy) issue(childName, "conflicting_directory_owner");
              else if (content && typeof content === "object") check(content);
            }
          };
          check(parsed.value);
        }
      };
      walk(directory, relative);
    }
  }
  if (registryIds) for (const store of stores) if (Object.keys(store.tenantKeyCounts).some((value) => !registryIds.has(value))) issue(store.name, "owner_absent_from_workspace_registry");
  return { stores, issues, unknownStores, excludedNamespaces, workspaceRegistryChecked: !!registryIds, pass: issues.length === 0 };
}

export function inspectMigrationData(dataDir) {
  try { return inspectData(dataDir); }
  catch { return { stores: [], issues: [{ file: ".", code: "inspection_failed_or_source_changed" }], unknownStores: [], excludedNamespaces: [], workspaceRegistryChecked: false, pass: false }; }
}
