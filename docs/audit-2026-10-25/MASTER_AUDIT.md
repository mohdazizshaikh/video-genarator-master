# Repository-wide 360 audit — 25 October 2026

**Conclusion:** substantial creator tooling with a working build and regression baseline, but unsafe for an unrestricted multi-tenant production rollout in its current form. Confirmed authorization and ownership defects, event loss, release integrity gaps, scheduling errors, and incomplete runtime integrations take precedence over adding more engine pages.

## Scope and evidence limits

The inventory accounts for all 627 Git-listed entries plus the pre-existing untracked webhook-security source: 44 configuration/data/asset, 402 code, 56 documentation, 4 generated/reference, 42 binary asset, 1 directory or submodule, 78 test. It extracts 2,041 named function/method declarations and function-valued variables; nested anonymous callbacks are not counted as separate named functions. The JSON inventory additionally records 28 Python/shell/SQL declarations. There are 404 route/middleware registration nodes (including USE and duplicate/public aliases), not 404 unique externally reachable endpoints. The test inventory includes the separate script test; Vitest executed 77 files.

This is repository-wide structural coverage plus focused semantic tracing and isolated runtime probes. It is **not a claim that every line of every component has received a manual semantic review**, nor that every feature has been run end-to-end. FILE_REVIEW_LEDGER.md explicitly distinguishes focused review from machine inventory. No file in the requested source/document scope is silently omitted from the inventory. Third-party dependencies, Python virtual environment internals, generated dist/cache, ignored user media, and secret values are not application source; their exclusion is explicit. Binary assets are fingerprinted, not visually/audio inspected. No dependency vulnerability database, live social provider, production deployment, real media render, PostgreSQL/MinIO service, or owner-credential workflow was exercised. Existing historical audit claims are not fresh verification evidence.

The pre-existing untracked `src/services/webhookSecurity.ts` was preserved. No application source was edited. The production build regenerated ignored dist output. Probes used temporary data and fake adapters, did not delete real media, send notifications, or publish content. .env secret values were not printed or copied into this report.

## Architecture and actual execution paths

1. `src/index.ts` validates configuration, checks music, starts Express, then initializes Remotion/Chromium, Kokoro, Whisper, FFmpeg and Pexels. All heavy initialization is sequential; video readiness waits on all of it.
2. `server.ts` mounts feature APIs immediately and swaps deferred REST/MCP/queue handlers after ShortCreator resolves. Auth is bearer JWT or admin key; renderer tmp/music requests have a signed URL exception. System-engine bootstrap and operations have mixed guard ordering.
3. REST create / MCP / ScheduleRouter call ShortCreator’s in-memory queue. Bulk queue uses SchedulerService → JSON render record → BullMQ → RenderWorker → ShortCreator. Ownership propagation differs across these paths.
4. Auto-script uses RSS → AiLlmGenerator → scenes. SchedulerService source automation makes content-version drafts and approval items; PipelineOrchestrator creates heuristic variations/directives and optional review items. These are distinct pipelines.
5. Release publishing follows content version → release approval → connector/destination target → publish record → Redis worker → provider. The older publish endpoint bypasses the release model. Raw filesystem paths remain authoritative in both.
6. Runtime stores are JSON/files. SQL, shadow-write helpers, artifact manifests, and migration commands are foundations, not connected durable authority. Job events/outbox are file stores with independent caches; no automatic outbox delivery worker was found.
7. React has lazy feature pages, shared authenticated clients, dashboard hooks and two library concepts. Several engine screens present advisory plans; the footer’s engine count is not a capability health measurement.

## Verification results

| Check | Result | Interpretation |
|---|---|---|
| Backend typecheck | PASS | tsc -p tsconfig.build.json --noEmit |
| UI typecheck | PASS | tsc -p src/ui/tsconfig.json --noEmit |
| Vitest | PASS: 77 files, 209 tests | Mocked/unit/SSR coverage; network-dependent trend fetches reported DNS failures and empty fallback during tests |
| Production build | PASS | Vite warned about browser-externalized Node crypto; build success does not validate that interaction |
| QA script typecheck | PASS | tsc -p tsconfig.scripts.json --noEmit |
| Route inventory | PASS | Mount-string check only; first run used pre-existing dist; rerun after build recorded separately |
| Lint | FAIL: 78 errors, 24 warnings | 102 total; many rules need correct UI/Remotion scoping as well as actual fixes |
| qa:check | FAIL | Stops at test-existence gate: 137 source files reported without matching test files |
| Docs consistency (run separately) | FAIL: 9 errors | Stale index/generated sections plus multiline-route parser false positives; not nine missing capabilities |
| Migration apply module load | FAIL | pg missing; no database work executed |
| Artifact migration module load | FAIL | @aws-sdk/client-s3 missing; no object-store work executed |
| Isolated security/data probes | Reproduced defects | See ISOLATED_PROBES.json and reproducible isolated-probes.cjs |

## Prioritized findings

### A01 · P0 · System assets and compliance bypass authentication

Primary source: [src/server/routers/systemengines.ts](../../src/server/routers/systemengines.ts).

Asset CRUD and compliance read/write handlers are registered before the general requireAuth middleware. server.ts mounts this router without a parent auth guard. Isolated unauthenticated GET /assets and /compliance/logs both returned 200. Asset records have no tenant owner; compliance accepts caller-supplied tenantId.

**Required correction:** Move public bootstrap into an explicit public router; guard all other handlers before registration. Derive compliance ownership from claims; protect global operations with the admin guard. Test unauthenticated reads and mutations.

### A02 · P0 · Core video API does not enforce resource ownership

Primary source: [src/server/routers/rest.ts](../../src/server/routers/rest.ts).

POST /short-video omits tenantId when calling addToQueue. GET /short-videos lists all files; status, video download, render-path, and delete use video IDs without a tenant lookup. Most file actions do not validate IDs. The isolated router probe confirms A can list and delegate deletion of a B-labelled fake video. This is a source/adapter proof, not deletion of real user media. Metadata reads do use tenant scope, so direct creates produce unowned records that scoped metadata reads cannot retrieve.

**Required correction:** Require a nonempty authenticated owner throughout create, status, list, media, path, and delete; authorize each ID against an owner record. Remove raw path authority and apply the same policy to MCP.

### A03 · P0 · Publishing accepts caller-selected local media and bypasses approved content identity

Primary source: [src/server/routers/releases.ts](../../src/server/routers/releases.ts).

Release queueing accepts renderOutputPath and thumbnailPath from the request without resolving an owned artifact or requiring equality to the approved content version. Legacy /api/publish also accepts raw paths and has no release-approval requirement. Extension/file-size validation exists but does not restrict the source directory or authorize the owner. PublishWorker passes paths to provider upload adapters; Telegram streams the supplied file. The global publisher branch remains reachable when no connector/account is supplied, independently of the per-account fallback flag. This creates a local-file upload/exfiltration path when usable provider credentials and a reachable destination exist. No external upload was attempted.

**Required correction:** Accept an opaque owned artifact ID, verify manifest, file type/realpath, content-version binding, destination, and approval in both enqueue and worker. Gate or remove the global legacy publish path.

### A04 · P1 · In-flight render deduplication crosses tenants

Primary source: [src/short-creator/ShortCreator.ts](../../src/short-creator/ShortCreator.ts).

addToQueue matches queued work using only content/config signature. It never compares item.tenantId. Two isolated calls for A and B returned the same video ID and left only A in the queue. Completed-record dedupe is scoped, which does not repair the in-flight branch.

**Required correction:** Include tenantId in both signature namespace and queue match; reject missing ownership. Test identical content submitted by two tenants.

### A05 · P1 · Branding allows cross-tenant reads and writes

Primary source: [src/server/routers/branding.ts](../../src/server/routers/branding.ts).

Authentication is present, but handlers trust :tenantId instead of checking the authenticated tenant. List returns all branding. An A-authenticated isolated POST /workspace-B/reset returned 200 and reset B branding. Imported tenant/admin helpers are not applied.

**Required correction:** Derive tenant from claims or enforce an explicit admin exception for path tenant; scope list, CSS, reset, and update.

### A06 · P1 · Residual mutable engine stores remain global

Primary source: [src/server/routers/recycle.ts](../../src/server/routers/recycle.ts).

Recycle/freshness records, content buckets, shadowban account metrics, best-time/hashtag history, trend-hijack history, custom hook mutation, cost summaries/record attribution/tenant-cost lookup, and knowledge-base mutation lack an authenticated owner boundary in their route/service contracts. Login alone does not provide tenant isolation. Shared read-only reference rules are different from user-authored or account-derived records.

**Required correction:** Classify reference data separately; add owner to mutable tenant data, quarantine legacy records, and exercise cross-tenant read/write denial per family.

### A07 · P1 · Webhook requests have no effective SSRF policy

Primary source: [src/services/WebhookNotificationEngine.ts](../../src/services/WebhookNotificationEngine.ts).

Custom, Slack, and Discord destinations are passed directly to axios. HTTPS/public-address checks, DNS pinning, provider-host checks, and redirect restrictions are absent from the dispatch path. The pre-existing untracked webhookSecurity.ts contains helper implementations but no source imports it. No live SSRF request was made.

**Required correction:** Integrate and test URL validation and a pinned transport for create, update, and each send; disable redirects and sanitize transport errors. Preserve the existing untracked work while integrating.

### A08 · P1 · Webhook updates can reassign ownership; test dispatch targets other hooks

Primary source: [src/services/WebhookNotificationEngine.ts](../../src/services/WebhookNotificationEngine.ts).

updateWebhook spreads arbitrary updates over the stored record, allowing tenantId to change. Isolated A-owned update moved a webhook into B visibility. testWebhook invokes tenant-wide notify(video.ready), so it can send to all matching hooks rather than the selected hook; selected hooks without video.ready may not be tested. Credentials are masked in API responses but persisted as plaintext in webhooks.json; raw error messages are stored/logged.

**Required correction:** Allowlist mutable fields and preserve immutable tenant/id. Send tests directly to one selected hook with try/finally restoration. Encrypt secrets and redact errors.

### A09 · P1 · Independent cached JSON stores lose events and serve stale timelines

Primary source: [src/db/JobEventStore.ts](../../src/db/JobEventStore.ts).

Each worker and the job-events router constructs a separate JobEventStore/OutboxStore, each lazily reading once. Two isolated event-store instances loaded the same file; after A then B appended, a fresh reader saw zero A events and one B event. This fails within one process, before considering horizontal scaling. Router reads can remain stale after their first read. Atomic rename prevents partial files, not lost updates.

**Required correction:** Use one coordinated writer as an interim measure and transactional durable storage for authority. Add multiple-instance read/write tests; event+outbox writes must be one transaction.

### A10 · P1 · Future publish times can publish immediately

Primary source: [src/workers/PublishWorker.ts](../../src/workers/PublishWorker.ts).

Queue producers add jobs without delay based on scheduleAt. Worker delegates to scheduleVideo. Telegram, LinkedIn, and X scheduleVideo upload immediately; YouTube uses provider scheduling. A future date therefore has inconsistent, potentially early-publication semantics.

**Required correction:** Persist due time and delay/claim execution at that time for providers without native scheduling. Reject unsupported schedules instead of publishing now.

### A11 · P1 · Publish idempotency does not cover provider success before local persistence

Primary source: [src/workers/PublishWorker.ts](../../src/workers/PublishWorker.ts).

Worker skips targets already marked published, but provider upload occurs before local publish-job and release-target writes. A crash after provider acceptance and before either write can cause duplicate publication on retry. No provider request idempotency/reconciliation is used in this flow. RenderWorker similarly creates/polls new in-memory render work without a durable execution checkpoint or timeout. Earlier drill claims do not prove every crash window.

**Required correction:** Persist execution intent/request identity and reconcile ambiguous outcomes before retry. Add deterministic crash tests around provider response and every local commit boundary.

### A12 · P1 · Approval does not freeze the approved payload or roll up release state

Primary source: [src/db/ContentVersionStore.ts](../../src/db/ContentVersionStore.ts).

updateDraft accepts edits regardless of version status or whether a release references the version. Release approval pins only an ID; queueing accepts unrelated path/title/metadata. ReleaseStore.updateTarget updates targets but does not recompute parent status, so releases may stay approved after all targets publish. Idempotency-key uniqueness is global rather than workspace-scoped.

**Required correction:** Make approved versions immutable or create new versions on change; bind approval to content/artifact digest. Enforce transitions and derive parent release status from targets.

### A13 · P1 · Migration entry points cannot load their required packages

Primary source: [scripts/migrations/apply.mjs](../../scripts/migrations/apply.mjs).

apply.mjs imports pg and artifacts.mjs imports @aws-sdk/client-s3. Neither is declared in package.json nor resolvable locally. Both commands fail with ERR_MODULE_NOT_FOUND before their safety gates run. Runtime repositories remain JSON-backed; Compose has app and Redis only. SQL schema and migration tooling exist, contrary to documents calling them wholly absent.

**Required correction:** Declare and lock required dependencies; verify non-executing guard behavior and isolated database/object-store integration. Implement adapters and reconciliation before cutover; do not enable primary reads during this audit.

### A14 · P1 · Shutdown can exit before worker close completes

Primary source: [src/index.ts](../../src/index.ts).

One signal listener awaits worker.close() through Promise.allSettled; a later independent listener calls process.exit(0) immediately after stopping the scheduler. EventEmitter does not await async listeners. The HTTP server handle is discarded; ScheduleRouter interval and Redis connection are not coordinated in shutdown.

**Required correction:** Use a single awaited shutdown sequence with server close, scheduler/interval stop, worker drain, Redis close, subprocess shutdown, and a bounded deadline.

### A15 · P1 · Registration accepts an enterprise plan selected by an anonymous caller

Primary source: [src/services/AuthEngine.ts](../../src/services/AuthEngine.ts).

Public auth/register passes req.body.plan directly to registerTenant. An isolated enterprise registration received enterprise permissions and the returned tenant object included apiKeyHash because the spread is not stripped. Bootstrap also accepts caller tier. Commercial entitlements cannot rely on these inputs. Existing signed JWTs are not rechecked against current suspension/rotation state on each request.

**Required correction:** Assign server-side signup entitlement, separate billing/admin changes, remove hash fields explicitly, and define token revocation/rotation semantics.

### A16 · P1 · Browser caches are shared across authentication sessions

Primary source: [src/ui/services/apiClient.ts](../../src/ui/services/apiClient.ts).

GET cache and in-flight deduplication keys contain only URL. Logout/login do not clear or namespace them. Different users on one running page can receive cached protected responses for up to the TTL. authenticatedFetch also attaches a bearer token to any input URL; the Axios external-origin check uses startsWith(baseURL), so with the default empty baseURL every absolute URL passes its supposed external check. Current first-party callers do not establish a live third-party leak, but the shared helper contract is unsafe.

**Required correction:** Namespace cache/in-flight work by session and parameters; clear/abort on auth change. Resolve URLs and compare parsed origins before adding credentials in both helpers.

### A17 · P1 · Video playback/download omit the bearer credential

Primary source: [src/ui/pages/VideoDetails.tsx](../../src/ui/pages/VideoDetails.tsx).

Status uses authenticated Axios, but video src and the download anchor directly request /api/short-video/:id. Browser media and anchor navigation do not use Axios interceptors. Server requireAuth accepts bearer/admin or a tmp/music token, not this bare video URL. A status-ready page can therefore fail to play or download under the current auth contract.

**Required correction:** Use an authenticated blob/object URL or a short-lived tenant-scoped video URL; support range streaming and revoke object URLs on cleanup.

### A18 · P1 · Browser tenant actions call a Node-only crypto module

Primary source: [src/ui/pages/TenantConsole.tsx](../../src/ui/pages/TenantConsole.tsx).

TenantConsole imports crypto from the Node core package and calls crypto.randomUUID in appendAudit. Vite build explicitly warns that the module was externalized for browser compatibility. A successful typecheck/build does not validate this browser action.

**Required correction:** Use globalThis.crypto.randomUUID and exercise tenant mutation interactions in a browser test.

### A19 · P1 · Passing gates do not validate the full workflow

Primary source: [src/integration/pipeline.e2e.test.ts](../../src/integration/pipeline.e2e.test.ts).

The end-to-end-labelled test only asserts membership of two strings in a hardcoded array. Route inventory verifies mount strings inside compiled server.js, not HTTP reachability, auth, response shape, or handler semantics. UI SSR shell tests do not execute effects, browser media, or mutations. npm run qa:check stops at 137 missing matching test files; separately run docs consistency reports nine errors, including parser false positives for multiline real routes.

**Required correction:** Add meaningful two-tenant workflow tests with mocked providers plus controlled integration drills. Use AST route discovery and actual request tests; classify doc-parser errors correctly.

### A20 · P1 · Lint and dependency auditing are nonblocking in main CI

Primary source: [.github/workflows/ci.yml](../../.github/workflows/ci.yml).

Current lint reports 78 errors and 24 warnings. CI lint appends || true; security workflow appends || true to the production dependency audit. Deploy install uses --prod and then builds using dev dependencies, and hardcodes git pull origin main even for master-triggered workflows. Browser typecheck, route behavior, and durable acceptance are not comprehensive deployment gates.

**Required correction:** Repair baseline and enforce appropriate gates; build immutable artifacts with build dependencies and deploy the tested revision. Keep separate advisory scans visibly advisory.

### A21 · P1 · Queue connectivity is reported as worker liveness

Primary source: [src/server/routers/health.ts](../../src/server/routers/health.ts).

buildWorkerStatus lists ingest/planning as online when Redis is available; index.ts starts only render/publish/deadletter. With Redis disabled it marks workers online as well. getHealth may return HTTP 200 while videoEngine is initializing. Queue states expose global aggregate workload without auth and dashboard aggregates global state for a tenant. Redis ping has no explicit bounded deadline.

**Required correction:** Measure registered worker heartbeats and dependency deadlines; separate liveness/readiness; scope tenant metrics and protect global operational details.

### A22 · P1 · Persistent scheduler reports success without durable generated output

Primary source: [src/server/routers/schedule.ts](../../src/server/routers/schedule.ts).

Image/carousel/banner generation results are logged and discarded rather than persisted into an artifact/content workflow. When ShortCreator is not ready, video path logs retry intent but still records freshness and a successful run. Video scheduling omits tenantId in addToQueue and only uses first platform/category/language. Human-mimicry delay can repeatedly create timers while the schedule remains due.

**Required correction:** Use a claimed durable execution record, persist outputs and owner, record success only after actual completion, and resolve each requested destination/language explicitly.

### A23 · P2 · Several AI and enhancement features are advisory or disconnected

Primary source: [src/services/PipelineOrchestrator.ts](../../src/services/PipelineOrchestrator.ts).

Pipeline uses a templated script plus fixed assumed quality/audio/resolution/duration and engagement inputs; outputs are directives and scores, not an executed rendered-video pipeline. Thumbnail/editing/audio/visual/watermark engines often return plans or filter strings. Memory, feedback, predictive, asset fallback, metadata, beat-sync, and agent-loop services exist but runtime wiring appears only in the integration guide/types or other disconnected service files. Feature flags alone do not connect them. DEV mock audio/voice/scrape paths fail outside DEV; canvas is absent and image generation has an SVG fallback.

**Required correction:** Label heuristics and directives accurately; trace each selected control to a real producer/result. Integrate intended enhancements with input/output tests and measured evaluations.

### A24 · P2 · Provider result and failure contracts are inconsistent

Primary source: [src/publishers/PlatformPublisher.ts](../../src/publishers/PlatformPublisher.ts).

Worker persists result.externalId; Instagram/Facebook/LinkedIn/X commonly return platformVideoId instead. X catches video upload failure and continues with a text-only post yet returns success. Some adapters refresh only in memory or do not implement refresh; provider validateCredentials returns false for transient failures and worker classifies it as terminal invalid credentials. No live provider compatibility was reverified in this audit.

**Required correction:** Normalize adapter results and failure taxonomy, require media for a video publish, persist refreshed credentials, and test transient validation errors separately from invalid auth.

### A25 · P2 · Durable-storage readiness gates and SQL ownership constraints need completion

Primary source: [scripts/migrations/readiness.mjs](../../scripts/migrations/readiness.mjs).

Readiness computes authoritySafety but omits it from blockingGates; approvals use nonempty-string presence rather than === true. SQL checks workspace matches for release targets but does not require the target destination to belong to the selected connector; connector_destinations lacks a composite connector/workspace ownership constraint. SQL has no durable event/outbox/artifact tables yet, and content-version schema differs from current file records.

**Required correction:** Make every gate explicit and consistent; test false-string approvals and enabled-primary flags. Add composite ownership constraints and complete schema/model translation before migration.

### A26 · P2 · Local backup scope does not provide host-loss or queue recovery

Primary source: [scripts/backup.mjs](../../scripts/backup.mjs).

Backup/restore implement encrypted archives, content manifests, checksums, retention, and a rollback directory. They exclude Redis queue state and depend on separately held encryption/auth keys. Snapshots taken without pausing a writer are not transactionally consistent across JSON files. No current off-host replication, clean-room full recovery, or hostile-archive path validation was established. Redis Compose also publishes port 6379 without a configured password.

**Required correction:** Define and rehearse recovery for application state, queues, media, and held secrets; replicate off-host and verify consistency. Restrict Redis exposure. Validate archive/manifest paths before extraction/copy when accepting untrusted archives.

### A27 · P2 · Documentation gives contradictory current-state claims

Primary source: [docs/REALITY_GAP_REGISTER.md](../../docs/REALITY_GAP_REGISTER.md).

CURRENT_STATUS, todo, promotion evidence, and reality-gap documents say /api/engines, /api/job-events, release control, migration runner, and artifact-producer wiring are absent. Current source contains these routes/stores, SQL, migration scripts, and image/repurpose manifest registration. They remain file-backed/partial, not absent or production-proven. Older inventories advertise fewer routes/pages and Windows-only links; footer says all 60 engines active without runtime proof.

**Required correction:** Keep historical snapshots dated and immutable, designate one current capability register, and derive inventories from code. Distinguish implemented, connected, locally tested, live tested, and durable.

### A28 · P2 · Team, subscription and integration controls are log actions rather than complete services

Primary source: [src/ui/hooks/useTenantMutation.ts](../../src/ui/hooks/useTenantMutation.ts).

Invite/remove member, plan change, cancel subscription, and integration toggles post action objects to /api/tenants/:id/logs/:engine. Those calls log events rather than implement invitations, provider connection/revocation, billing or subscription lifecycle. TenantConsole audit entries are local UI state and are not an authoritative audit trail.

**Required correction:** Either implement the service workflows and role checks or label these actions as operational notes; use Connectors for real provider lifecycle and a durable server audit ledger.

### A29 · P1 · Translation cache collides on the first 50 characters

Primary source: [src/services/TranslationEngine.ts](../../src/services/TranslationEngine.ts).

The cache key uses only source/target language and text.substring(0,50), while the router uses one shared engine for all tenants. Distinct scripts with an identical 50-character prefix can return the first script translation, including a different private suffix. Fallback translation often merely prefixes a language name or replaces a few English words but returns a normal success result.

**Required correction:** Key by full-content digest and tenant/provider/model identity; distinguish unavailable or partial translation from a successfully translated result. Test different suffixes with the same prefix.

### A30 · P1 · Custom RSS validation makes unrestricted server-side requests

Primary source: [src/news-fetcher/RssFetcher.ts](../../src/news-fetcher/RssFetcher.ts).

Custom feed creation checks only http/https before validateFeedUrl calls rss-parser.parseURL on the submitted URL. There is no private/link-local/loopback address policy or pinned DNS transport in this path. A response must parse as a feed to be accepted, but the internal request already occurs during validation. No internal endpoint was contacted in this audit.

**Required correction:** Apply a shared server-side URL policy to initial feed validation, subsequent reads and redirects; bound time and response size and test internal-address rejection without network dispatch.

### A31 · P1 · Schedule recurrence ignores the configured cron expression

Primary source: [src/db/ScheduleStore.ts](../../src/db/ScheduleStore.ts).

recordRunForTenant and recordRun unconditionally set nextRun to current time plus one hour. Neither evaluates record.cronExpression. Daily/weekly schedules can therefore become hourly after the first execution, regardless of the cron builder settings.

**Required correction:** Calculate next due time using the configured cron and timezone, define one-shot semantics, and test daily/weekly/DST/failure-retry recurrence separately.

## Feature and function coverage

FEATURE_MATRIX.md maps every current routed page and records direct API literals and hook/component dependencies. FILE_REVIEW_LEDGER.md accounts for every inventoried file and lists its named functions with line numbers; the JSON inventory additionally records imports, route registration lines, guards, selected I/O calls, source flags, test names and file hashes. DOCUMENT_REGISTER.md accounts for every Markdown document and its sections. These are navigable coverage records, not invented pass/fail ratings for unexercised workflows.

## Recommended execution order

1. Close A01–A08 authorization, ownership, publish-path and webhook boundaries. Add focused negative tests for both tenants and anonymous callers before changing storage.
2. Repair event-store coordination, release immutability/state transitions, safe scheduling, execution checkpoints and awaited shutdown (A09–A14). Retest every retry/crash boundary with a fake provider.
3. Repair signup entitlements, browser session/cache/media/crypto behavior and honest UI workflows (A15–A18, A22, A28). Add interaction tests that execute effects and mutations.
4. Repair quality gates and current documentation; validate complete isolated create → review → render → publish → observe → recover flows (A19–A21, A27).
5. Complete durable adapters, schema constraints, gated migrations, object storage, provider contract tests and recovery drills (A13, A24–A26). Keep file authority/cutover decisions explicit until reconciliation passes.
6. Integrate useful enhancement engines with measured input/output quality and accurate capability labels (A23), then test load, concurrency and operational SLOs.

## Acceptance criteria for declaring production readiness

All P0/P1 findings need closure evidence, both-tenant anonymous/ownership/role tests, browser media and interaction verification, consistent approved-artifact publication, due-time enforcement, no lost events across independent workers/readers, bounded retries and ambiguous-outcome reconciliation, clean shutdown/restart, enforced build/test/security gates, and a restore rehearsal that recovers state plus media/queues. Record live-provider results separately from mocked proofs. No readiness percentage is assigned because inventory size and passing unit counts do not measure these contracts.
