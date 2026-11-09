# Legacy-store policies — fifteenth increment

The shared read-only inspector now recognizes eight previously unreviewed root stores. Recognition does not establish migration readiness or resolve ambiguous provenance.

| Store | Policy |
|---|---|
| customNewsSources.json | Explicit tenantId; missing owners and duplicate owned IDs block |
| contentAutomationRules.json | Explicit tenantId; missing owners and duplicate owned IDs block |
| tenants.json | Profile id is its explicit workspace ID; registry linkage, owner conflicts and credential envelope checks |
| branding.json | Map key must match tenantId; only the matching default/default entry is the platform template |
| ai-learning-model.json | Runtime workspace map keys identify owners; model shape checked; the legacy single-model format requires provenance |
| hook-library.json | Nonempty global mutable library requires provenance, including records with builtin-looking IDs |
| knowledge-base.json | Nonempty global mutable library requires provenance |
| resource-snapshots.json | Restricted host telemetry shape; unknown fields or embedded workspace IDs block |

Tenant profiles with nonempty plaintext credential fields are blocked. Encrypted fields are checked for envelope shape without decrypting or authenticating them. Reports contain counts, hashes and issue locations rather than stored content, URLs, telemetry paths, credentials or ciphertext. No ownership is guessed or reassigned. Existing content in global mutable libraries is not certified as a pristine seed merely because its ID resembles a builtin.

The separate readiness namespace gate now includes all eight stores because their SQL/object-store migration mappings are not implemented. An ownership-policy pass cannot bypass this gate. Other migration decision/remediation/backup helpers still need alignment; runtime remains file-backed.

## Current repository data

Read-only inspection covers 32 JSON stores and now reports no unknown JSON-store policies. It remains BLOCKED: 3 legacy-state provenance issues, 2 ownerless render-job records and 9 store-level owner/registry mismatch findings. File hashes match the prior inspection for all 32 stores: no application records changed. One runtime dependency namespace remains explicitly excluded. These are separate issue counts, not a count of distinct affected records or workspaces.

## Limits and remaining work

Ownership and selected structural checks are not exhaustive field-by-field schema validation or proof of legitimate identity. Source/rule dependency semantics, full branding schema, encrypted-secret decryptability, database mappings and clean-room migration recovery remain open. Host telemetry is recognized only by the documented ResourceEngine shape; this is not content provenance authentication. Inspection is not an atomic snapshot. Production data requires frozen-source/backup and source-change checks before migration. No service connection, provider request, migration or cutover occurred. No phase is complete.

## Verification

- Final full test run: **533 tests across 116 files passed**.
- Focused ownership/migration guards: **45 tests passed**.
- Production verification passed backend typecheck, production build and AST/build consistency for **351 registrations in 46 routers**. The production run had 524 tests before nine additional malformed-shape/profile cases were added; the final 533-test run includes them.
- Changed scripts/test ESLint passed; full-repository lint remains an open baseline.
- Scoped diff whitespace check passed.
- Metadata-only workspace report, logs and source hashes are saved under `implementation-evidence/legacy-store-policy-*`.
