# Implementation progress

Latest checkpoint: [Fourth increment — render recovery and shutdown](RENDER_RECOVERY_AND_SHUTDOWN_PROGRESS.md). Current task states are in [IMPLEMENTATION_TRACKER.json](IMPLEMENTATION_TRACKER.json). The first-increment record below is historical; subsequent records follow.

## First security and correctness increment

**Date:** 25 October 2026. **Overall status:** in progress. This is a verified local increment, not completion of the 10-phase plan or a production-readiness declaration.

## Implemented changes

- System-engine routes authenticate before handlers, with only the explicit POST auth bootstrap allowlist public. Assets, compliance and custom knowledge state use verified workspace scope; compliance attribution cannot be forged through body/query fields.
- Core REST video creation persists the authenticated owner. Lists, metadata, status, file access and deletion enforce owned metadata; legacy unowned media is hidden. In-flight render dedupe includes tenant identity. MCP creates one server per workspace-bound session and rejects cross-owner session messages.
- Branding checks the requested tenant before reads or mutations and scopes ordinary tenant lists. Recycle/freshness/dedupe, buckets, hooks, shadowban/best-time/hashtag history, trend history, costs, account state and humanized configuration use workspace storage namespaces. Related route families reuse the same per-directory service instance in file mode.
- Signup/bootstrap cannot choose paid entitlements; API-key hashes are omitted from registration results. Signed tokens are structurally checked and verified against fresh active tenant state/token version. Suspension and key rotation revoke existing tokens; quota-limit increases require the admin key.
- Successful renders register owned checksummed artifacts and ready content versions. Releases bind approval to the exact content/version/media digest and approved metadata. Both queue and worker recheck authority; supplied media/thumbnail paths cannot authorize an upload. Previously approved content cannot be edited in place. Idempotency-key uniqueness is workspace-scoped.
- Legacy POST `/api/publish` fails with `APPROVED_RELEASE_REQUIRED`; it cannot create a parallel unapproved publish job. The Publish page links to Releases. The Releases queue form no longer asks for an absolute filesystem path or replacement metadata.
- Future release publication uses a persisted due time and BullMQ delay; workers that execute early defer before touching provider credentials or publishing. Provider adapters are invoked for upload only when due.
- Separate event/outbox instances now refresh file state rather than overwriting each other's cached arrays. File-mode corrupt lifecycle data is preserved with a clear error. This is a same-process correction, not transactional multi-process durability.
- Browser caches include session/query identity, discard old-session results and clear on auth changes. Both clients compare parsed origins before adding app credentials. Browser Node crypto imports were removed from TenantConsole and uiStore.
- Video playback/download use short-lived signed access with owner checks and byte-range streaming. Download authorization is refreshed on click; expired playback can renew and resume. Renderer temp files require their signed media token; trace request paths omit query tokens.
- Translation caches use the entire input plus tenant/provider/languages. Upstream failure is reported as unavailable rather than returning English text with a language prefix; request/batch sizes are bounded.
- Remotion composition lint rules now apply to compositions rather than incorrectly flagging HTTP services and normal SPA media/animations.

## Validation

| Check | Current result | Scope |
|---|---|---|
| `npm run verify:production` | PASS | Backend typecheck, **86 test files / 266 tests**, production build and route inventory |
| `npm run typecheck:ui` | PASS | UI TypeScript |
| Security regressions before fixes | **18 failures reproduced** | System guards, branding, signup and revocation |
| Changed-source ESLint | **0 errors** on the implementation increment | Existing narrow warnings are recorded separately |
| Full repository lint | FAIL: **71 errors / 27 warnings** | Baseline remains; the plan does not waive this gate |
| Browser, Redis/PostgreSQL/S3, external providers, deployment | Not exercised in this increment | No live messages, uploads, payment activation or migration/cutover |

The suite grew from the audit baseline of 77 files / 209 tests to 86 files / 266 tests. New tests exercise actual Express middleware/route dispatch using an in-process request/writable-response helper, real temporary file stores, mocked render/provider boundaries, signed tokens and range bodies. These are not full network/browser/real-provider acceptance. The existing route-inventory command still only checks compiled mount strings; its stronger replacement remains A19 work.

Evidence is saved in [implementation-evidence](implementation-evidence/), including the production command output, UI typecheck, lint baseline, failing-before-fix regressions and source hashes. The production verification source underwent token-equivalent layout restoration to reduce unrelated formatting changes; final typechecking and diff checks were also performed.

## Compatibility and data handling

- Existing global mutable-engine records remain untouched. New workspace-specific state is under `data/tenant-state/<workspace-hash>/`, with `workspace-owner.json` recording the authenticated owner for later migration. No legacy record was silently assigned to a tenant. The ownership reconciliation/migration tooling must explicitly include these namespaces before cutover.
- Existing unowned media stays inaccessible until ownership is explicitly reconciled. New renders create the necessary ownership, artifact and content-version records.
- Existing releases without the new bound content approval require reapproval against an owned registered ready artifact. Old queued publish payloads without an approved connector-backed release are rejected before provider dispatch; they are not silently grandfathered into publishing authority.
- Raw filesystem path publishing is deliberately no longer supported. Use the Releases flow for the rendered content and a verified connector/destination. The remaining legacy Publish form is a compatibility UI still needing the P7 workflow migration; its old submit cannot publish and returns the explicit release-required response.
- Translation provider outages now return a clear unavailable response. Fabricated translation fallback is removed.
- Existing untracked `src/services/webhookSecurity.ts` was preserved unchanged. No database cutover, deployment, real publish or unrelated file cleanup was performed.

## Open work and next sequence

1. Complete **A07/A08/A30**: integrate and test the preserved URL policy in an actual pinned transport for webhook/RSS dispatch, encrypt webhook secrets, allowlist updates and isolate selected-hook test delivery.
2. Complete **A12/A22/A31**: release/target transition enforcement and parent rollup, destination-set approval, correct timezone/cron recurrence, persisted schedule occurrences/jitter and output completion.
3. Complete **A11/A14/A21**: stable execution checkpoints/ambiguous-provider reconciliation, awaited coordinated shutdown, registered-worker readiness and scoped operational metrics.
4. Complete **P6**: declared dependencies, actual PostgreSQL/S3 repositories/schema constraints, transactional events/outbox, migration of all current namespaces, concurrent-process tests and disaster recovery.
5. Finish browser interaction acceptance, provider result/lifecycle contracts, all engine integrations, measured analytics/quota/cost handling, real teams/subscriptions and enforced CI/current documentation.
6. Finish the original semantic-review backlog and record any additional findings. No inventory-only file is relabelled as fully reviewed by this increment.

The tracker retains open acceptance gaps. Only A04 and A29 have been marked verified for their focused local contracts; all other touched findings remain in progress or implemented-but-unverified against their full acceptance criteria. No phase is marked complete.


## Second increment: outbound requests and webhook lifecycle

See [OUTBOUND_SECURITY_PROGRESS.md](OUTBOUND_SECURITY_PROGRESS.md) for implementation, verification evidence, compatibility requirements and acceptance gaps for A07, A08 and A30. These findings remain implemented_unverified.


## Third increment: webhook contracts and schedule recurrence

See [SCHEDULER_AND_WEBHOOK_PROGRESS.md](SCHEDULER_AND_WEBHOOK_PROGRESS.md). Local verification passes 94 test files / 325 tests, production build and route checks, UI typecheck and lint of files changed in this increment. A31 remains implemented_unverified pending the recorded integration/acceptance gaps; no phase is declared complete.


## Fourth increment: render recovery and shutdown

See [RENDER_RECOVERY_AND_SHUTDOWN_PROGRESS.md](RENDER_RECOVERY_AND_SHUTDOWN_PROGRESS.md). Local verification passes 104 test files / 363 tests, production build/route checks, UI typecheck and changed-source lint. A14 remains implemented_unverified; durable schedule occurrences, provider ambiguity, cross-process transactions and browser acceptance remain open.


## Fifth increment: publication recovery and release lifecycle

See [PUBLICATION_RECOVERY_PROGRESS.md](PUBLICATION_RECOVERY_PROGRESS.md) for the 28 October increment, verification and remaining acceptance gaps. Provider receipts are persisted before local status projections; unknown outcomes require reconciliation. No phase is declared complete.


## Sixth increment: destination-bound approval

See [DESTINATION_APPROVAL_PROGRESS.md](DESTINATION_APPROVAL_PROGRESS.md) for approval scope, compatibility requirements and verification. Approval binds provider account/destination identities; unapproved and changed identities cannot begin upload through the release worker. Browser/live-provider acceptance remains open; no phase is complete.


## Seventh increment: operator publication confirmation

See [OPERATOR_RECONCILIATION_PROGRESS.md](OPERATOR_RECONCILIATION_PROGRESS.md) for the permission-guarded observation workflow, validation, trust limits and remaining work. Existing publications can be recorded with bound request evidence without another upload. Provider lookup and uncertain-outcome retries remain open; no phase is complete.


## Eighth increment: workflow and route verification

See [WORKFLOW_VERIFICATION_PROGRESS.md](WORKFLOW_VERIFICATION_PROGRESS.md). The placeholder pipeline assertion is replaced with composed two-workspace API/store/worker scenarios; the route gate now compares AST registrations and actual source/compiled mounts. Browser/live-service acceptance and the full review backlog remain open; no phase is complete.


## Ninth increment: worker health and scoped visibility

See [WORKER_HEALTH_PROGRESS.md](WORKER_HEALTH_PROGRESS.md). Registered workers with fresh observations replace invented online capacity; readiness is distinct from liveness, health response waits are bounded, and workspace dashboard/state counts exclude other tenants. Global metrics require an admin key. Controlled process/Redis/browser acceptance remains open; no phase is complete.


## Tenth increment: required-video provider contracts

See [PROVIDER_CONTRACT_PROGRESS.md](PROVIDER_CONTRACT_PROGRESS.md). X no longer substitutes text-only success after media failure; X/LinkedIn native scheduling rejects without posting. X/LinkedIn/YouTube require canonical publication IDs and distinguish transient credential verification and uncertain dispatch outcomes. Remaining adapters and live platform acceptance stay open; no phase is complete.


## Eleventh increment: Graph provider boundaries and credential isolation

See [GRAPH_PROVIDER_PROGRESS.md](GRAPH_PROVIDER_PROGRESS.md). Facebook no longer continues after failed media transfer or invents video IDs from session IDs. Instagram rejects local filesystem URLs and container-only scheduling success. Constructor environment fallback is removed, with factory-level isolation tests. Owned public artifact delivery, token persistence and live processing/browser acceptance remain open; no phase is complete.


## Twelfth increment: migration SDKs and guarded readiness

See [MIGRATION_GUARDS_PROGRESS.md](MIGRATION_GUARDS_PROGRESS.md). Required dependencies are declared/locked, guard paths load without SDK execution, approval/cutover/checkpoint gates are strict, and runner/artifact validation is strengthened. Runtime authority remains file-backed; current namespace coverage and real PostgreSQL/MinIO recovery acceptance remain open. No phase is complete.


## Thirteenth increment: shared ownership inspection

See [OWNERSHIP_INSPECTION_PROGRESS.md](OWNERSHIP_INSPECTION_PROGRESS.md). Reconciliation/readiness share explicit wrapped-store, derived-attempt, checkpoint and tenant-directory checks. Current data inspection identifies concrete ownership/policy blockers without mutation; SQL mappings and durable runtime migration remain open. No phase is complete.


## Fourteenth increment: source-store safety

See [SOURCE_STORE_SAFETY_PROGRESS.md](SOURCE_STORE_SAFETY_PROGRESS.md). News-source and automation-rule files fail closed on corruption and use atomic replacement. Feed duplicates are workspace-scoped and preserve URL case semantics. Legacy ownership policies and durable multi-process authority remain open; no phase is complete.


## Fifteenth increment: legacy-store policies

See [LEGACY_STORE_POLICY_PROGRESS.md](LEGACY_STORE_POLICY_PROGRESS.md). Eight legacy root stores now have explicit inspection policies; ambiguous global state remains blocked on provenance and migration readiness still blocks missing mappings. Current 32-store hashes are unchanged; no phase is complete.


## Sixteenth increment: migration review helpers

See [MIGRATION_REVIEW_HELPERS_PROGRESS.md](MIGRATION_REVIEW_HELPERS_PROGRESS.md). Planner/decision source checks now share the inspector, signed proposals retain source blockers, malformed signatures fail without crashing and evidence requires real hash equality. Backup/restore hardening and durable migration acceptance remain open; no phase is complete.


## Seventeenth increment: metadata backup safeguards

See [METADATA_BACKUP_PROGRESS.md](METADATA_BACKUP_PROGRESS.md). Metadata backup creation/verification now enforce safe paths, regular-file inventories, staging preservation and source rechecks. Encryption, authenticated inventories, full backup/restore review and real recovery rehearsals remain open; no phase is complete.


## Eighteenth increment: full backup and recovery

See [FULL_BACKUP_RECOVERY_PROGRESS.md](FULL_BACKUP_RECOVERY_PROGRESS.md). Shared restricted archive verification precedes extraction completion, backup self-verifies before publication/pruning and restore stages before moving existing data. Temporary encrypted/plaintext round trips and failure rollback are covered. Extended archive compatibility, authenticated encryption and deployed recovery acceptance remain open; no phase is complete.


## Nineteenth increment: bounded PAX compatibility

See [PAX_COMPATIBILITY_PROGRESS.md](PAX_COMPATIBILITY_PROGRESS.md). The shared full-archive reader accepts bounded per-entry PAX paths/sizes and ignores known metadata without applying it. New creation supports long UTF-8 names while retaining exact inventory checks. Global/GNU/sparse/AppleDouble legacy variants and production recovery remain open; no phase is complete.


## Twentieth increment: full backup authentication

See [BACKUP_AUTHENTICATION_PROGRESS.md](BACKUP_AUTHENTICATION_PROGRESS.md). Full backups can authenticate archive fingerprints under a separate secret, require signatures under keyed policy and authenticate the private bytes actually restored. Sidecar publication/retention and unsigned status are explicit. Backup evidence is corrected to A26; deployed recovery, key lifecycle and durable authority remain open. No phase is complete.


## Twenty-first increment: workspace profile persistence

See [TENANT_STORE_SAFETY_PROGRESS.md](TENANT_STORE_SAFETY_PROGRESS.md). Tenant profiles preserve corrupt files, coordinate same-process updates and reject duplicate IDs. Bootstrap races converge on one profile, route failures return a generic unavailable response and legacy provider-key values are masked. Cross-process durability and persisted-credential migration remain open; no phase is complete.


## Twenty-second increment: persistent schedule outputs

See [SCHEDULE_OUTPUT_PROGRESS.md](SCHEDULE_OUTPUT_PROGRESS.md). Generated SVG assets now persist with owned manifests, schedule receipts and authenticated checksum-verified downloads in the schedule UI. Unsupported multi-scope runs fail explicitly. Video completion, durable execution claims and complete output lifecycle remain open; no phase is complete.


## Twenty-third increment: schedule occurrence claims

See [SCHEDULE_CLAIM_PROGRESS.md](SCHEDULE_CLAIM_PROGRESS.md). Persistent claims bind producer execution to an owned occurrence, prevent duplicate starts across same-process instances and preserve uncertain outcomes across restart. Pending states are visible and cannot be manually restarted through the UI. Cross-process transactions, operator resolution and video-completion reconciliation remain open; no phase is complete.


## Twenty-fourth increment: schedule asset reconciliation

See [SCHEDULE_ASSET_RECONCILIATION_PROGRESS.md](SCHEDULE_ASSET_RECONCILIATION_PROGRESS.md). Complete checkpointed SVG outcomes can be confirmed with operator evidence after ownership and file-integrity verification, without repeating generation. Partial, unbound, legacy and video outcomes remain held. Cross-process authority, operator UI and renderer completion remain open; no phase is complete.


## Twenty-fifth increment: schedule asset review interface

See [SCHEDULE_ASSET_REVIEW_UI_PROGRESS.md](SCHEDULE_ASSET_REVIEW_UI_PROGRESS.md). Scheduler cards now expose pending image downloads and evidence-based confirmation for complete held asset runs, with explicit inspection attestation and visible permission/conflict errors. Video and unknown outcomes remain blocked. Browser acceptance, cross-process authority and renderer completion remain open; no phase is complete.


## Twenty-sixth increment: schedule mutation safety

See [SCHEDULE_MUTATION_SAFETY_PROGRESS.md](SCHEDULE_MUTATION_SAFETY_PROGRESS.md). Unresolved executions now reject configuration changes, deletion and terminal status patches while preserving pause/resume. New claims capture the configuration and the runner rejects snapshots edited before claim acquisition. UI mutation failures are visible. Cross-process transactions, cancellation, historical retention and video completion remain open; no phase is complete.


## Twenty-seventh increment: video metadata safety

See [VIDEO_METADATA_SAFETY_PROGRESS.md](VIDEO_METADATA_SAFETY_PROGRESS.md). Video ownership/deduplication metadata now preserves corruption, coordinates same-process async/sync upserts, enforces new-write ownership and atomically replaces private files. Legacy rows remain preserved without inferred ownership. Cross-process authority and video completion remain open; no phase is complete.


## Twenty-eighth increment: content version safety

See [CONTENT_VERSION_SAFETY_PROGRESS.md](CONTENT_VERSION_SAFETY_PROGRESS.md). Invalid content-version and approval data now blocks writes, valid wrapper fields survive, staging is unique/private and draft/render updates cannot rebind identity through extra fields. Final combined verification passed 755 tests, backend types, build, route checks and changed-file lint. Durable transactions, scheduler video reconciliation and browser/deployed acceptance remain open; no phase is complete.


## Twenty-ninth increment: schedule video completion

See [SCHEDULE_VIDEO_COMPLETION_PROGRESS.md](SCHEDULE_VIDEO_COMPLETION_PROGRESS.md). Video enqueue now leaves the occurrence pending. The minute runner can verify an already-bound render after restart and record its owned output IDs exactly once within a single process. Workspace API callers cannot mint renderer provenance or edit producer versions. Updated the API guide and operations runbook. Historical enqueue-only receipts, failed/unbound render recovery, durable transactions and browser/deployed acceptance remain open.
