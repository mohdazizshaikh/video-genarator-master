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
- [ ] Audit git status, remotes, ignore rules, and sensitive files.
- [ ] Create a new private GitHub repository and configure the local remote.
- [ ] Commit the current canonical implementation with a descriptive message.
- [ ] Push the commit to the main branch.
- [ ] Verify the remote repository and commit without exposing secrets.
