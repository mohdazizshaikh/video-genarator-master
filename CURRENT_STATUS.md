

## Promoted master migration — 2026-08-22

The newer `/Users/admin/Documents/Short-video-creator` checkout is now the active `/Users/admin/Documents/short-video-creator-master` checkout. The previous master directory is preserved at `/Users/admin/Documents/short-video-creator-master-pre-promotion-20260822-022327`, with a complete migration backup under `/Users/admin/Documents/short-video-migration-backups/20260822-021949`.

The old short-video Docker stack and project volumes/images were removed only after source, configuration, database, and named-volume backups. The promoted Docker stack now runs `ace-app` and `ace-redis` on port `3123`; the application is healthy, Redis is healthy with `maxmemory-policy=noeviction`, and the browser serves the newer AI Content Empire interface.

This promoted checkout is not the archived PostgreSQL/MinIO/release-control checkout. It does not contain `RELEASE_CONTROL_PRIMARY_READS`, `job_events`, `/api/job-events`, or `/api/engines`; those routes/features are not claimed as complete here. External provider credentials remain owner-controlled and were not fabricated.

## Phase 2 security hardening — current increment

Mandatory `requireAuth` is now fail-closed across application, deferred video, MCP, queue, system-engine, and content-bucket namespaces. Health and documentation remain public, while registration, API-key authentication, and token verification remain explicit public bootstrap endpoints. A valid configured `X-Admin-Key` is accepted as the platform-admin authentication path.

The first repository-level tenant boundary is implemented in `TenantStore` and `TenantRouter`. Bearer-authenticated callers can list or mutate only the tenant represented by their verified `tenantId` claim; cross-tenant resource identifiers return a non-enumerating 404. Platform-admin requests retain explicit admin-key access. Profile records, profile service operations, OAuth state, profile-account lookups, and publish-worker account credential access now follow the same auth-derived tenant scope. Legacy profile records without a tenant owner are not tenant-visible.

Validation completed on the rebuilt Docker stack at port `3123`: backend typecheck passed, UI typecheck passed, the full regression suite passed with 49 test files and 115 tests, and runtime checks returned HTTP 401 for missing/invalid bearer credentials on protected routes while health/docs returned HTTP 200. The container health check is healthy; the final scheduling sample reported Redis `ok` and `videoEngine: ready`. Repository-level cross-tenant tests pass, including schedule lifecycle, due execution, and legacy quarantine. Authenticated HTTP success and cross-tenant tests remain pending until owner-provided tenant credentials are available.

Publishing-job records and channel mappings now follow the auth-derived ownership pattern. New publish jobs carry tenant ownership, list/detail/idempotency/attempt access is tenant-scoped, queue worker status mutations are tenant-scoped, and legacy unowned jobs/mappings are hidden from tenant reads. Channel-config list/create/delete operations are tenant-scoped. Render jobs now carry tenant ownership from authenticated queue creation through BullMQ payloads and RenderWorker retry/status/completion mutations; legacy unowned render jobs are hidden from tenant reads. Video metadata now carries optional auth-derived ownership, tenant-aware signature deduplication, tenant-scoped lookup/list methods, and route access through the authenticated tenant claim. ShortCreator receives tenant identity from RenderWorker when generating metadata; legacy metadata without ownership remains hidden from tenant-scoped access. Video-library records and artifact paths now carry optional auth-derived ownership. Video-library CRUD, list/filter/search, stats, trending tags, status, metrics, and delete operations resolve through tenant-scoped store methods; legacy video records without ownership remain hidden. Reports are now treated as tenant workspace data because they feed tenant-specific merges and script plans. New report records carry optional auth-derived ownership, tenant-scoped list/detail/status methods are used by REST handlers, ingest jobs require tenant identity, and planning jobs select and merge only the owning tenant’s reports. Derived script plans also carry ownership and are listed tenant-scoped; legacy unowned reports/plans remain hidden. Pipeline jobs, generated variations, platform comparisons, and pipeline statistics now carry and enforce auth-derived tenant ownership. PipelineRouter and PipelineOrchestrator propagate tenant identity; legacy unowned pipeline records are hidden from tenant-scoped reads. Analytics records and audience targets are now tenant workspace data. Analytics upsert, video lookup, dashboard aggregation, and audience creation/listing derive ownership from the verified tenant claim; legacy unowned records remain hidden from scoped reads. The MarketingRouter import-path mismatch exposed during this increment was corrected and backend/UI typechecks pass. Scheduling records are now tenant workspace data. Schedule creation, list, lookup, update, status, run, delete, statistics, due, upcoming, pipeline-created schedules, and background execution derive ownership from authenticated tenant context. Legacy unowned schedules are hidden from tenant routes and excluded from the background runner. The next Phase 2 boundary is AI-learning, quota, and other remaining file-backed service repositories. `RELEASE_CONTROL_PRIMARY_READS=false` remains preserved; PostgreSQL, MinIO, durable job events, and release-control remain future phases.

## Phase 2 security hardening — AI-learning and quota increment — 2026-08-23

AI-learning is now tenant-owned. Event creation derives ownership from the authenticated tenant and ignores any client-supplied `tenantId`; event listing, training, model reads, suggestions, and dashboards use tenant-scoped accessors. Model state is stored per tenant in the existing model file envelope, while a legacy single global model object is quarantined and never returned to a tenant. AI training now requires an explicit tenant closure for both immediate and scheduled execution.

The throttling boundary is now authenticated. `/api/system/throttle/check` derives the effective tenant from the verified claim for normal callers and rejects mismatched body identifiers; quota reads return only the caller’s quota unless the request is authenticated with the admin key; cross-tenant quota lookup is denied; plan changes and usage resets require the admin key. The underlying quota map remains tenant-keyed and fail-closed on unexpected checks.

Validation completed after rebuilding the Docker stack on port `3123`: backend typecheck passed; the regression suite passed with 51 test files and 120 tests, including new AI-learning and throttling isolation tests; `git diff --check` passed; public `GET /api/health` returned 200; unauthenticated `GET /api/ai/events` and `POST /api/system/throttle/check` returned 401. The remaining Phase 2 work is a final inventory of any other file-backed service stores and worker callers, followed by PostgreSQL migration design and implementation. `RELEASE_CONTROL_PRIMARY_READS=false` remains unchanged.

## Phase 2 security hardening — competitor, series, and skip-analysis increment — 2026-08-23

Competitor strategy history, series records, episode mutations, and skip-analysis retention records are now tenant-owned. Shared competitor creator/pattern reference pools remain read-only reference data, while persisted strategy history and user-derived retention data are filtered by the authenticated tenant. Legacy unowned records are quarantined from scoped reads and mutations. Series and skip-analysis routes derive tenant identity from the verified claim and fail closed when no tenant context exists.

Validation passed after the increment: backend typecheck passed; the full regression suite passed with **53 test files and 124 tests**; production build passed; `git diff --check` passed. After Docker rebuild/restart, `ace-app` and `ace-redis` were running on port `3123`; public health returned `200`; unauthenticated competitor history, series listing, and skip-analysis requests returned `401`. The remaining Phase 2 work is the final inventory and classification of operational, credential, cache, and remaining file-backed engines before Phase 3 PostgreSQL/MinIO design. `RELEASE_CONTROL_PRIMARY_READS=false` remains unchanged.

## Phase 2 security hardening — operational boundaries increment — 2026-08-24

Platform resource snapshots, optimization, prediction, and history are now admin-key-only because they expose global capacity telemetry. Error-recovery listing, dead-letter inspection, recording, processing, recovery, dead marking, and clearing are admin-key-only because they operate on global incident state. Credential listing, registration, scheduling, rotation, and expiry inspection are admin-key-only because the backing store contains sensitive provider credential material. This prevents normal tenant-authenticated callers from using arbitrary identifiers to inspect or mutate platform-global operational state. The newer UI remains unchanged; its operational controls now correctly require the existing platform-admin credential.

Validation completed after Docker rebuild: `ace-app` and `ace-redis` are running on port `3123`; `GET /api/health` returned **200**; unauthenticated resource access returned **403** from the admin-key guard, while unauthenticated recovery, credential, competitor, series, and skip-analysis access returned **401**. Typecheck, focused tests, full regression, production build, and `git diff --check` passed before the runtime rebuild. The remaining Phase 2 work is classification and migration planning for ViralRadar/cache state, artifact outputs, and any residual file-backed stores; no provider credential was created or exposed, and `RELEASE_CONTROL_PRIMARY_READS=false` remains unchanged.

## Phase 2 handoff — ViralRadar, artifacts, and migration matrix — 2026-08-24

`ViralRadarEngine` is currently an in-memory platform reference/cache over `TrendEngine`; it has no persistent tenant-owned history. The `/api/trends` namespace is already protected by `requireAuth`, while the radar result remains platform-derived reference intelligence rather than tenant-specific learning. It should remain cache/metrics-backed in the durable architecture unless a future product decision creates tenant-specific saved scans.

The remaining local artifact paths are not yet a durable storage boundary. Image generation, image filters, and repurposing currently return sanitized file names but still write to local generated/filtered/video directories. Their route path checks prevent traversal, but MinIO/S3 migration is still required for tenant-scoped object prefixes, signed URLs, checksums, lifecycle cleanup, and owner metadata. A new `docs/POSTGRES_MINIO_MIGRATION_MATRIX.md` translates the current ownership decisions into domain tables, artifact manifests, invariants, migration gates, and explicit safeguards.

Phase 2 remains open only for artifact-storage implementation and residual-store closure. PostgreSQL, MinIO, durable job events, and release control remain future capabilities; `RELEASE_CONTROL_PRIMARY_READS=false` is preserved.

## Phase 2 security hardening — repurpose artifact ownership increment — 2026-08-24

Repurposed clip outputs now include an auth-derived sanitized tenant prefix in their generated filenames. The repurpose route passes the verified tenant claim into the engine, and clip listings return only files carrying that tenant prefix; ownerless/legacy clips are therefore not exposed through the scoped listing contract. The existing source-path containment check remains in place. This is an interim filesystem boundary and not a replacement for MinIO.

Validation passed after the implementation: backend typecheck passed; focused service/server tests passed with 14 files and 22 tests; the full regression suite and production build passed; `git diff --check` passed. After Docker rebuild/restart, `ace-app` and `ace-redis` were running on port `3123`; `/api/health` returned **200**, unauthenticated `/api/repurpose` returned **401**, and unauthenticated `/api/trends/viral-radar` returned **401**. Image-generation and image-filter outputs still require the owner-aware filesystem/MinIO slice; no provider credentials were fabricated and `RELEASE_CONTROL_PRIMARY_READS=false` remains unchanged.

## Phase 2 security hardening — image artifact ownership increment — 2026-08-24

Generated image files now carry a sanitized auth-derived tenant prefix. Image generation routes pass the verified tenant claim into the engine, and generated-image serving rejects filenames that do not belong to the caller's prefix. Image-filter previews and filtered outputs use the same owner prefix; apply, batch, preview-file, and filtered-file paths reject non-owner filenames. Legacy files without the current tenant prefix are quarantined from tenant access. Path containment checks remain in place. This is an interim local-filesystem boundary; MinIO manifests and signed URLs remain the durable target.

Validation passed: backend typecheck, focused image/server checks, full regression suite, production build, and `git diff --check`. After Docker rebuild/restart, `ace-app` and `ace-redis` were running on port `3123`; `/api/health` returned **200**; unauthenticated image generation, generated-image serving, and filtered-image serving returned **401**. No provider credentials were created and `RELEASE_CONTROL_PRIMARY_READS=false` remains unchanged.

## Phase 3 prerequisite audit — 2026-08-24

The canonical Compose stack has the application and Redis only; PostgreSQL and MinIO services, client dependencies, migration runners, buckets/endpoints, and owner-approved credentials are absent. The app remains file-backed under `DATA_DIR_PATH`, with Redis AOF and `noeviction` configured for BullMQ. No PostgreSQL/MinIO code, dual-write, signed URLs, or primary-read cutover was enabled in this audit. The migration matrix now records this as an explicit gate and requires owner-approved service configuration before implementation.

## Phase 3 artifact manifest seam — 2026-08-24

Added `src/db/ArtifactManifestStore.ts` as a migration-ready local manifest boundary. It records tenant ownership, artifact kind, local path, future object key, SHA-256 checksum, byte size, MIME type, lifecycle state, and timestamps. Tenant-scoped list/find methods fail closed for missing tenant IDs and ignore unowned legacy manifest records. Persistence uses a temporary file plus atomic move. This store is intentionally local-only until owner-approved PostgreSQL/MinIO infrastructure exists; it does not claim durable storage or primary-read migration.

Added focused tests covering tenant object-key derivation, checksum/size capture, cross-tenant lookup isolation, missing tenant rejection, and legacy-record quarantine. The focused manifest tests passed with 2 tests; backend typecheck, full regression, production build, and `git diff --check` also passed. Docker was rebuilt successfully: both app and Redis are running on port `3123`, health returned **200**, and unauthenticated image and repurpose routes returned **401**.

## Reality gap re-baseline — 2026-08-24

The platform is intentionally re-baselined as a broad development/beta creator application with substantial security hardening, not yet as a durable production Content Factory. The new `docs/REALITY_GAP_REGISTER.md` separates real completed protections from missing P0/P1/P2/P3 capabilities. The largest blockers remain PostgreSQL, MinIO/S3, durable job events/release control, complete provider OAuth and publishing acceptance, authenticated two-tenant end-to-end acceptance, observability/cost controls, and backup/restore proof. The checklist now records this gap register as the source for the next implementation sequence.

## P0 prerequisite — artifact producer manifest registration — 2026-08-24

Image generation, image filtering, and repurpose routes now register successful tenant-owned outputs in `ArtifactManifestStore` after local file creation. Manifest registration records checksum, size, MIME type, lifecycle, owner, and a future object key while preserving the existing response contract and local-file authority. Registration is intentionally not a MinIO upload or a primary-read switch.

The new manifest tests passed, typecheck passed, full regression and production build passed, and `git diff --check` passed. Docker rebuild passed with `ace-app` and `ace-redis` running on port `3123`; health returned **200** and unauthenticated image/repurpose routes returned **401**. The next durable gate is real MinIO/S3 upload plus PostgreSQL manifest authority using owner-approved infrastructure; no credentials were fabricated and `RELEASE_CONTROL_PRIMARY_READS=false` remains unchanged.

## P0 migration-ready job events and release control — 2026-08-24

Added `JobEventStore` and `ReleaseControlStore` as local migration-ready boundaries. Job events carry tenant ownership, job ID, event type, monotonic per-job sequence, tenant-scoped idempotency keys, payload, and timestamp. Release records carry tenant ownership and enforce explicit draft/approved/released/blocked transitions. Both stores reject missing tenant IDs, scope reads by tenant, quarantine unowned legacy records on load, and persist through atomic temporary-file moves.

Focused event/release tests passed with 2 tests. Backend typecheck, full regression, production build, and `git diff --check` passed. Docker runtime remains healthy with app and Redis on port `3123`; `/api/health` returned **200**, and protected artifact routes remain fail-closed. These stores are not yet the durable PostgreSQL authority and are not represented as complete release-control/job-event production infrastructure. `RELEASE_CONTROL_PRIMARY_READS=false` remaFocused event/release tests passed with 2 tests. BackeN_HANDOFF.md <<'EOF'

## Job-event and release-control prerequisite — 2026-08-24

The checkout now contains local migration-ready `JobEventStore` and `ReleaseControlStore` boundaries with tenant scope, idempotency, ordered events, explicit release transitions, legacy quarantine, and atomic persistence. They are prerequisite contracts only; route/worker-wide event emission, durable Redis event timeline, PostgreSQL authority, replay/DLQ integration, and release-control UI/API integration remain open. No primary-read or cutover behavior was enabled.

## Phase 3 migration checkpoint foundation — 2026-08-24

The canonical checkout now includes `migrations/001_content_factory.sql` and a dry-run-only `db:migration:status` command. The command produces deterministic SHA-256 checksums and migration metadata, never auto-applies SQL, reports the current file-backed authority, and exits non-zero when `DATABASE_URL` is absent. This creates an explicit safety gate rather than pretending PostgreSQL is available.

The migration status check, full regression suite, production build, `git diff --check`, and Docker rebuild passed. Docker health returned **200**. No PostgreSQL or MinIO service was added, no credentials were fabricated, and `RELEASE_CONTROL_PRIMARY_READS=false` remains unchanged. Applying the SQL still requires owner-approved infrastructure, backup, reconciliation, and rollback gates.

## Phase 5 migration-ready worker events — 2026-08-24

RenderWorker and PublishWorker now emit tenant-scoped lifecycle events for processing/publishing, completion, and retry failures through `JobLifecycleEventService` and the local `JobEventStore`. Event keys are deterministic per job/type/attempt, so retry delivery is idempotent. Missing tenant IDs fail closed. Existing BullMQ retry and dead-letter behavior remains unchanged, and no job response contract was rewritten.

Focused job-event/release tests passed, full regression passed, production build passed, `git diff --check` passed, and Docker health returned **200**. Unauthenticated job-event and release-control metrics returned **401**. This remains a migration-ready local event boundary: full producer coverage, durable event streaming, replay/DLQ APIs, PostgreSQL authority, and release-control API/UI integration remain open. `RELEASE_CONTROL_PRIMARY_READS=false` remains unchanged.

## Remaining queue lifecycle events — 2026-08-24

IngestWorker and PlanningWorker now emit tenant-scoped processing and completion events through the local event adapter. DeadLetterWorker now requires a tenant claim in the original job payload, rejects unowned dead-letter jobs, emits a tenant-scoped `dead_letter` event, and uses tenant-scoped render/publish status updates. RenderWorker and PublishWorker lifecycle coverage remains enabled. Existing BullMQ retry/backoff and dead-letter queue behavior is preserved.

Typecheck, full regression, production build, `git diff --check`, Docker rebuild, health (`200`), and protected metrics (`401` without auth) passed. This is still migration-ready local event coverage, not durable PostgreSQL-backed event authority; replay/DLQ APIs, complete event coverage, and database cutover remain open.

## Local event outbox and replay boundary — 2026-08-24

`JobEventOutboxStore` now provides a tenant-scoped local outbox for lifecycle events with pending, delivered, and dead-letter states; bounded pending reads; deduplicated enqueue; attempt-aware retry; explicit dead-letter requeue; and fail-closed cross-tenant lookups. `JobLifecycleEventService` now appends the event and creates its pending outbox row for every integrated worker lifecycle event. This is migration-ready local durability only, not PostgreSQL or external delivery authority.

Focused outbox tests passed, typecheck passed, full regression passed, production build passed, `git diff --check` passed, Docker rebuild passed, health returned **200**, and unauthenticated event metrics returned **401**. Durable outbox delivery, external publish acknowledgements, replay API/UI, and PostgreSQL transaction/outbox authority remain open.

## Authenticated event inspection and admin outbox control — 2026-08-24

The `/api/job-events` router now exposes tenant-scoped event history, tenant-scoped outbox inspection, bounded event metrics, and an admin-key-protected outbox requeue operation. Tenant routes derive ownership only from the authenticated claim; client-supplied tenant IDs are not accepted for reads. Requeue remains an operational action requiring `X-Admin-Key` and returns not-found for unknown or cross-tenant rows. This is local outbox visibility, not a claim of external delivery or PostgreSQL authority.

Typecheck, full regression, production build, `git diff --check`, Docker rebuild, health (`200`), unauthenticated event/outbox inspection (`401`), and unauthenticated requeue (`401`) passed. Durable delivery acknowledgements, PostgreSQL transaction/outbox authority, and full replay UI remain open.

## Phase 3 migration checkpoint foundation — 2026-08-25

`MigrationCheckpointStore` now provides a non-authoritative local checkpoint ledger with deterministic SQL SHA-256 checksums, pending/applied/drift verification, immutable checksum protection, idempotent recording, atomic persistence, and fail-safe behavior for malformed or absent state. It does not apply SQL and does not replace the file-backed authority.

Focused checkpoint tests (2/2), backend typecheck, production build, `git diff --check`, Docker rebuild, `/api/health` (`200`), and unauthenticated `/api/job-events/outbox/metrics` (`401`) passed. Actual PostgreSQL execution, transactional authority, backup/reconciliation, and cutover remain explicitly gated.

## Phase 3 gated migration preflight — 2026-08-25

`npm run db:migration:preflight` now performs a dry-run-only safety check. It computes migration checksums, compares local checkpoint state, detects checksum drift, reports an active migration lock, inventories local JSON-backed stores for reconciliation planning, and explicitly reports whether `DATABASE_URL` and primary-read cutover are available. It never applies SQL. Without `DATABASE_URL`, it exits with code `2` and preserves file-backed authority.

Full regression passed with 58 files and 134 tests. Backend typecheck, production build, `git diff --check`, Docker rebuild, `/api/health` (`200`), and unauthenticated job-event metrics (`401`) passed. PostgreSQL execution, transactional authority, backup sign-off, reconciliation approval, and cutover remain gated.

## Phase 3 non-destructive reconciliation report — 2026-08-25

`npm run db:migration:reconcile` now produces a deterministic, read-only inventory of local JSON stores, byte sizes, SHA-256 checksums, record counts, tenant-key distributions, and artifact-manifest presence. It never mutates source files. The current checkout reports 27 JSON stores, 2 malformed JSON stores (`reports.json` and `scriptPlans.json`), 79 unowned array records requiring explicit mapping or quarantine, and no durable artifact-manifest file in the current data directory. These are migration blockers, not data to delete automatically.

Focused manifest/checkpoint tests (4/4), full regression (58 files / 134 tests), typecheck, production build, `git diff --check`, Docker rebuild, `/api/health` (`200`), and unauthenticated event metrics (`401`) passed. PostgreSQL/MinIO authority remains disabled.

## Phase 3 safe remediation planner — 2026-08-25

The new `npm run db:migration:remediation-plan` command is intentionally dry-run-only. It inventories malformed JSON stores and array records without `tenantId`, validates an optional explicit mapping manifest, reports proposed actions, and always exits non-zero while blockers remain. It never writes, overwrites, deletes, infers tenant ownership, or applies mappings. Fixture validation confirmed malformed-store and missing-mapping blockers, invalid mapping rejection, explicit mapping recognition, and no source-data mutation.

The current real data remains blocked by the previously identified malformed stores and unowned records. No quarantine or tenant assignment was performed because owner approval and an authoritative mapping are not available. PostgreSQL, MinIO, and primary-read cutover remain disabled.

## Phase 3 remediation validation — 2026-08-25

The dry-run remediation planner is installed as `npm run db:migration:remediation-plan`. Real-data execution remains intentionally blocked by malformed JSON and unowned records. Isolated fixtures confirmed exit code `2` for unresolved blockers, rejection of an unreadable mapping manifest, recognition of an explicit mapping without applying it, and unchanged source-file hashes. No source record was moved, rewritten, deleted, or assigned to a tenant.

Final validation passed with 58 test files and 134 tests, typecheck, production build, `git diff --check`, Docker rebuild, `/api/health` HTTP 200, and protected job-event metrics HTTP 401 without authentication. Migration preflight correctly remains blocked because `DATABASE_URL` is absent and primary-read cutover is disabled; SQL was not applied.
## Local testing authentication — 2026-08-25
The existing authentication flow does not use a user password; it uses a tenant-scoped generated API key to issue a bearer token. A temporary local test tenant was registered through the auth bootstrap register route (now canonical at `/api/system-engines/auth/register`). The plaintext API key is kept outside the repository and is not present in GitHub or tracked environment files.

Authentication returned HTTP 200, token verification returned HTTP 200, the tenant-protected job-event metrics route returned HTTP 200 with the bearer token, and an invalid credential returned HTTP 401. Rotation/removal guidance is documented in `docs/LOCAL_TEST_AUTH.md`. The temporary credential must be rotated or removed before any shared or production deployment.

## Migration readiness tooling — 2026-08-25

Added `npm run db:migration:readiness` as a secret-safe, non-connecting readiness gate. It checks migration checksums, PostgreSQL and MinIO configuration presence, explicit backup/reconciliation/rollback approvals, local reconciliation blockers, and primary-read safety. Added `npm run db:migration:apply`, a separately gated PostgreSQL executor with one transaction per migration, advisory locking, checksum-drift rejection, and post-commit checkpoints. Added `npm run storage:migration:apply`, a separately gated MinIO/S3 executor that validates tenant-prefixed object keys, DATA_DIR path containment, source checksums/sizes, and post-upload object metadata/size. Neither executor can run without explicit execution intent and owner approvals; neither enables primary reads.

Added `npm run db:backup:create` and `npm run db:backup:verify` for atomic metadata snapshots and checksum-only restore verification. The local drill copied and verified 28 JSON files, including malformed JSON as raw bytes, without including `.env` or plaintext credentials. Full regression remains 58 files/134 tests; typecheck, production build, migration-script syntax checks, Docker rebuild, health HTTP 200, and protected-route HTTP 401 passed. Current readiness remains blocked by absent owner-approved `DATABASE_URL`, MinIO settings, approval flags, malformed `reports.json`/`scriptPlans.json`, and unowned records. File-backed authority and `RELEASE_CONTROL_PRIMARY_READS=false` remain unchanged.

## Remaining migration implementation slice — 2026-08-25

Added `src/db/DualWriteReadVerify.ts`, a deterministic comparison contract that normalizes object key order, returns SHA-256 read-model hashes and mismatch paths, writes file-backed data before the durable shadow, and surfaces durable-write or read-verify failures instead of reporting false success. Three focused tests cover key-order equivalence, divergence failure, and durable-write failure.

Added `scripts/qa/two-tenant-acceptance.mjs`. It requires two owner-provided API keys, authenticates both tenants, confirms distinct tenant claims, and calls a tenant-protected route for each without creating test records or printing credentials. It exits `2` when credentials are absent. Added the migration runbook and aligned the matrix with the actual tooling. Final validation passed with 59 test files and 137 tests, typecheck, production build, Docker health HTTP 200, protected-route HTTP 401, and expected exit `2` for readiness, PostgreSQL apply, MinIO apply, and two-tenant acceptance gates while prerequisites remain absent.

The platform is now implementation-ready for controlled migration execution, but not approved or operationally ready for the real migration. Remaining blockers are owner-approved `DATABASE_URL`, MinIO endpoint/bucket/credentials, explicit backup/reconciliation/rollback approvals, malformed JSON recovery, unowned-record mapping/quarantine, and two-tenant credentials. No dual-write, PostgreSQL connection, MinIO upload, destructive quarantine, or primary-read cutover has occurred.

## Signed reconciliation and evidence gates — 2026-08-25

Added `scripts/migrations/reconciliation-decision.mjs` to validate an owner-signed HMAC decision manifest covering every malformed store and unowned record. It accepts explicit `map`, `quarantine`, and `quarantine-store` decisions only after signature, tenant ID, coverage, duplicate, and unexpected-entry checks; it never applies decisions or modifies source files. Added `scripts/migrations/evidence.mjs` to validate signed backup restore, read-verify, rollback rehearsal, and tenant-isolation evidence before cutover.

Fixture validation passed for missing-key rejection, valid signature acceptance, complete decision coverage, and source immutability. Final validation passed with 59 test files and 137 tests, typecheck, production build, migration-script syntax checks, Docker health HTTP 200, and protected-route HTTP 401. Readiness, PostgreSQL apply, MinIO apply, and two-tenant acceptance continue to fail closed with exit code 2 because owner infrastructure, approvals, reconciliation decisions, and two tenant credentials are absent.

## Local unified durable-services stack — 2026-08-26

Extended `docker-compose.yml` to run PostgreSQL 16, MinIO, an idempotent MinIO bucket initializer, Redis, and the Content Factory app on the same `ace-network` Compose network. PostgreSQL and MinIO ports are bound to loopback only; the app uses Docker service hostnames `postgres` and `minio`, not `localhost`. Added persistent local Docker volumes for PostgreSQL and MinIO data.

Created a protected temporary local environment file outside the repository with generated local-only credentials and started the stack using it. PostgreSQL reported healthy, MinIO reported healthy, the `content-factory` bucket was created successfully, all required database/storage/auth variable names were present inside the app container, app health returned HTTP 200, and a protected route without authentication returned HTTP 401. The production image was corrected to package migration scripts so container-local readiness and preflight commands are available.

This local service availability does not approve migration. `MIGRATION_EXECUTE=false`, all migration approval flags remain false, file-backed authority remains primary, and `RELEASE_CONTROL_PRIMARY_READS=false` remains unchanged. The temporary environment file is outside Git and must not be committed or shared; the committed `.env` should be populated only by the owner if persistent local reuse is desired.

## User-provided local .env validation — 2026-08-26

The owner populated the local `.env`. Its presence, ignore status, and required variable names were checked without printing values. The unified stack was restarted from that `.env` and is healthy: Content Factory app HTTP 200, protected route without authentication HTTP 401, PostgreSQL accepting connections, MinIO healthy, Redis healthy, and the `content-factory` bucket initializer completed successfully.

Container-local migration preflight completed with exit code 0 and reported only the intentionally disabled primary-read cutover. Readiness completed with exit code 2 and now has only the reconciliation blocker. Reconciliation remains unresolved because malformed JSON and unowned records still require signed owner decisions. No SQL migration was applied, no MinIO artifact upload was performed, no source data was changed, and `MIGRATION_EXECUTE=false` / `RELEASE_CONTROL_PRIMARY_READS=false` remain unchanged.

## End-to-end local pipeline validation — 2026-08-26

The local end-to-end test initially exposed two real defects: the queue accepted legacy string `sceneInput` while the render worker expected an array, and Remotion could not access protected `/api/tmp` and `/api/music` assets without renderer authorization. The queue boundary now normalizes legacy string input. Render media URLs now carry short-lived, filename-bound HMAC authorization, while invalid or unauthenticated external media requests remain HTTP 401. Signed media URLs are treated as video/image by the filename extension rather than the query string.

The corrected local flow authenticated a tenant, enqueued a render job, processed it through the worker, emitted `processing` and `completed` tenant-scoped events, produced a rendered MP4 artifact, and persisted render status `rendered`. The final artifact was present at approximately 3 MB. Invalid media-token access returned HTTP 401. Provider-dependent publishing was not executed because no external publishing action or fabricated provider credentials are permitted; the publish API boundary remains available for separately approved provider acceptance.

## Phase 0/1 acceptance and Phase 8 connector/release surfaces — 2026-10-18

Phase 0 contracts are now enforced by a passing route-inventory gate (`npm run test:routes`) wired into `verify:production`. Canonical ownership vocabulary lives in `src/types/ownership.ts` (`workspaceId`, `connectorId`, `destinationId`, `releaseId`, `contentVersionId`) with focused regression coverage.

Phase 1 authorization hardening made the remaining tenant-owned routers fail-closed with `requireAuth` (account, approval, webhooks, A/B testing, branding, and content/AI engine namespaces) and completed the browser migration to the shared authenticated client; the only remaining `fetch` call sites are the authenticated wrapper itself and one hook that already routes through `apiClient`. The two-tenant acceptance harness now uses the canonical `/api/system-engines/auth/*` bootstrap routes and performs read-only cross-tenant probes: distinct bearer claims, tenant-protected metrics (HTTP 200 for both tenants), workspace connector/release lists verified not to leak another workspace's records, and cross-tenant or missing tenant/release/content-version reads returning non-enumerating 404. The harness was executed locally against two registered acceptance tenants and **passed**.

Phase 8 product surfaces started:
- `GET /api/releases` now lists workspace releases (newest first), with store-level regression coverage.
- New `/connectors` and `/releases` UI pages expose only tested server capabilities: connector metadata with managed-secret references, encrypted secret storage, destination creation, Telegram provider verification, release creation from a content version, approval, verified-destination targets, and queueing.
- The Connectors page states explicitly that a connected account does not enable posting, and provider verification is labeled Telegram-only. No UI action is presented without a matching protected route and test.

Validation: backend and UI typecheck passed; full regression suite passed with 73 files / 176 tests; route inventory passed; production build and documentation regeneration passed. The two-tenant acceptance gate executed successfully against the local stack. No provider credentials were fabricated, PostgreSQL and MinIO remain outside the Compose definition as unused, and migration/primary-read gates remain closed.

## Telegram provider acceptance — 2026-10-18

The first owner-provided provider acceptance completed through the workspace connector path. The owner-supplied Telegram bot credential from `.env` was stored in the encrypted connector secret store (never returned by the API, never placed in queue payloads, and never printed in evidence), the destination was verified against the live Telegram API (`getMe` returned the bot identity `Overseas_Jobs_Alerts_bot`, `getChat` returned chat type `private`), and one approved release asset was delivered exactly once through release → target → publish queue → worker.

Evidence: the worker log shows a single `PublishWorker processing job` and a single `Telegram: video sent` (message id `5`); the release target reached `published` with `externalId: "5"`. The workspace event timeline (`GET /api/job-events/events`) exposes the `publishing` → `completed` chain for the publish job, and the target's connector used `channelId` from the verified destination rather than any global fallback. Re-queueing the published target is refused with HTTP 409 (`Release target is not queueable`) and the worker skips already-published targets, so the accepted asset cannot be published twice. A follow-up fix makes `ReleaseTargetRecord.attempts` count publish starts only, with store-level regression coverage.

Not yet exercised: token rotation/revocation, provider failure and retry drills, audit retention, provider scheduling, and every non-Telegram provider. No provider credentials were fabricated, no automatic posting is enabled, and publishing required an explicit approved release, connected connector, and verified destination.
