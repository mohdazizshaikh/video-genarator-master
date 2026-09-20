# Promoted Master Task Tracker

## Promotion and Docker Replacement

- [x] Read persistent-computing guidance and repository instructions for both checkouts.
- [x] Inventory both checkouts, Docker containers, images, volumes, ports, and data paths.
- [x] Create timestamped rollback archives for both source trees, data/configuration, PostgreSQL, Redis, and MinIO.
- [x] Stop and remove the old short-video Docker stack, project containers, named volumes, and project application images.
- [x] Preserve the previous master checkout at `/Users/admin/Documents/short-video-creator-master-pre-promotion-20260822-022327`.
- [x] Promote `/Users/admin/Documents/Short-video-creator` into `/Users/admin/Documents/short-video-creator-master`.
- [x] Fix the promoted Docker build context so `scripts/copy-edge-tts-script.js` is available during `pnpm build`.
- [x] Build and start the promoted master application on port `3123`.
- [x] Correct Redis eviction policy to `noeviction` for BullMQ durability.
- [x] Verify application readiness, UI, API health, short-video listing, tenants, API documentation, and Redis health.
- [x] Write `docs/PROMOTED_MASTER_MIGRATION_EVIDENCE.md`.

## Explicit Feature Boundary

The promoted newer checkout does not contain the archived master’s `RELEASE_CONTROL_PRIMARY_READS`, PostgreSQL, MinIO, `job_events`, `/api/job-events`, or `/api/engines` implementation. Those are not marked complete in this tracker and must not be inferred from the promoted application’s healthy status. The promoted Compose stack currently contains the application and Redis only.

## Owner/Follow-up Work

- [ ] If PostgreSQL, MinIO, release control, job timeline, and primary-read migration remain required, port those features into this promoted checkout as a separately planned implementation.
- [ ] Keep external publishing credentials owner-provided; do not fabricate or enable providers automatically.

## Master Technical Audit — Evidence-Only Pass
- [x] Inventory the current promoted master checkout and record the audit baseline without modifying code.
- [x] Reverse-engineer architecture, features, user journeys, and data flow.
- [x] Audit frontend, backend, API contracts, authentication, configuration, and deployment.
- [x] Audit database/storage, AI/LLM, security, performance, testing, code quality, and dependencies.
- [x] Cross-check conflicts, mismatches, broken paths, incomplete functionality, and production readiness.
- [x] Write the complete master technical audit report and dependency-aware roadmap.

## Independent Current-State Verification Audit
- [x] Read the existing audit report as reference only and establish previous/current baselines.
- [x] Discover the entire current repository and reconstruct actual architecture and data flow.
- [x] Verify feature execution traces, frontend/backend API contracts, routes, storage, authentication, tenant security, and security controls.
- [x] Run current build, typecheck, lint, tests, runtime smoke, dependency, deployment, and production-readiness checks.
- [x] Classify every previous finding as fixed, remaining, changed, new, partial, prototype, backend-only, broken, or missing.
- [x] Write the independently verified current master audit and ordered roadmap.

## Durable Content Factory Implementation Plan
- [ ] Freeze architecture decisions, scope, contracts, invariants, and baseline acceptance gates.
- [~] Repair quality gates, API contracts, route discrepancies, and frontend authentication — shared client, VideoCreator, ProfilesPage, and ShortCreator fixes complete; remaining raw-fetch pages tracked below.
- [~] Enforce mandatory authentication, authorization, tenant isolation, input validation, CORS, secrets, and audit security — fail-closed `requireAuth` covers application namespaces, deferred video/MCP/queue APIs, content buckets, and system-engine operations; `TenantStore`/`TenantRouter` now enforce auth-derived self-tenant scope, while profiles/accounts, jobs, mappings, artifacts, and other resources remain.
- [ ] Introduce PostgreSQL migrations, repositories, dual-write/read-verify, reconciliation, and transactional authority — migration matrix created at `docs/POSTGRES_MINIO_MIGRATION_MATRIX.md`.
- [ ] Introduce MinIO/S3 artifact storage, signed URLs, lifecycle cleanup, and media migration — ownership and acceptance gates defined in `docs/POSTGRES_MINIO_MIGRATION_MATRIX.md`; image-generation/filter owner enforcement remains the prerequisite slice.
- [ ] Unify BullMQ job lifecycle, idempotency, retries, dead-letter handling, and durable job events.
- [ ] Restore Quality, Approval, Rights, release-control, and creator-facing timeline workflows.
- [ ] Complete provider adapters, AI orchestration, cost controls, retries, observability, alerts, and resilience.
- [ ] Harden performance, tests, Docker deployment, backups, restore, rollback, and disaster recovery.
- [ ] Execute staging acceptance and only then perform controlled primary-read/cutover handoff.

## Phase 1 — Quality, API Contract, and Frontend Auth Implementation
- [x] Fix the VideoCreator render-category type contract and default missing source language in ShortCreator.
- [x] Attach the persisted bearer token through the shared same-origin API client.
- [x] Validate backend typecheck, UI typecheck, full regression tests, and production build.
- [x] Migrate ProfilesPage profile/account/OAuth/resolve requests to the shared authenticated client.
- [~] Migrate remaining authenticated raw-fetch UI pages and hooks to the shared client — ProfilesPage and VideoLibraryPage migrated; other pages remain.
- [ ] Add focused regression tests for auth propagation and API response unwrapping.
- [x] Re-run runtime smoke tests against rebuilt Docker app: public health/docs remain 200; protected namespaces and invalid bearer tokens return 401; POST auth bootstrap validation remains public with expected 400 input errors.

## Phase 2 — Mandatory Authorization and Tenant Isolation
- [x] Inventory AI-learning, quota, prediction, feedback, and remaining file-backed repository callers.
- [x] Define tenant-owned learning data versus platform-wide quota policy and legacy-record handling.
- [x] Implement auth-derived scoped reads/mutations and safe quota accounting without changing external UI contracts.
- [x] Add focused isolation/quota tests and rerun typecheck, full regression, build, Docker, and runtime gates: 51 files and 120 tests passed; Docker health 200; unauthenticated AI/throttle 401.
- [x] Complete final Phase 2 inventory and ownership classification — competitor history, series, skip-analysis, resource, recovery, credential, and ViralRadar boundaries are classified; local generated/filtered/repurposed artifacts remain for MinIO implementation.

- [x] Inventory schedule persistence, scheduler callbacks, run/status/delete routes, and pipeline-created schedules.
- [x] Define auth-derived schedule ownership and legacy-record quarantine behavior — schedules are tenant workspace data; legacy unowned schedules are hidden and are not executed by the background runner.
- [x] Implement tenant-scoped schedule reads, mutations, execution callbacks, and statistics without changing UI contracts — direct routes, pipeline-created schedules, due execution, status/run accounting, and deletion use auth-derived ownership.
- [x] Add schedule isolation tests and rerun typecheck, full regression, build, Docker, and runtime gates; complete suite passed with 49 files and 115 tests.

- [x] Inventory analytics and scheduling stores, route callers, worker callers, and derived resource relationships.
- [x] Select the safer next boundary and define auth-derived ownership plus legacy quarantine behavior — analytics and audience targets are tenant workspace data; legacy unowned records are hidden.
- [x] Implement scoped repository/service access and propagate tenant context through routes and workers without changing external UI contracts — analytics upsert/read/dashboard paths and audience creation/listing now use auth-derived tenant scope.
- [x] Add focused isolation tests and rerun typecheck, full regression, build, Docker, and runtime gates; container is healthy and protected routes fail closed, while `/api/health` reported `videoEngine: initializing` during the final sample.

- [x] Inventory analytics, scheduling, pipeline, audience, AI-learning, quota, and remaining file-backed repository callers.
- [x] Select the next highest-risk boundary and define auth-derived ownership plus legacy quarantine behavior — pipeline jobs, generated variations, comparisons, and stats are tenant workspace data; legacy unowned records are hidden.
- [x] Implement scoped repository/service access and propagate tenant context through routes and workers without changing external UI contracts — PipelineRouter and PipelineOrchestrator now persist and read auth-derived tenant ownership.
- [x] Add focused isolation tests and rerun typecheck, full regression, build, Docker, and runtime gates.

- [x] Inventory report persistence, RSS/ingest/planning flows, asset/file endpoints, and remaining artifact callers.
- [x] Define whether reports are tenant-owned or system-shared, and quarantine legacy records accordingly — reports are tenant workspace data because they feed tenant-specific merges and plans; legacy unowned reports are hidden.
- [x] Add scoped report/asset access and propagate ownership through route and worker paths without breaking provider/source contracts — report routes, ingest/planning payloads, report status mutations, derived script-plan listing, and video-library CRUD/search/stats/tags/metrics/artifact paths are tenant-scoped.
- [x] Add isolation tests and run typecheck, full regression, build, Docker, and runtime gates.

- [x] Inventory video metadata, report, asset, artifact, and remaining file-backed repository read/write callers.
- [x] Define auth-derived ownership and legacy quarantine rules for the next selected resource boundary.
- [x] Add scoped repository/service access and propagate tenant context through routes and workers — video metadata is tenant-owned from ShortCreator generation through REST and publish lookup paths.
- [x] Add focused isolation tests and rerun typecheck, full regression, build, Docker, and runtime gates.

- [x] Inventory artifact stores, video metadata, render jobs, assets, reports, and remaining file-backed service repositories for tenant-sensitive access.
- [x] Define auth-derived ownership fields and legacy-record quarantine rules for the selected next boundary.
- [x] Add scoped repository/service access and route/worker propagation without changing external UI contracts — render jobs now carry tenant ownership through queue creation and RenderWorker mutations.
- [x] Add focused isolation tests, then run typecheck, full regression, build, Docker rebuild, and runtime smoke checks.

- [x] Inventory publish-job stores, enqueue payloads, channel mappings, and all read/update/delete callers.
- [x] Define how authenticated tenant ownership propagates into persisted publish jobs and mapping records, including legacy records.
- [x] Add repository-scoped publish-job and channel-mapping accessors with non-enumerating cross-tenant behavior.
- [x] Add route, worker, and queue regression coverage; preserve `RELEASE_CONTROL_PRIMARY_READS=false`.

- [x] Inventory every authenticated request path and map tenant identity from bearer claims to services and repositories.
- [x] Define fail-closed tenant-context invariants and reject client-supplied cross-tenant identifiers.
- [x] Add scoped repository/service access for the first high-risk file-backed resources without changing the newer UI or engine contracts — `TenantStore`/`TenantRouter` plus `ProfileStore`/`ProfileService`/`ProfilesRouter` and publish-worker account lookups now use auth-derived tenant scope.
- [~] Add cross-tenant regression tests and runtime smoke checks for 401/403/404 behavior — tenant, profile/account, publish-job, and channel-config repository tests pass; authenticated HTTP success/cross-tenant tests remain pending until owner-provided tenant credentials are available.
- [x] Update the current audit and phase evidence after validation; keep `RELEASE_CONTROL_PRIMARY_READS=false`.
- [~] Continue remaining Phase 2 artifact/service isolation — tenant, profile/account, publish-job, channel-config, render-job, video metadata, video-library, report, derived script-plan, pipeline, analytics, audience, scheduling, AI-learning, quota, competitor history, series, skip-analysis, resource, recovery, credential, ViralRadar, repurpose, image-generation, and image-filter boundaries are classified/scoped with interim owner-aware filesystem controls; MinIO manifests, signed URLs, lifecycle cleanup, and residual-store closure remain.

## Phase 0 — Architecture Freeze Implementation
- [x] Record the promoted master checkout and commit as the canonical source of truth.
- [x] Decide and document that PostgreSQL, MinIO, durable job events, and release control are required for the durable Content Factory track.
- [x] Freeze ownership boundaries for API, workers, PostgreSQL, Redis, MinIO, providers, and frontend state.
- [x] Define route classes, tenant identity rules, queue states, release states, migration flags, and acceptance gates.
- [x] Create the phase evidence and rollback convention before Phase 1 code changes.

## Phase 3 — Durable PostgreSQL/MinIO Migration Prerequisites
- [x] Audit PostgreSQL and MinIO availability, Compose services, environment variables, migrations, and rollback/backup prerequisites — Compose contains app + Redis only; PostgreSQL/MinIO clients, runners, endpoints, and approved credentials are absent.
- [x] Map tenant-owned artifact manifests, checksums, object prefixes, signed URL policy, and local-file quarantine rules — documented in `docs/POSTGRES_MINIO_MIGRATION_MATRIX.md`; local files remain authoritative until reconciliation.
- [x] Implement only a migration-ready prerequisite until real PostgreSQL/MinIO endpoints and owner-approved secrets are available; local manifest seam and producer registration are implemented without fabricating credentials. Real durable services remain gated.
- [x] Validate compatibility, full regression, production build, Docker runtime, and rollback safety before enabling any primary-read cutover -- current gates passed; durable cutover remains disabled.

## Phase 3 — Artifact Manifest and Storage Seam
- [x] Define an owner-aware artifact manifest schema with tenant, kind, local path, object key, checksum, size, MIME type, and lifecycle state in `src/db/ArtifactManifestStore.ts`.
- [x] Implement local manifest persistence and a future MinIO-compatible storage-provider seam without enabling unavailable infrastructure; local manifest persistence is complete, while real MinIO remains gated on owner-approved infrastructure.
- [x] Integrate generated-image, filtered-image, and repurposed-clip producers with manifest registration and scoped lookup -- local manifest registration and owner-aware access are complete; MinIO upload/authority remains.
- [x] Run focused isolation tests, full regression, production build, Docker smoke, and update all status/handoff evidence — manifest tests 2 passed; Docker health 200; unauthenticated image/repurpose 401.

## Re-baseline — Durable Content Factory Gap Register
- [x] Audit implemented versus missing user-facing features, workflow completeness, infrastructure, provider lifecycle, job durability, artifacts, observability, and disaster recovery -- documented in `docs/REALITY_GAP_REGISTER.md`.
- [x] Classify each gap as P0 blocker, P1 production risk, P2 capability gap, or P3 polish, with evidence and acceptance criteria in the gap register.
- [x] Reconcile CURRENT_STATUS, audit, handoff, migration matrix, and this checklist so no document claims an unimplemented feature is complete; durable services remain explicitly open.
- [x] Write the prioritized gap register and execution sequence before starting the next feature implementation.

## P0 Prerequisite — Artifact Producer Manifest Registration
- [x] Define non-blocking manifest registration semantics: artifact generation remains authoritative locally, while manifest failure is visible and never silently changes ownership.
- [x] Wire image-generation, image-filter, and repurpose producers to register tenant-owned manifests after successful output creation.
- [x] Add producer-registration and cross-tenant manifest regression coverage.
- [x] Run full regression, production build, Docker smoke, and record the next MinIO cutover gate.

## P0 — Migration-Ready Job Events and Release Control
- [x] Audit existing job-event, release-control, idempotency, queue-state, and router/worker contracts.
- [x] Define tenant ownership, event ordering, transition, replay, and admin-only release invariants.
- [x] Implement a migration-ready local/Redis event and release boundary without enabling primary reads or fabricating durable infrastructure.
- [x] Add regression coverage for tenant isolation, idempotency, invalid transitions, and fail-closed access.
- [x] Run full regression, production build, Docker smoke, and reconcile status/handoff documents.

## Phase 3 — PostgreSQL Migration Foundation
- [x] Audit current file-backed stores, schema conventions, config flags, and migration tooling.
- [x] Define PostgreSQL domain schema, tenant constraints, artifact manifest relations, and dual-read/write gate contracts.
- [x] Implement a non-authoritative migration foundation only; local stores remain primary until infrastructure and reconciliation gates pass.
- [x] Add migration idempotency, tenant-constraint, rollback, and unavailable-database regression coverage.
- [x] Run full regression, production build, Docker smoke, and update status/migration evidence.

## Phase 3 — Migration Checkpoint Foundation
- [x] Verify the draft PostgreSQL migration is present in the canonical checkout and is never auto-applied.
- [x] Add deterministic migration checksum and applied-checkpoint contracts.
- [x] Add a dry-run/status command that fails closed when DATABASE_URL is absent.
- [x] Test checksum idempotency, unavailable-database behavior, and rollback guidance.
- [x] Run full regression, production build, Docker smoke, and update the phase-wise checklist/evidence.

## Phase 5 — Migration-Ready Worker Events
- [x] Audit render/publish worker job payloads, tenant claims, retries, and failure paths.
- [x] Define tenant-scoped lifecycle events, idempotency keys, ordering, and retry/DLQ semantics.
- [x] Integrate local event emission into worker lifecycle without changing job response contracts.
- [x] Add worker isolation, duplicate-event, retry, and missing-tenant regression coverage.
- [x] Run full regression, production build, Docker smoke, and update status/handoff evidence.

## Phase 5 — Remaining Queue Lifecycle Events
- [x] Inventory ingest, planning, scheduling, dead-letter, and other queue producers/workers.
- [x] Define common tenant, idempotency, ordering, retry, and DLQ event invariants.
- [x] Integrate remaining queue lifecycle events without changing external job contracts.
- [x] Add queue retry/DLQ and missing-tenant regression coverage.
- [x] Run full regression, production build, Docker smoke, and update checklist/status evidence.

## Phase 5 — Local Event Outbox and Replay Boundary
- [x] Audit JobEventStore consumers and current metrics/replay exposure.
- [x] Define outbox delivery state, replay limits, DLQ transitions, and tenant/admin access rules.
- [x] Implement local outbox persistence and replay-safe operations without claiming durable DB authority.
- [x] Add cross-tenant, idempotency, replay, and DLQ regression coverage.
- [x] Run full regression, production build, Docker smoke, and update checklist/status/migration evidence.

## Phase 5 — Event Replay and Outbox Operations
- [x] Audit outbox route exposure, event consumers, and current auth boundaries.
- [x] Define tenant replay inspection and admin operational controls with bounded limits.
- [x] Implement authenticated tenant event/outbox inspection and admin-only requeue controls.
- [x] Add cross-tenant, authorization, replay-limit, and requeue regression coverage.
- [x] Run full regression, production build, Docker smoke, and update checklist/status/migration evidence.

## Repository Delivery
- [x] Audit git status, remotes, ignore rules, and sensitive files.
- [x] Create a new private GitHub repository and configure the local remote.
- [x] Commit the current canonical implementation with a descriptive message.
- [x] Push the commit to the main branch.
- [x] Verify the remote repository and commit without exposing secrets.

## Phase 3 Continuation After GitHub Delivery
- [x] Verify post-push checkout, clean tree, current remotes, and remaining P0 checklist.
- [x] Select the next safe PostgreSQL/MinIO or event-delivery boundary without enabling unavailable infrastructure.
- [x] Implement the migration-ready boundary while keeping file-backed authority and `RELEASE_CONTROL_PRIMARY_READS=false`.
- [x] Add regression coverage and run typecheck, full tests, build, Docker, and runtime gates.
- [x] Update checklist, status, migration evidence, and push the verified follow-up commit.

## Phase 3 — Migration Preflight and Reconciliation Safety
- [x] Verify canonical checkout and current migration checklist state.
- [x] Define preflight, lock, reconciliation, and no-cutover invariants.
- [x] Implement gated migration preflight and a local reconciliation report.
- [x] Add regression tests for unavailable database, lock, checksum drift, and rollback safety.
- [x] Run typecheck, full tests, production build, Docker/runtime checks, update evidence, and push the verified commit.

## Phase 3 — Non-Destructive Reconciliation
- [x] Audit current local store inventory and migration preflight output.
- [x] Define non-destructive reconciliation, ownership, and legacy-quarantine rules.
- [x] Implement reconciliation report and artifact-manifest inventory without mutating source data.
- [x] Add regression coverage for malformed stores, ownership mismatches, and report determinism.
- [x] Run typecheck, full tests, build, Docker/runtime checks, update evidence, and push the verified commit.
## Phase 3 — Safe Reconciliation Remediation

## API-Key Onboarding Fix
- [ ] Trace the browser auth state and first-workspace API contract causing `/api/tenants` and `/api/tenants//keys` to return `401`.
- [ ] Implement secure local API-key login/session bootstrap without exposing credentials.
- [ ] Fix first-workspace creation and key-generation UX so empty tenant IDs cannot be submitted.
- [ ] Validate authenticated protected routes, tenant isolation, workspace creation, and API-key generation.
- [ ] Update current status and local setup documentation with the corrected login steps.

## Aaditech Local Workspace and Telegram Automation
- [ ] Inspect the `/tenants` workspace creation flow and Telegram integration configuration.
- [ ] Create the Aaditech Solution workspace with verified website metadata and tenant isolation.
- [ ] Configure a Telegram auto-posting target only when the connector, bot permissions, and destination are unambiguous.
- [ ] Define draft/approval/publish rules so unapproved marketing content is never posted automatically.
- [ ] Prepare original, verified, non-duplicate Aaditech marketing content and reel brief.
- [ ] Validate the workspace and automation boundary, then update status documentation.

## End-to-End Pipeline Verification
- [x] Re-read runtime guidance and inventory current pipeline entrypoints and worker services.
- [x] Define an isolated, non-destructive test scope and credentials without fabricating provider outcomes.
- [x] Verify authenticated API, tenant claims, queue/event flow, worker processing, artifacts, and analytics where reachable.
- [x] Fix the discovered queue-to-render contract mismatch where string `sceneInput` reaches a worker expecting a scene array, then rerun the end-to-end test.
- [x] Fix renderer access to tenant-scoped `/api/tmp` and `/api/music` media with short-lived signed authorization while preserving external HTTP 401 behavior.
- [x] Verify negative auth/isolation cases and provider-dependent boundaries; external provider publishing remains intentionally unexecuted.
- [x] Update current status with a stage-by-stage end-to-end verdict.

## User .env Verification and Local Stack Run
- [x] Verify required local database, MinIO, auth, and migration variables without printing values.
- [x] Restart the unified Compose stack from the user-populated `.env`.
- [x] Validate PostgreSQL, MinIO bucket, Redis, app health, and protected-route authentication.
- [x] Run migration preflight/readiness and confirm no cutover or destructive migration occurs.
- [x] Record the result in the status documentation.

## Local Environment Configuration Guide
- [x] Verify Docker Compose service names, internal hostnames, ports, and environment variable names.
- [x] Confirm `.env` remains local-only and secrets are excluded from Git/GitHub.
- [x] Provide exact PostgreSQL, MinIO, and temporary-auth setup steps with restart and validation commands.
- [x] Document local-only endpoint behavior and safe secret rotation.

## Next Remaining Migration Slice
- [x] Re-baseline the latest readiness output, data counts, manifest state, and current owner-dependent blockers.
- [x] Add a signed/validated reconciliation decision manifest format for explicit tenant mapping or quarantine; never apply it automatically.
- [x] Add rollback/read-verify evidence validation and prevent cutover when evidence is incomplete.
- [x] Run focused and full regression, typecheck, build, Docker, and fail-closed migration checks.
- [x] Update status, matrix, runbook, and checklist with the verified result.

## Remaining Migration Implementation Slice
- [x] Re-baseline the current readiness report and identify gaps left after the gated tooling increment.
- [x] Implement deterministic dual-write/read-verify comparison contracts without changing file-backed authority.
- [x] Add an authenticated two-tenant acceptance harness that requires owner-provided credentials and fails closed when absent.
- [x] Add backup/rollback evidence checks and update the migration runbook and matrix.
- [x] Run the full regression, typecheck, build, Docker, and fail-closed migration checks.
- [x] Update all status documents and push the verified implementation.

## Full Migration Readiness Workstream
- [x] Re-baseline migration blockers, available infrastructure, credentials, and current authority without exposing secrets.
- [x] Implement gated PostgreSQL migration execution, checksum checkpoints, transactional locking, rollback-on-error, and cutover safety contracts; dual-write/read-verify remains owner/infrastructure gated.
- [x] Implement gated MinIO/S3 artifact copy, path/tenant-prefix validation, checksum/size verification, and local-source rollback safety; signed-access/lifecycle authority remains gated.
- [ ] Complete malformed-store recovery and unowned-record reconciliation only through owner-approved mapping/quarantine manifests.
- [~] Add metadata backup/restore verification; authenticated two-tenant acceptance tests remain pending until two owner-approved tenant credentials are available.
- [x] Run full regression, typecheck, build, Docker/runtime, migration preflight, and storage readiness validation; expected blockers remain fail-closed.
- [x] Update evidence with a truthful migration-readiness verdict; keep file-backed authority until every gate passes.

## Local Testing Authentication Override
- [x] Inspect the existing local authentication/password configuration and Docker env loading; the system uses tenant API keys rather than user passwords.
- [x] Set a temporary local-only testing credential without committing the generated API key or changing production configuration.
- [x] Validate API-key authentication, token verification, invalid-credential rejection, and a protected route locally.
- [x] Document the exact rotation/removal steps in `docs/LOCAL_TEST_AUTH.md`; keep the credential out of GitHub.
- [x] Add a dry-run-only quarantine/report command for malformed JSON stores; never overwrite source data.
- [x] Add a dry-run-only quarantine/report command for unowned records; require an explicit tenant mapping manifest before any move.
- [x] Add fixture validation proving source files remain unchanged and tenant mappings are fail-closed.
- [x] Re-run the full regression suite, typecheck, build, Docker smoke tests, and migration preflight.
- [x] Record remediation results and remaining owner-approved blockers in the current status document.

## Newly reported tenant-console blockers

- [x] Trace why `/api/health/dashboard` is requested without a valid bearer session and make the request auth-aware or disable it until authenticated.
- [x] Fix the empty tenant ID state that produces `/api/tenants//logs/workspace`.
- [x] Replace the invalid `/api/tenants/:tenantId/keys` generation/list/delete contract with an implemented tenant-scoped API-key contract.
- [x] Rebuild and verify Aaditech workspace selection and API-key generation end to end in the browser.

## Quota request flood reported by browser

- [x] Stabilize quota query function/options references so one tenant-console mount does not create an unbounded request loop.
- [x] Ensure HTTP 429 responses are treated as terminal for the current fetch and do not trigger rapid retries.
- [x] Rebuild and verify the quota endpoint request cadence and rendered quota values.

## AI Content Empire dashboard audit findings

- [x] Cross-check `/api/short-videos` failure against the current backend route, auth middleware, and frontend API client.
- [x] Make dashboard navigation controls route to real pages or clearly mark unavailable destinations.
- [x] Separate loading, error, and empty video-list states so conflicting messages are not shown together.
- [x] Determine whether search, filtering, and pagination are required by the current video-list contract and implement only supported behavior.
- [x] Rebuild and verify dashboard behavior on the local Docker stack.

## Dashboard audit: auth, navigation, and creation flow

- [x] Verify whether the stored session token is expired/invalid and whether the API client handles 401 responses consistently.
- [x] Verify Create Video, Publish, Analytics, and other sidebar routes in the actual route table and browser.
- [x] Inventory sidebar items that are real pages versus placeholders or unavailable features; do not label implemented pages as placeholders without evidence.
- [x] Verify the Create Video form has the required text, media, and render inputs for the current product scope.
- [x] Verify session-expiry UX redirects or gates safely without weakening authentication.
- [x] Rebuild and run regression/browser verification for confirmed fixes.

## Multi-workspace connector architecture

- [ ] Document workspace-scoped connector and credential isolation rules.
- [ ] Define Telegram multi-bot data model, permissions, approvals, and posting lifecycle.
- [ ] Define social-media connector account mapping, token lifecycle, and per-workspace queues.
- [ ] Define retries, idempotency, rate limits, audit logs, observability, and failure handling.
- [ ] Define local Docker and production deployment requirements for connector workers.

## Documentation reconciliation

- [x] Inventory existing connector, tenant, migration, local-setup, and automation documents.
- [x] Compare the new connector blueprint against existing implementation and runbooks for duplicate or conflicting contracts.
- [x] Consolidate the connector documentation into one source of truth and cross-link supporting runbooks.
- [x] Record confirmed implemented items separately from planned connector capabilities.
- [x] Validate documentation references and report remaining gaps.

## Fresh deep technical audit and implementation plan

- [x] Establish one current baseline across code, runtime, and documentation authority.
- [x] Audit tenancy, authentication, authorization, and secret boundaries end to end.
- [x] Audit PostgreSQL/MinIO migration, artifact lifecycle, queues, workers, and recovery controls.
- [x] Audit connector, publishing, scheduling, approvals, retries, and idempotency against current implementation.
- [x] Audit frontend routes, state transitions, UX, observability, and test coverage.
- [x] Rank only confirmed gaps and reconcile duplicate or conflicting plan items.
- [ ] Write the final dependency-aware implementation plan with acceptance gates.

## Approved end-to-end implementation order

- [x] Freeze canonical workspace, connector, destination, release, and content-version vocabulary.
- [ ] Classify all routes and complete current file-backed authorization hardening.
- [ ] Replace protected direct UI fetches with the authenticated client boundary.
- [ ] Resolve migration reconciliation, backup/restore, database, MinIO, and approval gates without enabling primary reads automatically.
- [ ] Introduce repository interfaces and verified dual-read/write migration evidence.
- [ ] Migrate profile accounts into workspace-owned connectors without duplicate active stores.
- [ ] Add release targets, destination verification, approval enforcement, failure classes, retries, and idempotency.
- [ ] Implement Telegram connector first, then staged social providers with real credentials or explicit test doubles only.
- [ ] Complete worker operations, observability, recovery drills, and deployment hardening.
- [ ] Complete connector UX, authorization matrix, acceptance tests, documentation, and final checkpoint.

## Approved implementation progress

- [x] Canonical workspace/connector/destination/release ownership vocabulary and tests.
- [x] Workspace-scoped approval and A/B testing access paths.
- [x] Workspace-scoped webhook CRUD, notification dispatch, and secret-safe responses.
- [x] Authenticated UI fetch boundary and protected 401 session cleanup.
- [x] Gated PostgreSQL foundation migration at migrations/001_content_factory.sql; not executed.
- [x] File-backed workspace-owned ConnectorStore and protected /api/connectors metadata routes.
- [x] ReleaseStore approval and idempotency foundation; not yet wired to the publish worker.
- [x] Global provider credential fallback is explicit opt-in and defaults to fail-closed.
- [ ] Wire ConnectorStore/ReleaseStore into the publish worker and provider verification lifecycle.
- [ ] Complete PostgreSQL/MinIO readiness prerequisites and perform owner-approved migration.
- [ ] Add Telegram connector verification and approval-gated publishing.
- [ ] Add remaining social provider adapters and operational recovery drills.

## End-to-end implementation progress (latest)

- [x] Encrypted workspace-scoped connector secret vault with no plaintext-at-rest storage.
- [x] Protected connector secret rotation endpoint returns metadata only.
- [x] Workspace-owned release and release-target API with approval and verified-destination gates.
- [x] Publish worker recognizes release targets, records publishing/published/retryable lifecycle, and skips already-published targets.
- [x] Missing gated SQL migration authority added at migrations/001_content_factory.sql; readiness discovers it and still fails closed on unmet gates.
- [x] Full regression after latest slice: 63 test files / 150 tests passed.
- [ ] Provider verification must resolve connector secrets from ConnectorSecretStore instead of legacy global Config values.
- [ ] Migrate legacy ProfileAccount credentials into explicit workspace connector mappings with provenance and rollback.
- [ ] Add Telegram getMe/getChat/member verification and destination status transitions.
- [ ] Add provider idempotency/reconciliation and queue retry policies for release targets.

## Connector and release vertical slice progress

- [x] Workspace connector secrets are encrypted at rest in a separate store and are never returned by APIs.
- [x] Telegram connector destination verification uses official getMe/getChat calls and stores only safe evidence.
- [x] Verified Telegram destinations transition connector metadata to connected.
- [x] Approved release targets can be queued with workspace connectorId/destinationId and a deterministic BullMQ job ID.
- [x] PublishWorker resolves workspace connector credentials and requires a verified destination before provider execution.
- [x] Unauthenticated connector/release API smoke tests return 401 after Docker rebuild.
- [ ] Provider-specific secret key schemas and provider adapters remain to be completed one-by-one.
- [ ] PostgreSQL/MinIO cutover remains gated; no migration data was applied.

## Forensic readiness mismatch audit

- [ ] Compare canonical checkout path with Docker build context, container working directory, and bind-mounted data path.
- [ ] Compare `.env`/`.env.example` names, dotenv loading, compose interpolation, and runtime environment without printing secrets.
- [ ] Compare migration directory/name discovery with readiness/apply scripts and documentation references.
- [ ] Compare every store filename and data directory used by the app, migration tools, and reconciliation tools.
- [ ] Reconcile tenant/workspace IDs and identify whether unowned records are caused by path, seed, or schema mismatch.
- [ ] Produce a non-destructive mismatch report before any quarantine, migration, or destructive operation.

## Safe migration-readiness remediation

- [x] Create a non-destructive backup of the canonical `data/` directory and record its manifest/checksums.
- [x] Repair only the verified zero-byte `reports.json` and `scriptPlans.json` stores as valid empty JSON arrays, preserving the backup.
- [x] Generate a redacted mapping/quarantine report for the 49 legacy unowned tenant-scoped records before reset; this report is superseded by the completed greenfield reset.
- [x] Validate the database URL/configuration shape without printing secret values.
- [x] Rerun migration readiness and reconciliation before reset; the old dataset was then discarded by owner approval. Fresh greenfield readiness now passes with zero unowned records; no PostgreSQL/MinIO migration was applied.

## Greenfield runtime reset

- [x] Audit and freeze the exact reset scope; preserve source code and current configuration.
- [x] Create an emergency rollback archive outside the active project data path.
- [x] Stop the Docker stack and remove old file-backed runtime data, PostgreSQL/MinIO/Redis runtime state, and queues.
- [x] Recreate the clean local stack and verify service health.
- [x] Verify zero legacy users/workspaces/objects/jobs remain and initialize only required baseline records.
- [x] Create or onboard the fresh `Aaditech Solution` workspace without publishing to Telegram.
- [x] Update the authoritative audit and reset evidence.

## Fresh Aaditech Telegram connector

- [x] Inspect connector, destination, release, and encrypted-secret contracts.
- [x] Confirm the Telegram bot token and destination/chat ID are owner-provided without printing secrets.
- [x] Implement or refine workspace-scoped Telegram verification using `getMe` and `getChat`.
- [x] Store Telegram credentials encrypted at rest and retain only safe verification evidence.
- [x] Verify the Aaditech bot and destination through read-only provider calls.
- [x] Test release approval and publish safeguards without sending a Telegram post; pre-approval target creation was rejected, owner approval succeeded after the permission fix, and a verified target was created without queueing.
- [x] Document the exact remaining explicit publish action.

## Telegram publishing-pipeline hardening

- [x] Audit the authoritative plan and current Telegram publish worker path.
- [x] Trace connector, destination, release target, queue, and worker ownership boundaries.
- [x] Implement missing workspace-scoped Telegram publish safeguards only where evidence shows a gap; the worker now binds the verified workspace destination ID instead of relying on global channel configuration.
- [~] Add focused tests for approval, idempotency, routing, and secret redaction; focused lint and 5 release/job-store tests pass, while worker-level mock coverage remains. The full TypeScript check still reports 20 pre-existing fixture/type errors in unrelated test files.
- [x] Run a no-send release-gate dry run and validate the clean local stack; pre-approval was rejected, approved target creation succeeded, no queue was submitted, and the stack is healthy.
- [x] Document implementation status and the explicit real-publish action.

## Repository quality gate

- [x] Audit and classify all current TypeScript errors.
- [x] Repair only safe test fixtures and type contracts without changing runtime behavior.
- [~] Add regression coverage for workspace destination binding and Telegram secret redaction; production safeguards and focused validation are complete, but dedicated publisher mock tests remain a follow-up.
- [x] Run full type-check, touched-file lint, focused tests (16 passed), and production build.
- [x] Run no-send integration checks and validate Docker service health.
- [x] Document quality-gate results and remaining publish prerequisites.

## Telegram publisher regression coverage

- [ ] Inspect Telegram publisher seams and existing test conventions.
- [ ] Add isolated mocked tests for `getMe` validation and `sendVideo` request behavior.
- [ ] Add regression coverage for workspace destination binding and bot-token redaction.
- [ ] Run focused and full quality gates without provider writes.
- [ ] Document coverage and remaining explicit publish prerequisites.

## Dedicated Telegram publisher tests

- [x] Inspect current Telegram publisher seams and test conventions.
- [x] Add mocked `getMe` and `sendVideo` tests with network access blocked.
- [x] Assert workspace destination routing and bot-token redaction.
- [x] Run full type-check, lint, tests, and production build.
- [x] Document coverage and remaining real-publish prerequisites.

## Aaditech first marketing reel package

- [x] Verify factual business information from `https://aditechs.in` and record source URLs; the domain is currently a GoDaddy parked page with no reliable business facts.
- [x] Audit content-generation and duplicate-detection contracts; the package uses a unique title/script/caption and relies on the greenfield content stores plus normal signature checks.
- [x] Draft one factual reel script and platform metadata.
- [ ] Run duplicate-safety and approval-readiness checks.
- [ ] Create a non-publishing release draft for the verified Telegram destination.
- [ ] Deliver the package for explicit owner approval; do not publish automatically.

## Corrected Aaditech domain verification

- [x] Re-check `https://aaditechs.in` as the corrected official source and replace the earlier parked-domain conclusion if supported by live content.
- [x] Preserve source URLs and only use claims visibly supported by the corrected official site.

## Aaditech reel approval-draft validation

- [x] Inspect content and release contract requirements.
- [x] Validate script metadata and duplicate-safety inputs; the draft has a unique title/script/caption, but backend signature computation must run after a real content version is created.
- [x] Check asset and workspace prerequisites without external side effects; workspace, connector, verified private destination, and release authorization are present, while no rendered asset exists yet.
- [ ] Create only a non-publishing approval draft if validation passes.
- [ ] Report validation results and the explicit approval gate.

## Aaditech real content version and local render

- [ ] Inspect content-version, scene, engine, and render input contracts.
- [ ] Prepare a factual Aaditech content version from the approved reel package.
- [ ] Render the reel locally using existing engines without publishing.
- [ ] Validate video metadata, duplicate signature, and workspace ownership.
- [x] Create only a pending approval draft tied to the real content version; release `rel_120ed0be-628c-4872-a85e-f96ba7f7166a` is pending approval.
- [ ] Deliver the local reel asset and explicit approval decision.

## Workspace-scoped content versions

- [x] Audit existing ownership types, validators, and router wiring.
- [x] Define the content-version record and workspace-scoped store contract; initial `ContentVersionStore` foundation added with workspace isolation, signatures, lifecycle status, and safe atomic writes.
- [ ] Implement authenticated content-version routes and duplicate checks.
- [ ] Add tests for tenant isolation, signatures, lifecycle, and safe asset references.
- [ ] Wire release creation to validated content versions without queueing.
- [ ] Run quality gates and document the new content-version boundary.
- [ ] Report implementation status and remaining render approval steps.

## Content-version API boundary

- [ ] Inspect router construction and shared validation conventions.
- [x] Implement authenticated workspace-scoped content-version routes; added authenticated create/list/get/render-state endpoints under `/api/content-versions`.
- [x] Enforce content-version ownership and readiness in release creation; releases now require an existing same-workspace non-archived/non-failed version.
- [ ] Add tenant-isolation, duplicate, lifecycle, and safe-path tests.
- [ ] Run type-check, lint, tests, build, and no-send integration checks.
- [ ] Document the content-version boundary and remaining render steps.

## Active content-version API implementation

- [x] Implement authenticated workspace-scoped content-version routes; added authenticated create/list/get/render-state endpoints under `/api/content-versions`.
- [x] Enforce content-version ownership and readiness in release creation; releases now require an existing same-workspace non-archived/non-failed version.
- [ ] Add tenant-isolation, duplicate, lifecycle, and safe-path tests.
- [ ] Run type-check, lint, tests, build, and no-send integration checks.
- [ ] Document the content-version boundary and remaining render steps.

## Content-version verification

- [x] Add ContentVersionStore unit tests for workspace isolation, signatures, lifecycle, and safe render-path inputs; 3/3 passed.
- [ ] Add route-level tests for validation and safe render updates.
- [x] Run authenticated local API smoke tests without queueing; API-key exchange, content-version creation, and pending release creation succeeded with no queue submission.
- [ ] Run full type-check, lint, tests, and production build.
- [ ] Document verification evidence and remaining render integration.

## Content-version route verification

- [ ] Inspect route test utilities and authentication fixtures.
- [ ] Add route-level tests for validation, isolation, duplicates, and render updates.
- [x] Run authenticated local API smoke tests without queueing; API-key exchange, content-version creation, and pending release creation succeeded with no queue submission.
- [ ] Run full type-check, lint, tests, and production build.
- [ ] Document route evidence and remaining render integration.

## Aaditech local render

- [x] Inspect render-worker input, scene, engine, and output contracts.
- [x] Map the stored content version into a valid render job request; five factual scenes now include narration text, two search terms each, visual prompts, English language metadata, and a complete portrait explainer render configuration.
- [x] Run the local render without queueing a Telegram publish; render job `cmtc33boz00000dp32ej77i8l` completed successfully.
- [x] Validate rendered MP4 metadata, workspace binding, and content signature; 48.04s, H.264/AAC, 1080x1920 9:16, 44,737,481 bytes, SHA-256 recorded.
- [x] Attach the render to the pending draft without approval or publishing; content version `content-ccf7f6c6-d9a2-4425-a8c2-2b2ee1d4e8ea` is now `ready` with the local output path.
- [x] Report render result and explicit approval gate.

## Renderer-compatible Aaditech draft

- [ ] Inspect content-version update and render configuration contracts.
- [ ] Enrich Aaditech scenes with factual narration and visual search inputs.
- [~] Map the content version to a valid local render job; audit found the queue scheduler currently sends `config: {}` to the worker, so render configuration must be propagated before a real job is enqueued.
- [ ] Run the local render without queueing Telegram publishing.
- [ ] Validate output metadata, signature, and workspace ownership.
- [ ] Attach only local render evidence to the pending draft.
- [ ] Report render status and explicit approval gate.

## Aaditech actual local render

- [x] Inspect render job route, worker payload, and engine availability.
- [ ] Create a render job from the stored Aaditech content version.
- [ ] Run the local render and monitor its non-publishing lifecycle.
- [ ] Validate MP4 metadata, output path, signature, and workspace ownership.
- [ ] Attach the render result to the pending release without queueing Telegram.
- [ ] Report local render status and explicit approval gate.

## Render-config propagation

- [ ] Extend the render queue contract with validated render configuration.
- [ ] Bind content-version lifecycle updates to the render worker.
- [ ] Add queue and worker regression tests for config propagation.
- [ ] Run type-check, lint, tests, build, and restart the local stack.
- [ ] Enqueue and monitor a no-publish Aaditech render job.
- [ ] Validate the MP4 and document the approval gate.

## Aaditech marketing-video template redesign

- [x] Audit the current news template and identify marketing-specific visual mismatches.
- [x] Define an Aaditech marketing visual system and content treatment.
- [x] Implement a marketing-specific render template/profile without breaking news rendering.
- [x] Add marketing template regression tests; revised MP4 render remains pending.
- [ ] Compare the revised render against marketing requirements and update the pending release draft.
- [ ] Report the redesign, known limitations, and approval gate.

## Category-aware pipeline rollout

- [x] Inventory all supported categories, engines, templates, and current fallback behavior.
- [x] Define the category-to-pipeline matrix and shared safety invariants.
- [x] Implement category-specific profiles, themes, overlays, caption policies, and media rules.
- [x] Wire category profiles into generation, rendering, and queue payload configuration.
- [~] Add regression tests; focused profile/template tests pass (15/15), while representative renders for each category family remain pending.
- [ ] Update documentation and report category coverage, gaps, and rollout status.

## Advanced overlay systems

- [x] Audit existing overlay components, category routing, and scene metadata contracts.
- [x] Define the flexible knowledge/trend/quote/motivation overlay and dedicated sports overlay.
- [x] Implement both advanced overlay components.
- [x] Wire overlay selection to categories, sport metadata, captions, and render configuration.
- [~] Add regression tests and validate representative overlay compositions; TypeScript and 15 focused profile/template tests pass, and Tech/Sports MP4s rendered successfully. Connected-browser visual inspection remains pending.
- [x] Document overlay usage, supported categories, and remaining render validation.

## Continuation — Connected Intelligence and Source-Driven Automation
- [x] Audit existing scheduler, RSS/custom-source, tenant/workspace, approval, and duplicate-protection contracts.
- [~] Define tenant-scoped automation rule shape without duplicating existing source stores. Custom RSS source ownership is now tenant-aware; durable automation-rule persistence remains for the next slice.
- [~] Add source health and fallback behavior for unavailable providers. Existing intelligence fetchers already log provider failures and use available/cached signals; durable source-health state remains.
- [x] Wire scheduler ticks to create intelligence-backed review-queue drafts only; `runOnce()` processes enabled tenant rules and never renders or publishes.
- [x] Preserve explicit human approval before release or Telegram publishing; scheduler submissions remain pending in ApprovalEngine.
- [~] Add regression tests for tenant isolation, duplicate suppression, provider fallback, and scheduler approval gating. Tenant source/rule isolation, duplicate signature handling, and safe empty tick are covered; live provider fallback and populated scheduler approval integration remain.
- [x] Run typecheck, focused/full prior validation, and inspect the final diff; latest focused automation suite is green.
- [ ] Update implementation documentation with final status and remaining operational setup.

## Continuation — Workspace Automation Management
- [x] Audit existing REST router, auth guards, UI API client, and automation-rule contracts.
- [~] Implement authenticated tenant-scoped automation-rule APIs and source-health summaries. Rule APIs and configuration visibility are complete; durable per-provider health history remains.
- [x] Connect workspace UI controls and scheduler status to the new APIs through TenantConsole and AutomationRules.
- [~] Add regression tests for API tenant isolation, validation, rule lifecycle, and scheduler status. Store lifecycle and scheduler safety are covered; authenticated HTTP endpoint tests remain.
- [x] Run typecheck, full tests, and inspect the final diff; **71 test files / 171 tests pass**.
- [ ] Update implementation documentation with the final status and operational setup.
