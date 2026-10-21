# Durable Content Factory — Reality Gap Register

**Status date:** 2026-10-21  
**Canonical checkout:** `/Users/admin/Documents/short-video-creator-master`  
**Purpose:** Replace optimistic or conflicting completion language with an evidence-based statement of what is implemented, what is only partially implemented, and what must be built before production deployment.

## Executive conclusion

The current checkout is a broad creator application with a newer React/Express interface, many content engines, Redis/BullMQ support, FFmpeg/Whisper-based media processing, and substantial fail-closed authentication and tenant-isolation work. It is **not yet a durable multi-tenant Content Factory**. The durable target still requires PostgreSQL authority, MinIO/S3 artifact storage, durable job events, release-control state, provider lifecycle management, complete authenticated UI propagation, observability, off-host backup replication with durable-store disaster recovery, and production acceptance traffic.

The recent work improved the security boundary, but it did not create those missing systems. File-backed JSON remains the effective application persistence, local filesystem paths remain the effective media authority, and the Compose stack contains the application and Redis only. Therefore, healthy Docker status and passing tests must be interpreted as **current-scope validation**, not production readiness.

## Evidence baseline

| Area | Current evidence | Honest classification |
|---|---|---|
| Runtime | Docker Compose runs `ace-app` and `ace-redis` on port `3123`; health endpoint returns 200 | Development/beta runtime is healthy |
| Persistence | `src/db` and service stores remain JSON/file-backed; no PostgreSQL client or migration runner is present | Prototype persistence; not horizontally durable |
| Backup / DR | Encrypted full-data backups (stores + media + encrypted connector secrets) with checksum manifests, retention, fail-closed restore, and a live isolated-app restore rehearsal; archives are local-only and Redis queue state is excluded | File-backed recovery proven locally; off-host replication open |
| Object storage | Generated, filtered, repurposed, and video paths remain local filesystem paths; owner-aware prefixes are interim controls | Safer local artifacts; MinIO not implemented |
| Authentication | `requireAuth` protects many API namespaces; missing/invalid credentials fail closed on covered routes | Strong progress, but route/client coverage still requires acceptance testing |
| Tenant isolation | Many repositories and workers derive tenant ownership; legacy unowned records are quarantined on covered boundaries | Substantial coverage, not proven universal |
| Jobs | Redis/BullMQ workers with aligned publish/render retry terminality, normalized publish failure classes (invalid credentials, lost permissions, and rejected payloads fail fast to dead-letter on the first attempt; provider rate limits honor bounded retry-after deferrals), drill-proven kill/restart exactly-once publish and kill-mid-render stalled resume (one artifact, one record, one completion), operator dead-letter recovery, and lifecycle events aligned to publish-start counts; ambiguous-provider-outcome reconciliation and automatic DLQ retry remain open | Partial job infrastructure |
| Providers | Telegram now completes verified end-to-end publishing with owner credentials (live bot/chat verification, encrypted bot-token storage, exactly-once delivery, event timeline, duplicate rejection, secret rotation/revocation, failure/retry/dead-letter drill with fail-fast classification and secret redaction, kill/restart exactly-once resume, and dead-letter recovery); token refresh (no expiry), audit retention, and every other provider remain incomplete | One provider proven end-to-end; provider platform still incomplete |
| Release control | `RELEASE_CONTROL_PRIMARY_READS` and the archived release-control/job-events layer are not in this promoted source | Missing P0 capability |
| Tests | Regression suite passes for covered scope; authenticated two-tenant acceptance now executes locally with registered tenants (distinct claims, scoped lists, non-enumerating cross-tenant 404s) and Telegram provider acceptance ran with the owner-provided bot credential | Good regression baseline; production owner-credential acceptance still pending |
| Frontend | Many feature pages exist; remaining raw-fetch/auth propagation and workflow completeness must be audited page by page | Broad UI, incomplete production workflow |

## Priority gap register

| ID | Priority | Gap | Why it matters | Acceptance criterion |
|---|---|---|---|---|
| G-01 | P0 | PostgreSQL not integrated | File-backed state cannot safely support concurrent instances, transactions, durable ownership, or recovery. PG was provisioned in compose but removed as unused. | PostgreSQL schema, migrations, repositories, transactions, dual-write/read-verify, reconciliation, and rollback evidence pass |
| G-02 | P0 | MinIO/S3 not integrated | Local media paths are not durable, portable, or safe for scaled workers. MinIO was provisioned in compose but removed as unused. | Artifact manifest + object upload/download, tenant prefixes, checksums, signed URLs, lifecycle cleanup, and migration reconciliation pass |
| G-03 | P0 | Release control and durable job events are absent | There is no authoritative release state or durable creator-facing job timeline in this checkout | `job_events`, idempotency keys, state transitions, DLQ/replay, release gates, and API/UI timeline acceptance pass |
| G-04 | P0 | Authenticated acceptance traffic remains partial | Local two-tenant acceptance now passes (distinct bearer claims, workspace-scoped lists, non-enumerating 404 cross-tenant reads), but production owner-credential mutation, queue-callback, and artifact-path acceptance is still unexercised | Owner-approved test tenants exercise 401/403/404, success, mutation, queue callback, and artifact access paths |
| G-05 | P0 | Provider credential lifecycle is partially proven | Telegram completed owner-credential connect, live destination verification, exactly-once publish, event timeline, duplicate rejection, secret rotation/revocation, and a failure/retry/dead-letter drill with normalized failure codes (invalid credentials fail fast on the first attempt with the target's error code recorded); token refresh (no expiry), audit retention, and other providers remain unexercised | At least one owner-configured provider completes connect, refresh, publish, failure, retry, revoke, and audit flows |
| G-06 | P1 | Artifact manifests are not wired to producers | The manifest seam exists, but generated outputs are not yet registered as authoritative records | Image/filter/repurpose/render producers register manifests with checksum and tenant ownership; reads resolve through scoped manifests |
| G-07 | P1 | Job orchestration is only partially durable | Publish retry terminality is a single contract (the release route uses the publish queue's attempt budget; the worker dead-letters only at BullMQ exhaustion) with a live two-attempt terminal drill; publish failures are classified into bounded retry classes (invalid credentials, lost permissions, and rejected payloads fail fast on the first attempt via `discard`, rate limits honor provider retry-after bounded to two deferrals) with live fail-fast and operator-recovery evidence; kill-mid-upload/restart published exactly once with a stalled-job resume; a kill-mid-render drill resumed via stalled detection to exactly one artifact, one render record, and one completion event; dead-lettered targets recover through operator re-queue; lifecycle events now align with the publish-start counter. Ambiguous provider-outcome reconciliation and automatic DLQ retry remain unproven | Kill/restart tests prove no duplicate publish/render, deterministic retry, DLQ recovery, and event ordering |
| G-08 | P1 | Observability and cost controls are incomplete | AI/provider spend, latency, queue saturation, and failure rates cannot be operated safely at scale | Structured metrics/traces/log correlation, per-tenant usage/cost ledger, alerts, and dashboards pass a runbook drill |
| G-09 | P1 | Backup and restore are proven only for the file-backed scope | A backup script is not evidence of recoverability; host loss still destroys local-only archives | Encrypted full backups (stores, media, encrypted connector secrets), checksum manifests, retention, fail-closed restore, isolated-app rehearsal, measured RPO/RTO, and rollback pass for the file-backed scope; off-host replication and Redis/durable-store recovery remain open |
| G-10 | P1 | Frontend workflow completion is uneven | Engines/pages existing does not mean the creator can finish a reliable end-to-end job | Authenticated UI journeys pass: create → generate → review → approve → render → publish → observe → recover |
| G-11 | P2 | RAG/vector learning and cross-run intelligence are incomplete | AI-learning files do not equal durable retrieval, evaluation, or model governance | Versioned embeddings/index, tenant scope, evaluation set, feedback loop, rollback, and cost limits pass |
| G-12 | P2 | Quality, Approval, Rights, and release workflows are incomplete | Content Factory governance cannot rely on individual engines alone | Rights checks, approval states, audit trail, release gates, and UI timeline pass |
| G-13 | P2 | Performance and horizontal scaling are unproven | A single Docker instance and Redis do not establish multi-instance behavior | Load, concurrency, queue backpressure, cache correctness, and multi-instance tests meet defined SLOs |
| G-14 | P3 | UX polish and feature discoverability remain | Broad feature surface can feel unfinished even when APIs exist | Information architecture, empty/error states, progress, retry actions, and accessibility review pass |

## What is genuinely complete in the current security increment

Mandatory authentication and substantial tenant isolation are real improvements. Covered repositories and route families now use authenticated tenant context, reject missing or invalid credentials, and quarantine unowned legacy records. AI-learning, quota/throttling, competitor history, series, skip-analysis, resource/recovery/credential admin boundaries, ViralRadar route protection, repurpose outputs, and image artifact filename/serving boundaries have received focused hardening.

These statements are deliberately narrower than “production-ready.” They describe route/repository protections and regression evidence, not durable storage, provider readiness, release governance, or complete end-to-end product operation.

## Recommended execution order

1. Freeze the real contracts and acceptance tests for job events, release state, and artifact manifests. (PostgreSQL/MinIO removed from compose as unused)
2. Add PostgreSQL and MinIO through owner-approved deployment configuration when durable storage is required; keep local files authoritative and keep all primary-read flags disabled.
3. Migrate the artifact manifest and highest-risk domain repositories using dual-write/read-verify and reconciliation.
4. Establish one durable BullMQ/job-event contract with idempotency, retries, DLQ replay, and creator-facing timeline events.
5. Complete provider OAuth/credential lifecycle and one full owner-configured publish path.
6. Finish authenticated UI migration and run real two-tenant acceptance journeys.
7. Add observability, cost controls, off-host backup replication, load tests, rollback drills, and only then consider controlled cutover.

## Non-goals and explicit prohibitions

No provider credentials are to be invented. No PostgreSQL or MinIO service is to be represented as enabled while it is absent from Compose and configuration. No primary-read/cutover flag is to be enabled before reconciliation and rollback evidence. No local artifact path is to become a cross-tenant authority merely because its filename contains a tenant prefix.

## Source evidence

The claims in this register are based on the canonical checkout's `docker-compose.yml`, `.env.example`, `package.json`, `src/config.ts`, `src/db`, `src/services`, `src/server/routers`, `src/workers`, `CURRENT_STATUS.md`, `docs/INDEPENDENT_CURRENT_MASTER_AUDIT.md`, `docs/PHASE_2_TENANT_ISOLATION_HANDOFF.md`, and `docs/POSTGRES_MINIO_MIGRATION_MATRIX.md`. The latest validation evidence is recorded in `CURRENT_STATUS.md`; it is scope evidence, not a production-readiness certification.
