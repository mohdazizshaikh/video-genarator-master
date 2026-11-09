# Read-only ownership and relationship inspection — 28 October 2026

Thirteenth implementation increment, extending A13/P6 reconciliation coverage. Ownership inspection is now explicit for current structured records; SQL/object-store mappings and runtime durable authority remain open.

## Shared inspector

`inspect-data.mjs` is used by both reconciliation and readiness. It reads JSON without assigning ownership, rewriting records, decrypting secrets or connecting to services. Reports contain file hashes/byte counts, record/owner counts, classifications and issue locations—not document bodies, provider responses, API keys or encrypted payloads.

Covered shapes include wrapped content versions, connectors/destinations and releases/targets; artifact manifests; encrypted connector-secret envelopes; render/publish jobs and execution checkpoints; direct tenant arrays; and publish attempts whose owner is resolved from their persisted job. It checks same-workspace references, duplicate identities, destination/connector agreement, job/target agreement and execution/approval bindings. An orphaned or ambiguous attempt is blocked rather than assigned an owner. If an authentication workspace registry is present, owners are checked against its explicit IDs; otherwise the report states `workspaceRegistryChecked: false`.

Tenant-state directories require an existing schema-versioned owner marker whose tenant ID hashes to the directory name. Nested JSON is assessed under that explicit recorded scope, with conflicting embedded owner fields blocked. Missing/mismatched markers, malformed JSON and symlinks are reported. No owner is inferred merely from a directory name or content similarity.

Unknown top-level and nested JSON stores require policy review instead of being silently called platform-shared. Bundled `libs/whisper` source is an explicit runtime-dependency exclusion, matching the application's configured dependency location; it is not represented as ownership-assessed application data. Other unknown namespaces remain flagged. Inspection failures return a closed, generic issue rather than dumping raw parse/credential contents.

## Readiness remains conservative

Readiness now includes these shared ownership/relationship issues. Its separate namespace-mapping gate still blocks current release/connector/artifact/execution/tenant-state datasets because their SQL/object-store/secret migration mappings are not implemented. Passing this inspector is not permission to migrate or switch primary reads. It does not prove current schemas, identity provenance, cryptographic decryptability, artifact bytes, provider state or database constraints.

The older flat ownership-policy list remains for compatibility with other migration helpers; comments now state that absence from that list is not proof of shared ownership. Remaining decision/remediation/backup helpers still need complete alignment with the shared inspector and mapping contracts.

## Current workspace data: read-only result

Inspection of this repository's `data/` directory assessed **32 JSON stores** and reported:

- **2 ownerless render-job records**.
- **8 store-level findings** where recorded owners are absent from the present authentication workspace registry. These require identity/provenance reconciliation, not automatic reassignment or a conclusion that the records are malicious.
- **8 stores requiring explicit policy review**: `ai-learning-model.json`, `branding.json`, `contentAutomationRules.json`, `customNewsSources.json`, `hook-library.json`, `knowledge-base.json`, `resource-snapshots.json`, and `tenants.json`.
- One explicit runtime-dependency exclusion, `libs/whisper`.

The dataset does **not** pass ownership reconciliation. No source records were changed, assigned, quarantined or deleted. The saved report contains metadata/counts and issue locations so these results are reviewable.

## Verification and acceptance limits

| Check | Result |
|---|---|
| `npm run verify:production` | PASS: backend typecheck, 115 files / 509 tests, production build and AST route/build consistency |
| Focused ownership/guard regressions | PASS: 29 tests |
| Changed scripts/test ESLint | PASS: 0 errors / 0 warnings |
| `git diff --check` | PASS |
| Current workspace ownership inspection | BLOCKED: concrete issues listed above; read-only |

No UI implementation changed in this increment. The route gate checks 351 registrations across 46 router files. Raw timestamps retain the host clock; report date follows the supplied session date. Evidence is under `implementation-evidence/ownership-inspection-*`. New tests use actual temporary publication-store fixtures plus isolated inspector processes. Coverage includes wrapped/derived records, orphan/ambiguous/cross-workspace relationships, duplicate/malformed records, checkpoint bindings, secret-safe output, optional registry checks, marker conflicts, symlink handling, explicit runtime exclusions, unknown namespaces and CLI/inspector hash/issue agreement.

Inspection is not an atomic snapshot: freeze/backup and source-change checks remain necessary for migration. Secret checks validate envelope shape without authenticating or decrypting ciphertext. Registry linkage is optional and reported when absent; it does not establish complete team/member identity provenance. This is JSON data-store coverage with a declared runtime exclusion, not full semantic validation of every engine snapshot or every file in the project.

No database/object-store operation, production migration, cutover, external provider action or deployment occurred. Runtime authority remains file-backed. Full-repository lint, remaining schema/mapping work and browser/live-service acceptance remain open; no phase is complete.
