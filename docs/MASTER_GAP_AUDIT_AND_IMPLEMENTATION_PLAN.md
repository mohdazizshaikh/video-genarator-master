# Master Technical Gap Audit and Implementation Plan

> **Audit scope:** canonical `short-video-creator-master` checkout, local Docker stack, current documentation set, route registration, stores, workers, publishers, frontend clients, and existing automated tests.
>
> **Purpose:** establish one non-duplicated implementation plan for the Content Factory. This document distinguishes what is already implemented, what is partially implemented, what is blocked by owner approvals or provider credentials, and what remains to be built.
>
> **Authority rule:** current runtime and code evidence take precedence over old feature descriptions. Migration execution remains governed by `MIGRATION_RUNBOOK.md` and `POSTGRES_MINIO_MIGRATION_MATRIX.md`. Connector evolution remains governed by `MULTI_WORKSPACE_CONNECTOR_ARCHITECTURE.md`.

## Executive conclusion

The platform has a substantial working foundation: authenticated tenant onboarding, tenant-scoped routes in several core areas, a local Docker stack with PostgreSQL/MinIO/Redis services, file-backed compatibility stores, signed media access, rendering through the worker pipeline, publishing adapters, persistent schedules, and a broad automated test suite.

It is **not yet a production-ready multi-workspace Content Factory**. The largest remaining risks are not missing visual features. They are authorization consistency, migration readiness, credential ownership, provider-account modeling, durable release semantics, and end-to-end acceptance evidence.

The most important architectural fact is that the current external-account model is still **profile-owned** (`ProfileAccountStore`) while the desired model is **workspace-owned connectors with verified destinations**. These must not be implemented as two parallel active systems. A versioned migration and compatibility boundary is required.

## Current baseline

| Area | Confirmed current state | Confidence |
|---|---|---:|
| Local runtime | Docker Compose contains app, PostgreSQL 16, MinIO, Redis, and bucket initialization; app container is healthy on port 3123. | High |
| Migration remediation | Canonical data backup verified by SHA-256; `reports.json` and `scriptPlans.json` repaired from zero-byte to `[]`; `.env` remains ignored and the database URL is parseable with encoded reserved password characters. | High |
| Authoritative persistence | File-backed stores remain authoritative while migration gates are closed. | High |
| Migration readiness | Fresh greenfield reset completed: backup archive exists outside the active path, reconciliation reports zero unowned records and no malformed stores, and readiness passes; PostgreSQL/MinIO migration and primary-read cutover remain intentionally disabled. | High |
| Authentication | API-key to short-lived bearer flow exists; expired-session cleanup and onboarding redirect were added. | High |
| Tenant isolation | Strong in several modern routes, but not uniform across every protected router. | High |
| Content generation | Multiple engines and pipeline orchestration exist; render E2E has passed. | High |
| Publishing | Platform adapters, publish jobs, worker attempts, and global fallback configuration exist. | High |
| External accounts | Profile-scoped encrypted credentials and OAuth/profile routes exist. | High |
| Multi-bot connectors | Not implemented as a first-class workspace connector/destination subsystem. | High |
| Frontend API consistency | Shared authenticated client exists, but many UI pages still call raw `fetch()` directly. | High |
| Automated tests | Broad unit/integration coverage exists, but connector, provider, authorization-matrix, and two-workspace acceptance coverage is incomplete or gated. | High |

## Confirmed gaps

### P0 — must be resolved before production multi-workspace use

| ID | Confirmed gap | Evidence | Risk | Required outcome |
|---|---|---|---|---|
| P0-01 | Tenant authorization is not uniform across protected routers. | Several mounted protected routers do not visibly derive `tenantId` from authenticated claims; examples include approval, account, webhooks, and A/B testing routes. | One workspace may read or mutate another workspace’s records if the underlying engine/store is global or accepts client IDs. | Every tenant-owned route must resolve ownership server-side and pass a two-workspace authorization matrix. |
| P0-02 | Global provider credential fallback remains active. | `PublisherFactory.createPublisherForAccount()` overlays account credentials on top of global config and falls back for missing keys. `.env.example` still defines global provider credentials. | A job can publish with the wrong workspace/provider credential or silently publish through an unintended account. | Production publishing must require an explicit workspace-owned account/connector reference; missing credentials must fail closed. Global fallback may remain only behind an explicit local compatibility flag. |
| P0-03 | Connector model is not yet the active account model. | Current code uses `ProfileAccountStore`, profile-owned accounts, `ChannelConfigStore`, and platform/channel IDs. | Building a second connector store without migration will create duplicate identities, inconsistent UI, and ambiguous ownership. | Define a versioned account-to-connector migration, preserve references, and keep one compatibility boundary during cutover. |
| P0-04 | Migration execution is still gated by the separate runbook. | Greenfield reset removed legacy records; readiness now passes with zero unowned records and no malformed stores. | Data loss or irreversible cutover if migration is run without verification. | Complete the reviewed PostgreSQL/MinIO migration, read-verify, and rollback rehearsal before enabling primary reads. |
| P0-05 | Publishing does not have a first-class release target with destination ownership. | `PublishJobStore` uses tenant/platform/channel/account fields; `PublishWorker` re-fetches an account but does not enforce the complete connector/destination/approval contract. | Duplicate or misrouted posts; a valid tenant job can target an unverified channel/account. | Add immutable release target references and execution-time checks for workspace, connector, destination, approval, enabled state, and idempotency. |
| P0-06 | Sensitive provider actions lack complete end-to-end acceptance tests. | Provider-specific tests are sparse; no complete multi-workspace connector acceptance suite is present in the test inventory. | Security regressions can pass unit tests while failing at runtime. | Add non-fabricating contract tests using explicit owner-provided test credentials or deterministic provider fakes that are clearly marked as test doubles. |

### P1 — required for reliable operations and scale

| ID | Confirmed gap | Evidence | Required outcome |
|---|---|---|---|
| P1-01 | Many frontend pages bypass the shared authenticated API client. | Numerous pages and components use direct `fetch()` calls without visibly attaching the bearer session. | Centralize protected requests, consistent 401 handling, tenant headers, error envelopes, and retry policy. |
| P1-02 | Queue fallback behavior can save jobs without processing them. | Scheduler and queue code support degraded/direct modes and can persist a job while warning that it will not auto-process when Redis is disabled. | Production must fail closed or expose an explicit degraded mode; queue health and delivery guarantees must be visible. |
| P1-03 | Worker retry classification is incomplete. | Publish failures are rethrown for BullMQ retry; provider rate limits, invalid credentials, permission loss, and policy rejection are not normalized into separate retry classes. | Implement bounded retries, provider retry-after handling, pause/dead-letter behavior, and safe error codes. |
| P1-04 | Current Telegram publisher is single-destination and does not perform true provider scheduling. | `TelegramPublisher` uses configured bot/channel values and its schedule method uploads immediately with a warning. | Add connector-owned destinations and platform capability handling; do not claim provider-side scheduling where only queue scheduling exists. |
| P1-05 | Webhook and notification data paths require tenant review. | Webhook router exposes create/list/update/delete/test operations while not visibly using tenant claim helpers. | Make outgoing webhook records workspace-owned, encrypt webhook secrets, validate URLs, and prevent cross-workspace test/notification delivery. |
| P1-06 | Observability is not yet release-target aware. | Existing events/attempts are useful but connector, destination, release, provider request, and correlation identifiers are not consistently the common vocabulary. | Standardize structured events, safe provider error codes, metrics, and delivery timeline. |
| P1-07 | API schemas and documentation are behind the current migration state. | `ARCHITECTURE.md` and `DATABASE_SCHEMA.md` describe historical file-backed/global-provider assumptions. | Keep them as historical/current compatibility references, add authority notes, and update API/OpenAPI contracts alongside implementation. |

### P2 — product hardening after security and durability gates

| ID | Gap | Required outcome |
|---|---|---|
| P2-01 | Connector management UI is currently coarse. | Add provider-specific connection, destination verification, capabilities, health, rotation, disable, and role-aware screens. |
| P2-02 | Search/filter/pagination and startup state consistency have recently been added but need sustained regression coverage. | Keep VideoList and engine-readiness tests in the standard suite. |
| P2-03 | Provider adapters are uneven in capability and real-provider verification. | Add providers one at a time with official scopes, media limits, token lifecycle, and acceptance evidence. |
| P2-04 | Multi-destination analytics and reconciliation are not a complete product surface. | Track per-release-target results, provider IDs, status reconciliation, and workspace-level reporting. |
| P2-05 | Content uniqueness and marketing truthfulness need operational enforcement. | Run anti-duplication, source attribution, approval, and version checks before a release can publish. |

## Items explicitly not counted as new gaps

The following are already implemented or were previously remediated and must not be duplicated as separate work:

| Existing capability | Current treatment |
|---|---|
| API-key onboarding and first workspace bootstrap | Existing implementation; retain regression tests. |
| Empty tenant ID in the tenant console | Remediated; retain selection/bootstrap guard. |
| Invalid tenant key URLs and key generation | Remediated with tenant-scoped routes and one-time secret behavior. |
| Quota request flood | Remediated by stabilizing shared query dependencies. |
| Dashboard error/empty-state conflict | Remediated in VideoList. |
| Video list search, status filter, and pagination | Implemented; add/retain tests rather than re-plan. |
| Dashboard navigation registration | Existing routes are registered; do not convert to arbitrary `href` values without evidence. |
| Rendering E2E path | Passed for the local file-backed path; expand evidence for durable storage later. |
| Fail-closed unauthenticated responses | Preserve; do not weaken authentication to make UI requests pass. |
| Migration runbook and readiness gates | Existing safety machinery; resolve its blockers rather than creating a second migration process. |

## Target architecture decision

The platform should use a **workspace-owned connector model**, but introduce it through a controlled compatibility migration rather than a parallel rewrite.

```text
Current compatibility model
Tenant/workspace
  └── Profile
        └── ProfileAccount
              └── encrypted provider credentials

Target model
Workspace/tenant
  └── Connector account
        ├── encrypted credential reference
        ├── capabilities and health
        └── verified destinations
              └── release targets
                    └── idempotent publish jobs
```

`ProfileAccount` may remain as a compatibility projection during migration. `ChannelConfig` may remain for category/platform routing until its references are mapped. Neither is proof of a verified publish destination. A production publish must use the target release contract or a deliberately versioned compatibility path with the same ownership checks.

## Dependency-aware implementation plan

### Phase 0 — freeze vocabulary and ownership contracts

**Goal:** stop further drift before changing persistence or providers.

Define canonical names (`workspaceId`, `connectorId`, `destinationId`, `releaseId`, `contentVersion`, `providerRequestId`) and publish them in shared TypeScript types, API schemas, and documentation. Define the role matrix and classify every route as global, workspace-owned, or admin-only. Add a route inventory test that fails when a tenant-owned route does not use the authorization helper.

**Exit gate:** every tenant-owned resource has an owner rule, every existing document points to the correct authority, and no new connector schema is introduced before the migration mapping is approved.

### Phase 1 — authorization and client boundary hardening

**Goal:** make strict isolation true for the current file-backed system before migrating data.

Refactor the remaining tenant-owned routers and stores to derive ownership from authenticated claims. Review approval, account, webhooks, A/B testing, branding, content, and any route that accepts resource IDs. Replace direct protected UI `fetch()` usage with the shared client or an equivalent authenticated request wrapper. Add tests for two workspaces attempting read, update, delete, approve, publish, webhook-test, and analytics operations against each other.

**Exit gate:** two-tenant acceptance passes for all high-risk routes; an invalid or cross-tenant resource ID returns safe `403`/`404` behavior; no protected browser call silently omits auth.

### Phase 2 — durable migration prerequisites

**Goal:** prepare PostgreSQL and MinIO without changing authority.

Resolve malformed JSON through owner-signed decisions; map or quarantine all unowned records; create and verify an immutable backup; verify restore; validate database and object-store configuration from the owner environment; and execute the existing gated migration tooling only with explicit approvals. Keep `RELEASE_CONTROL_PRIMARY_READS=false`.

**Exit gate:** readiness returns success, reconciliation coverage is complete, backup restore passes, migration checksums are recorded, and no source file was modified unexpectedly.

### Phase 3 — repository abstraction and dual-read verification

**Goal:** introduce durable repositories without silently switching production reads.

Implement repository interfaces for tenant/profile/account metadata, schedules, quotas, render/publish jobs, events, and artifact manifests. Keep file-backed repositories available as the compatibility authority. Add controlled dual-write or write-shadow verification, compare normalized records, and quarantine discrepancies. Add tenant isolation tests against PostgreSQL repositories.

**Exit gate:** repository contract tests pass against both backends; discrepancy count is zero for approved data; rollback from the file-backed authority remains possible.

### Phase 4 — connector/account migration

**Goal:** create the workspace-owned connector model without duplicate active accounts.

Map each valid profile account to one connector, preserve external identity and encrypted-secret references, create destination records only from verified account metadata, and record mapping provenance. Add connector credential encryption/rotation with masked responses. Introduce an explicit compatibility adapter for old `accountId` jobs. Do not copy plaintext credentials into PostgreSQL, Redis, artifacts, or logs.

**Exit gate:** every migrated connector has one workspace owner, no connector is shared accidentally, all credentials are decryptable only in the server/worker boundary, and unmapped accounts are quarantined rather than guessed.

### Phase 5 — release, approval, and publishing hardening

**Goal:** make posting safe, idempotent, and connector-aware.

Add release and release-target records or a versioned equivalent. Require approved content, enabled connector, verified destination, authorized publisher, and current workspace membership. Remove global credential fallback from production paths. Classify failures, honor provider rate limits, bound retries, use dead-letter handling, and reconcile ambiguous provider outcomes before retrying.

**Exit gate:** a release can fan out to multiple destinations without cross-workspace access or duplicate posts; crash/retry tests prove idempotency; invalid token, missing destination permission, rate limit, and provider rejection each produce the correct terminal/retry state.

### Phase 6 — Telegram first, then social providers one by one

**Goal:** deliver real connector value with narrow, verifiable scope.

Implement Telegram as the first complete connector: encrypted bot token, bot identity check, destination verification, enable/disable, owner approval, queue-based publish, status/audit timeline, and safe rotation. Treat scheduling as platform-agnostic queue scheduling unless a provider capability is explicitly verified. Then add YouTube, Instagram, Facebook, LinkedIn, and X individually, each with its own OAuth scopes, media constraints, token lifecycle, and acceptance tests.

**Exit gate:** one owner-approved Aaditech Telegram bot and one verified destination can publish an approved test asset exactly once, and the event is visible in the workspace audit timeline. No automatic production posting is enabled by default.

### Phase 7 — operations, recovery, and scale

**Goal:** make the system operable when providers, workers, or storage fail.

Separate API and workers for production where appropriate, define queue health and degraded-mode policy, add metrics and alerts, rehearse token rotation, provider reauthorization, dead-letter recovery, backup restore, artifact lifecycle cleanup, and rollback. Verify local Docker and the chosen always-on deployment behavior separately.

**Exit gate:** restore and rollback drills pass; worker restart does not duplicate releases; queue backlog, connector health, provider errors, and storage health are observable per workspace without secret leakage.

### Phase 8 — product and UX completion

**Goal:** expose only capabilities that are actually backed by the server.

Build connector management and destination screens, role-aware controls, clear connected/degraded/reauthorization states, per-target delivery history, search/filtering, and safe empty/loading/error states. Keep placeholder or future provider features explicitly labeled until the corresponding adapter and acceptance tests exist.

**Exit gate:** every visible connector action maps to a protected route and tested backend capability; no UI claims auto-posting, analytics, or provider scheduling that is not operational.

## Non-negotiable security invariants

1. A request must never select a workspace solely from a client-provided body field.
2. Every tenant-owned read, write, delete, publish, webhook test, schedule, approval, and analytics operation must enforce authenticated workspace ownership.
3. Secrets must be encrypted at rest, masked in responses, absent from logs and job payloads, and rotated without plaintext export.
4. Missing connector identity or credentials must fail closed; global provider fallback must not run in production.
5. A connector being connected must not imply that posting is enabled.
6. Only approved content versions may create publish releases.
7. Retries must not bypass approval, ownership, destination verification, or idempotency.
8. Migration tooling must not infer ownership, delete source data, or enable primary reads automatically.
9. Provider results must be real or explicitly represented as test doubles; no fabricated publish IDs, analytics, reviews, or testimonials.
10. Every completed phase must add automated acceptance evidence and update the authoritative documentation rather than creating another overlapping report.

## Immediate next action

The next implementation should be **Phase 0 followed by Phase 1**, not connector UI or Telegram auto-posting. The current code already has enough publishing surface to make a cross-workspace mistake possible if the remaining global/protected routes are not hardened first. After the two-workspace authorization matrix passes, proceed to the already-gated migration prerequisites, then migrate accounts into connectors, then enable the Telegram release path under owner approval.
