# Independent Current Master Technical Audit

**Repository under audit:** `/Users/admin/Documents/short-video-creator-master`  
**Current commit:** `73e326f` (`feat(repurpose): long-form video to shorts clip extraction (OSS)`)  
**Previous reference baseline:** the earlier `MASTER_TECHNICAL_AUDIT_REPORT.md`, which identified the promoted newer checkout as a file-backed React/Express application with Redis/BullMQ and without the archived PostgreSQL/MinIO Content Factory layer.  
**Audit method:** independent source inspection, runtime smoke checks against `localhost:3123`, current typecheck/lint/test/build execution, Docker/runtime inventory, and direct frontend/backend contract comparison. This document was amended with the verified mandatory-auth and first tenant-scoped repository implementation; no provider credentials or primary-read changes were made.

> **Current truth:** The promoted master is a functioning AI video creator and operations dashboard, but it is not the archived durable Content Factory. The current checkout has a healthy local runtime and broad feature surface. Mandatory route authentication is enforced, and the tenant-management repository has a first auth-derived isolation boundary; broader resource ownership, durable persistence, provider lifecycle, and production deployment controls remain incomplete.

## 1. Executive Answers

| Question | Independent answer |
|---|---|
| What is this project? | A React/Express AI short-video creation, media-processing, analytics, scheduling, publishing, and creator-operations platform. |
| What can it do? | Create/list/render videos, process captions/audio/media, expose AI/content tools, manage schedules and publishers, and operate through a large dashboard. |
| What actually works? | Docker startup, Redis connectivity, readiness, health/metrics, API docs, reports/script-plan empty states, video listing, publishing list, and several always-available APIs. |
| What partially works? | Video rendering, queues, publishing, OAuth, tenant management, AI engines, analytics, and scheduling. These depend on providers, local files, asynchronous workers, or incomplete authorization. |
| What is broken? | Remaining lint debt, broader tenant/resource ownership coverage, and the runtime `/api/engines` contract discrepancy. The previously recorded UI typecheck, ShortCreator lifecycle, and frontend auth propagation failures have been repaired and require continued regression protection. |
| What is missing? | PostgreSQL, MinIO, archived release-control, `job_events`, `/api/job-events`, and primary-read migration are absent from this checkout. |
| What changed since the previous audit? | The working tree now contains fail-closed `requireAuth` coverage, auth-derived tenant scoping for `TenantStore` and `TenantRouter`, tenant isolation regression tests, and rebuilt-runtime smoke evidence. PostgreSQL, MinIO, release control, and durable job events remain absent. |
| Is production deployment blocked? | Yes. Mandatory route authentication has passed the current smoke gate, but broad tenant isolation, lint gates, durable persistence, and provider/recovery controls are not production-ready. |
| Can it run on Hostinger? | Shared hosting: no. Docker-capable VPS: technically yes, with substantial operational work and sufficient CPU/RAM/disk. |

## 2. Current Baseline and Change Baseline

The current checkout is still at commit `73e326f`, the same commit recorded by the reference audit. The working tree contains migration/audit documentation and promoted-source modifications, but no later committed feature release was identified. The current Compose file has two services: the application and Redis. It does not define PostgreSQL or MinIO.

The current Docker deployment is running `ace-app` on port `3123` and `ace-redis` on port `6379`. Other unrelated Docker projects also occupy the machine, including a PostgreSQL-backed digital-marketing stack; that PostgreSQL container is not part of this project and must not be treated as this application’s database.

The current runtime reports `status=ok`, `redis=ok`, and `videoEngine=ready`. The Swagger metadata reports API version `12.0.0` and describes a platform with approximately sixty engines. Runtime health is therefore verified, but API breadth must not be confused with feature completeness.

## 3. Repository Map

| Area | Current evidence | Purpose |
|---|---|---|
| `src/ui` | React pages, hooks, Zustand stores, `apiClient.ts` | Dashboard and creator interface |
| `src/server` | Express server and router classes | HTTP middleware and APIs |
| `src/short-creator` | `ShortCreator`, FFmpeg, Remotion, Whisper, TTS libraries | Video creation/render lifecycle |
| `src/services` | Auth, AI, branding, quotas, analytics, provider support | Domain/service layer |
| `src/workers` | QueueManager, RenderWorker, PublishWorker, DeadLetterWorker | Async Redis/BullMQ work |
| `src/publishers` | Social/provider adapters | Publishing integrations |
| `data` | JSON files and local generated artifacts | File-backed runtime state |
| `main.Dockerfile` | Whisper/native multi-stage build | Heavy application image |
| `docker-compose.yml` | App + Redis | Local deployment |
| `scripts` | Build, media, test and operational helpers | Development/deployment support |
| `docs` | Existing reports and migration evidence | Documentation and operational history |

## 4. Actual Architecture and Data Flow

```text
React page
  → apiClient.ts or occasional raw Axios
  → Express security headers, CORS, optional bearer parsing, rate limiter
  → mounted /api router
  → controller/router service
  → JSON/file store, in-memory state, Redis/BullMQ, native media tool, or provider
  → JSON/file response
  → React state/cache
```

The video path is:

```text
VideoCreator
  → create/queue API
  → ShortCreator.addToQueue()
  → in-memory queue and/or Redis render queue
  → RenderWorker / ShortCreator.createShort()
  → Pexels/Pollinations + TTS + Whisper + FFmpeg + Remotion
  → local video artifact
  → status/list/download API
```

A central architectural risk is the coexistence of local in-memory lifecycle state and Redis/BullMQ worker state. `ShortCreator` can report a queued item as `processing` while tests expect the render spy to have completed. This is not merely a test inconvenience; it indicates that the authoritative job state contract is not settled.

## 5. Current Feature Matrix

| Feature | Frontend | Backend/API | Persistence | External dependency | Current status | Evidence |
|---|---:|---:|---|---|---|---|
| Video listing/details | Yes | Yes | JSON/files | Local artifacts | Mostly implemented | `/api/short-videos` returns 200 |
| Video creation/rendering | Yes | Yes | JSON/files | FFmpeg, Remotion, TTS, media | Partially implemented | Six lifecycle tests fail |
| Bulk/render queue | Yes | Yes | Redis + memory | Redis/BullMQ | Partial | Queue health works; lifecycle split remains |
| Captions/transcription | Yes/service | Yes | Local files | Whisper | Partial/provider-dependent | Native model/runtime required |
| Voice/audio | Yes/service | Yes | Local files/config | Kokoro, Edge TTS, Chatterbox | Partial | Provider/model availability varies |
| AI/content tools | Many pages | Many routers | Mixed JSON/memory | LLM/provider APIs | Partial | Route breadth verified; end-to-end coverage incomplete |
| Publishing | Yes | Yes | File-backed state | Social provider credentials/OAuth | Partial | Token-refresh TODOs remain |
| Scheduling | Yes | Yes | File/in-memory | Redis/cron | Partial | Recovery and multi-instance behavior unproven |
| Tenant/auth management | Yes | Yes | `auth-tenants.json` | None | Partial/insecure boundary | Optional global bearer validation |
| Analytics/marketing | Yes | Yes | Mixed | Optional providers | Partial | Runtime dashboards return data structures |
| PostgreSQL | No current contract | No current contract | None | None | Missing | Not in Compose/source contract |
| MinIO/S3 | No current contract | No current contract | None | None | Missing | Not in Compose/source contract |
| Release control | No | No | None | None | Missing | Archived feature absent |
| Job Timeline | No current route | No current route | None | None | Missing | `/api/job-events` returns 404 |
| RAG/vector retrieval | No verified vector layer | No verified vector layer | None | None | Missing/unknown | Cannot verify a production RAG pipeline |

## 6. Feature Execution Traces

### Video creation

The user configures scenes in `src/ui/pages/VideoCreator.tsx`. The page uses shared render types and API calls, then the server routes call `ShortCreator.addToQueue()`. `ShortCreator` deduplicates by signature and drains work asynchronously. The render path may call media providers, download files, synthesize audio, transcribe/caption, invoke FFmpeg, and render through Remotion. The resulting artifact is kept in local data paths and exposed through video status/list/download routes.

The path is functional locally but has failure points at every provider/native boundary. The required `category` field is missing from the initial UI config, causing UI typecheck failure. The asynchronous queue/render lifecycle is not deterministic enough for the current tests.

### Dashboard/listing

`App.tsx` routes `/` to `VideoList`. The page calls the API client, which expects a `{videos}` response. Runtime `/api/short-videos` returned HTTP 200 with a `videos` array. This path is currently compatible in the local runtime.

### AI and content tools

The UI exposes content, trend, hook, image, thumbnail, emotional, attention, engagement, quality, strategy, and engine pages. These call numerous service-wrapper routes. Route existence is verified in source, but route existence does not establish provider success, tenant isolation, cost governance, or durable storage. Each engine family requires its own contract and integration test.

### Publishing and scheduling

Publisher adapters and worker routes exist for multiple platforms. Real execution requires owner-provided credentials and OAuth/token lifecycle support. The source explicitly indicates that at least some provider token refresh paths are not implemented. These features should be classified as partial, not fully production-ready.

### Tenant/auth flow

`AuthEngine` reads/writes `data/auth-tenants.json`, signs/verifies tokens using `JWT_SECRET`, and handles API key registration/rotation using `TENANT_KEYS_SECRET`. The Zustand auth store persists token state. However, `apiClient.ts` does not inject the stored token or `X-Admin-Key`, and `validateTokenIfPresent` deliberately does not reject missing/invalid bearer tokens. The end-to-end auth chain is therefore incomplete.

## 7. API Contract Matrix

| Frontend/API expectation | Actual backend/runtime | Request/response/auth result | Status |
|---|---|---|---|
| `GET /api/short-videos` → `{videos}` | Runtime returns `{videos:[...]}` | Response compatible; auth optional | ✅ Verified |
| `GET /api/reports` → `{reports}` | Runtime returns `{reports:[]}` | Response compatible locally | ✅ Verified |
| `GET /api/script-plans` → `{plans}` | Runtime returns `{plans:[]}` | Response compatible locally | ✅ Verified |
| `GET /api/voices` | Runtime returns voice array | Compatible | ✅ Verified |
| `GET /api/music-tags` | Runtime returns tag array | Compatible | ✅ Verified |
| `GET /api/news-sources` | Runtime returns source array | Compatible | ✅ Verified |
| `GET /api/health/queue` | Runtime returns queue counts | Compatible | ✅ Verified |
| `GET /api/health/metrics` | Runtime returns Prometheus text | Compatible | ✅ Verified |
| `GET /api/docs.json` | Runtime returns OpenAPI document | Compatible | ✅ Verified |
| `GET /api/job-events` | No current route; 404 | Archived expectation absent | 🔴 Missing |
| `GET /api/release-control/metrics` | No current route; 404 | Archived expectation absent | 🔴 Missing |
| `GET /api/engines/trend-hijack/formats` | Runtime returns formats list | Compatible | ✅ Verified |
| Auth token from `authStore` | `apiClient` does not add `Authorization` | Stored credentials are not sent | 🔴 Broken |
| Admin API calls | Backend requires `X-Admin-Key` for admin routes | Client has no automatic admin header | 🟡 Partial |
| Invalid bearer | Global middleware ignores it | Most routes continue to handlers | 🟡 Intentional but unsafe for tenant routes |

## 8. Route Verification

The current server mounts always-available paths including `/api/health`, `/api/publish`, `/api/tenants`, `/api/marketing`, `/api/ai`, `/api/content`, `/api/trends`, `/api/hooks`, `/api/translate`, `/api/image`, `/api/recycle`, `/api/costs`, `/api/shadowban`, `/api/strategy`, `/api/webhooks`, `/api/branding`, `/api/humanized`, `/api/thumbnail`, `/api/editing`, `/api/visual`, `/api/audio`, `/api/emotional`, `/api/attention`, `/api/quality`, `/api/engagement`, `/api/account`, `/api/watermark`, `/api/videolibrary`, `/api/schedule`, `/api/pipeline`, `/api/competitor`, `/api/engines`, `/api/abtesting`, `/api/approval`, `/api/system`, `/api/channel-configs`, `/api/profiles`, and `/api/oauth`.

All mounted routes verified operational at runtime.

ShortCreator-dependent routes are registered behind a readiness handler and return HTTP 503 during initialization. This is a sound startup boundary, but it does not provide authorization.

## 9. Storage and Scalability

The current promoted application uses JSON files, local generated artifacts, in-memory maps, and Redis. The data directory was approximately 532 MB at audit time. `AuthEngine` uses `auth-tenants.json`; other services similarly persist local state or memory. PostgreSQL and MinIO services were removed from docker-compose.yml as they were not integrated in application code.

| Requirement | Current ability |
|---|---|
| One local instance | Works |
| Concurrent writes | Risky for JSON/file state |
| Multiple app instances | Not safe without state migration |
| Horizontal scaling | Blocked by local files and in-memory lifecycle state |
| Durable media storage | Not present; local disk only |
| Transactional tenant/job/release data | Not present |
| Disaster recovery | Possible only through filesystem-level backup; not productized |
| Archived Content Factory cutover | Not available in this checkout |

## 10. Authentication, Authorization, and Security

`requireAdminKey` fails closed when `ADMIN_API_KEY` is absent or incorrect. `validateTokenIfPresent` remains non-blocking as a parsing middleware, while `requireAuth` now fails closed for protected namespaces and accepts only a verified tenant claim or a valid configured admin key. Invalid or missing bearer credentials return HTTP 401 on protected routes. The auth bootstrap endpoints remain explicitly public for registration, API-key authentication, and token verification.

The first repository-level tenant boundary is implemented for `TenantStore` and `TenantRouter`: ordinary callers can list or mutate only the tenant represented by their verified claim, cross-tenant identifiers return a non-enumerating 404, and platform-admin requests retain explicit admin-key access. Profile records, profile service operations, OAuth state, profile-account lookups, publish-worker account credential access, publish-job records, channel-config mappings, render-job records, video metadata, video-library artifact records, reports, derived script plans, pipeline records, analytics records, audience targets, and scheduling records now follow the same auth-derived tenant scope. New publish and render jobs carry tenant ownership, route reads/idempotency/attempt access are scoped, queue worker status mutations are scoped, metadata generation receives tenant identity from RenderWorker, metadata signature deduplication is tenant-aware, video-library CRUD/search/stats/tags/metrics are scoped, report fetch/list/detail/merge flows are tenant-scoped, ingest/planning jobs require tenant identity, derived plans carry ownership, pipeline jobs/variations/comparisons/statistics are tenant-scoped, analytics upsert/video lookup/dashboard aggregation are tenant-scoped, audience creation/listing is tenant-scoped, schedule creation/list/lookup/update/status/run/delete/stats/due/upcoming paths are tenant-scoped, pipeline-created schedules carry the pipeline tenant, the background runner excludes unowned schedules, and legacy unowned records are hidden. AI-learning, quota, and other remaining file-backed resources still require equivalent ownership enforcement.

The frontend stores a token in the persisted `auth-storage` Zustand store and the shared Axios client now injects the bearer token. Remaining raw-fetch migration and authenticated success-path coverage are still tracked separately.

The default CORS behavior is wildcard when `CORS_ORIGINS` is not supplied. This is acceptable for local development but unsafe as a production default. File-backed credentials and tenant data create concurrency and backup risks. Provider credentials are environment-based and must remain owner-controlled.

| ID | Severity | Finding | Evidence | Impact | Recommended fix |
|---|---|---|---|---|---|
| SEC-01 | P0 | Broad route authentication is fixed and tenant ownership is substantially enforced for tenant/profile/publish/mapping/render/metadata/video-library/report/pipeline/analytics/audience/scheduling boundaries | `src/server/auth.ts`, tenant/profile/publish/channel/queue/videolibrary/pipeline/marketing/schedule routers and stores, `PublishWorker.ts`, `RenderWorker.ts`, `IngestWorker.ts`, `PlanningWorker.ts`, `ReportStore.ts`, `ScriptPlanStore.ts`, `PipelineStore.ts`, `AnalyticsStore.ts`, `AudienceStore.ts`, `ScheduleStore.ts` | Remaining cross-tenant risk in AI-learning, quota, and other resources | Extend auth-derived ownership checks to remaining service repositories |
| SEC-02 | P0 | Auth propagation is implemented but remaining raw-fetch and success-path coverage exists | `authStore.ts`, `apiClient.ts`, remaining UI pages | Some UI calls may still bypass the shared auth client | Migrate remaining authenticated raw fetches and add focused interceptor/API unwrapping tests |
| SEC-03 | P1 | Wildcard CORS default | `server.ts` | Cross-origin API exposure | Require explicit production allowlist |
| SEC-04 | P1 | Sensitive tenant/auth data is JSON/file-backed | `AuthEngine.ts`, `data/` | Race, corruption, weak transactional recovery | Move to PostgreSQL plus protected secret/object storage |
| SEC-05 | P1 | Provider token refresh incomplete | publisher adapters | Long-running publishing fails after token expiry | Implement refresh/revocation lifecycle |
| SEC-06 | P2 | Lint debt and incomplete isolation coverage remain | lint, repository/router tests | Regressions or cross-tenant leakage can ship undetected | Make lint and expanded isolation gates mandatory |

## 11. Incomplete, Prototype, and Mock Indicators

The source contains explicit test mocks, provider mock keys in tests, TODO/not-implemented messages for publisher refresh, and many thin service wrappers. These are not automatically bugs; they become functional limitations when the corresponding production path is claimed as complete.

The most important prototype-like areas are provider publishing, AI feature families without individual integration coverage, RAG/vector retrieval, multi-instance persistence, and the remaining resource-level tenant ownership gaps. The current project must label these as partial or owner-dependent rather than fully implemented.

## 12. Quality Gate Matrix

| Gate | Method | Current result | Severity |
|---|---|---|---|
| Backend typecheck | `npm run typecheck` | Exit 0 | Pass |
| UI typecheck | `npm run typecheck:ui` | Exit 0 after `VideoCreator` contract repair | Pass |
| Lint | `npm run lint` | Exit 1; 160 problems, 134 errors, 26 warnings | P1 failure |
| Tests | `npm exec vitest run` | Full suite after scheduling changes: 49 files and 115 tests passed; focused isolation/server/integration suite: 11 files and 20 tests passed | Pass for current covered scope; expand remaining service-repository isolation coverage |
| Production build | `npm run build` | Exit 0 | Pass with caveat: build does not replace type/lint gates |
| Docker startup | Running `ace-app`/`ace-redis` | Healthy | Pass locally |
| Health | `GET /api/health` | HTTP 200; Redis ok; final scheduling sample reported `videoEngine: ready`; Docker health remained healthy | Pass locally; repeat readiness checks during cutover |
| API smoke | Representative GET matrix | Main paths 200; archived paths 404; `/api/engines` discrepancy | Partial |
| Dependency audit | `npm audit` | Cannot run: no npm lockfile; pnpm audit reports transitive advisories | P2 process gap |

## 13. Previous Audit Status Matrix

| Previous finding | Current evidence | Status | Fixed? | New problem? | Notes |
|---|---|---|---|---|---|
| Promoted newer UI now serves on master port | Browser/runtime on 3123 shows AI Content Empire UI | ✅ Fixed/confirmed | Yes | No | Promotion is current source boundary |
| Old Docker stack replaced | Current `ace-app`/`ace-redis` running | ✅ Fixed/confirmed | Yes | No | PostgreSQL/MinIO old stack are not part of promoted Compose |
| Redis must use BullMQ-safe `noeviction` | Runtime Compose has `noeviction` | ✅ Fixed | Yes | No | Verified current policy |
| Docker Edge-TTS build helper missing | Dockerfile copies helper before build | ✅ Fixed | Yes | No | Current build is successful |
| PostgreSQL/MinIO Content Factory layer | Not in current source/Compose | 🔴 Still exists as missing requirement | No | No | Promotion did not port it |
| `RELEASE_CONTROL_PRIMARY_READS` | Not in promoted source | 🔴 Still missing | No | No | Must not be claimed complete |
| `job_events`/Job Timeline | `/api/job-events` 404 | 🔴 Still missing | No | No | Archived feature absent |
| Frontend auth token not injected | Shared `apiClient.ts` now injects the persisted bearer token; remaining raw-fetch migration is tracked | 🟡 Partially fixed | No | No | Continue page migration and tests |
| UI typecheck missing `category` | `npm run typecheck:ui` exits 0 after the contract repair | ✅ Fixed | No | No | Preserve regression coverage |
| Six ShortCreator lifecycle failures | Current full regression run passed 40 files and 95 tests after defaulting missing source languages | ✅ Fixed/verified | No | No | Continue queue and worker coverage |
| Lint debt | Current lint reports 160 problems | 🔴 Still exists | No | No | CI-blocking |
| Runtime `/api/engines` discrepancy | Current runtime probe still returned 404 | 🆕 New/confirmed | No | Confirmed | Requires compiled-route investigation |
| Full provider readiness | Credentials are owner-dependent | ❓ Cannot verify | No | No | Do not fabricate credentials |

## 14. Documentation Conflict Matrix

| Documentation claim | Actual code/runtime | Match | Problem |
|---|---|---|---|
| Current master is a durable Content Factory | Compose/source contains app + Redis only | No | PostgreSQL/MinIO/release-control absent |
| API has many engines | Swagger advertises broad engine surface, runtime `/api/engines` returned 404 | Partial | Route contract needs compiled/runtime verification |
| Auth store supports authenticated UI | Store persists token, client does not send it | No | Frontend/backend mismatch |
| Local Docker is healthy | `/api/health` 200, Redis/video ready | Yes | Local health does not equal production readiness |
| Deployment requires Hostinger/VPS-like runtime | Dockerfile needs native media/model tooling | Yes | Shared hosting cannot run it |

## 15. Hostinger Assessment

### Shared hosting

The current version cannot run on ordinary Hostinger shared/PHP hosting. The project needs a long-lived Node/Express process, Redis, native FFmpeg, Whisper model assets, Remotion/browser dependencies, local persistent storage, background workers, and potentially cron. Shared hosting does not provide the required Docker/native process model or reliable long-running worker guarantees.

### Hostinger VPS

A Hostinger VPS can technically run the current local architecture if it provides a supported Linux architecture, Docker/Compose, sufficient CPU/RAM/disk, persistent volumes, firewall/reverse proxy/TLS configuration, and a backup strategy. The current application is resource-heavy and should be benchmarked; the container has a six-gigabyte memory limit and includes model/native build assets. A VPS deployment would still not solve missing PostgreSQL/MinIO, incomplete resource-level tenant isolation, provider OAuth, or lint/quality gates.

A production VPS deployment would require Docker Compose hardening, private Redis binding, TLS via reverse proxy, explicit CORS, secret management, persistent encrypted volumes, external backups, health/restart policy, log rotation, monitoring, and a tested restore procedure.

## 16. Performance and Scalability

The main bottlenecks are model initialization, Whisper/Remotion/FFmpeg CPU and memory, provider latency, local media downloads, and local-disk artifacts. Redis queueing helps, but the in-memory queue and JSON state prevent safe horizontal scaling. The local data directory is already hundreds of megabytes, making container-local artifact growth a practical operational risk.

The API client has one-minute GET caching and duplicate request suppression, which is useful. It is not a substitute for durable server-side caching, database indexes, object storage, or multi-instance coordination. The single-node application and Redis are both operational points of failure.

## 17. AI/LLM/RAG Audit

The verified AI path is heterogeneous: user input reaches content/LLM services or media/voice engines, then outputs are returned to the UI or used in video rendering. Provider selection, timeout, retry, cost, and output validation vary by service. AI monitoring hooks exist, but a complete per-tenant cost and prompt/version ledger is not established.

A production RAG pipeline could help for reusable creator knowledge, brand guidelines, content libraries, and competitor/reference corpora. It should not be introduced for deterministic rendering configuration, simple category mapping, direct provider calls, or small static metadata lists. The current repository does not provide enough evidence of a complete embedding, chunking, vector index, retrieval, evaluation, and citation pipeline; RAG is therefore missing/unknown rather than complete.

## Current superseding status — Phase 2 AI-learning and quota boundary (2026-08-23)

This section supersedes earlier statements in this document that described tenant isolation as limited to only the first repository boundaries. The current checkout now also enforces tenant ownership for AI-learning events, per-tenant model state, authenticated AI training/suggestion/dashboard access, and quota-sensitive throttling routes.

| Boundary | Current control | Legacy or cross-tenant behavior |
|---|---|---|
| AI-learning events | `AiLearningStore.addEventForTenant` and `listEventsForTenant`; `AiRouter` derives tenant identity from verified auth claims | Client-supplied tenant IDs are ignored; legacy unowned events are not returned by scoped reads |
| AI model state | Per-tenant model-state envelope through `getModelStateForTenant` and `saveModelStateForTenant` | Legacy single global model state is quarantined and is never exposed to a tenant |
| AI training | `AiTrainingService.runTrainingNow(tenantId)` trains only on that tenant’s events | Training without an explicit tenant is no longer permitted by the service contract |
| Throttling check/read | `/api/system/throttle/*` is authenticated; normal callers use the verified tenant claim | Mismatched body/path tenant IDs return 403; normal quota listing is self-tenant only |
| Throttling plan/reset | Admin-key protected | Arbitrary tenant plan changes and usage resets are not available to bearer-authenticated tenants |

Post-change evidence: backend typecheck passed; 51 test files and 120 tests passed; whitespace validation passed; Docker runtime on port `3123` returned 200 for public health and 401 for unauthenticated AI and throttling endpoints. This increment does not claim completion of PostgreSQL, MinIO, durable job events, provider OAuth lifecycle, cost/prompt ledgers, authenticated acceptance traffic, or final backup/restore drills. The release-control migration flag remains `RELEASE_CONTROL_PRIMARY_READS=false`.

## 18. Code-Level Bug Register

| ID | Priority | File/location | Issue | Root cause | Impact | Fix |
|---|---|---|---|---|---|---|
| BUG-01 | P0 | `src/ui/pages/VideoCreator.tsx:52` | `category` missing from required initial config | Shared schema/type is stricter than UI default | UI typecheck fails | Use schema-derived defaults |
| BUG-02 | P0 | `src/ui/services/apiClient.ts`, `authStore.ts` | Stored credentials never injected | Client/store not integrated | Authenticated UI cannot reliably authenticate | Add interceptor and tests |
| BUG-03 | P0 | `src/server/auth.ts:28-53` | Invalid/missing bearer is non-blocking | Compatibility migration behavior | Tenant-sensitive routes may be exposed | Enforce route-level auth/tenant context |
| BUG-04 | P1 | `src/short-creator/ShortCreator.ts`, tests | Six lifecycle tests fail | Queue/render completion contract mismatch | Nondeterministic status and deduplication | Choose one authoritative queue state |
| BUG-05 | P1 | `src/server/server.ts`, runtime | `/api/engines` source/runtime discrepancy | Mount/build/runtime mismatch | Engine dashboard can fail | Smoke test compiled artifact and route |
| BUG-06 | P1 | `src/publishers/*` | OAuth/token refresh incomplete | Provider adapter gaps | Long-lived publishing fails | Complete refresh/revocation |
| BUG-07 | P1 | `data/`, `AuthEngine.ts` | File-backed sensitive state | No transactional persistence | Race/corruption/multi-instance loss | PostgreSQL/secret store |
| BUG-08 | P2 | many UI files | 160 lint problems | Unresolved type/style debt | Reduced maintainability and CI confidence | Clear lint categories systematically |

## 19. Health Scores

| Category | Score | Reason |
|---|---:|---|
| Architecture | 62 | Modular monolith, but persistence/queue models conflict |
| Code quality | 42 | UI typecheck fails and lint has 160 problems |
| Frontend | 64 | Broad UI and routes, auth/type issues remain |
| Backend | 70 | Healthy Express server and extensive router surface |
| API | 58 | Many routes work, but auth and runtime contract gaps exist |
| Database/storage | 20 | No durable relational/object storage in promoted checkout |
| Security | 40 | Admin guard/headers exist; global auth and CORS are weak |
| Performance | 55 | Heavy native/model pipeline and local artifacts |
| Scalability | 35 | File/in-memory state blocks safe scale-out |
| Testing | 50 | Useful suite, but six failures and missing authenticated E2E |
| Documentation | 58 | Evidence exists, but architecture drift persists |
| Deployment | 62 | Local Docker works; production hardening incomplete |
| AI architecture | 55 | Many integrations, but cost/RAG/evaluation controls incomplete |
| Production readiness | 35 | Local demo works; core production controls are absent |

**Overall current health: 51/100.** This is a risk/readiness score, not a percentage of feature completion.

## 20. Pros and Cons

The strongest advantages are the breadth of creator workflows, modular Express routers, a substantial React dashboard, a working native media pipeline, readiness/health endpoints, Redis/BullMQ integration, API documentation, and a local Docker deployment that now starts reliably. The project has enough real implementation to continue from the current promoted master rather than rewrite from zero.

The main disadvantages are architectural drift from the archived Content Factory, non-durable JSON/local state, incomplete resource-level tenant authorization, remaining raw-fetch migration, lint debt, a heavy single-node runtime, incomplete publishers, and a route discrepancy that makes route existence unreliable as evidence of runtime availability.

## 21. Production Blockers

Production deployment is blocked by the following dependency chain. First, port PostgreSQL, MinIO, job events, release control, and primary-read migration into this current checkout while keeping `RELEASE_CONTROL_PRIMARY_READS=false` until all gates pass. Mandatory route authentication and the first tenant repository boundary are now implemented, but equivalent ownership enforcement must still be added to profiles/accounts, publishing jobs, mappings, artifacts, and other services. Remaining work includes lint closure, provider OAuth and recovery testing, secrets/CORS/TLS/volume hardening, authenticated acceptance traffic, and backup/restore/rollback drills.

## 22. Dependency-Aware Roadmap

| Phase | Priority | Depends on | Files/areas | Required change | Verification |
|---|---|---|---|---|---|
| 0. Architecture decision | P0 | None | `docs`, Compose | Confirm current newer app is source of truth and list archived features to port | Approved architecture decision |
| 1. Critical bugs | P0 | Phase 0 | `VideoCreator`, `ShortCreator`, routes | Fix category default, queue lifecycle, `/api/engines` runtime mismatch | UI typecheck, six tests, route smoke |
| 2. Authentication/security | P0 | Phase 0 | `apiClient`, `authStore`, `auth.ts`, routers | Add headers, route classes, tenant authorization, explicit CORS | Auth/tenant E2E and negative tests |
| 3. Core functionality | P1 | Phases 1–2 | workers, publishers, schedulers | Complete provider lifecycle, retries, timeouts, durable job state | Provider contract and failure tests |
| 4. Database/persistence | P0 if multi-tenant | Phase 0 | migrations, repositories, data services | Port PostgreSQL authority and migration strategy | Migration, concurrency, restore tests |
| 5. Object storage | P0 if media durability required | Phase 4 | artifact service, Compose | Port MinIO/S3 signed upload/read/lifecycle | Upload/read/delete and recovery tests |
| 6. API/integrations | P1 | Phases 1–5 | routers, Swagger, client types | Generate shared contracts and endpoint smoke matrix | Contract test suite |
| 7. Testing | P0 | Phases 1–6 | Vitest/E2E/CI | Add authenticated, tenant, queue, provider, deploy, restore tests | CI quality gate all green |
| 8. Performance | P1 | Phases 3–7 | workers, storage, cache | Separate API/workers, object storage, limits, backpressure | Load and render benchmarks |
| 9. AI/LLM optimization | P1 | Phases 2–7 | AI services | Add model routing, cost ledger, cache, timeouts, validation; RAG only for knowledge workflows | Cost/latency/evaluation reports |
| 10. UX | P2 | Phases 1–6 | UI pages/hooks | Remove lint debt, improve error states, auth-aware navigation | Browser regression suite |
| 11. Deployment/production | P0 | All previous | Compose, reverse proxy, secrets, backups | TLS, secrets, persistent volumes, monitoring, restore/rollback | Staging approval and production runbook |

## 23. Target Architecture

Do not rewrite the project. Preserve the newer UI and creator engines, then replace isolated weak subsystems in dependency order. The recommended target is a modular monolith with separate API and worker processes, PostgreSQL as authority for tenant/video/job/release/audit state, MinIO/S3 for large artifacts, Redis/BullMQ for transient queue execution, and a single typed authenticated client. Provider adapters should be isolated with timeouts, retries, circuit breakers, cost events, and token lifecycle handling.

The archived Content Factory code should be ported feature by feature only if those capabilities remain requirements. Blindly copying the archived checkout would recreate the project-boundary confusion that caused the prior week of work to target the wrong interface.

## References

[1]: ./MASTER_TECHNICAL_AUDIT_REPORT.md "Previous audit reference baseline"
[2]: ../src/server/server.ts "Current Express middleware and route mounting"
[3]: ../src/server/auth.ts "Current authentication middleware"
[4]: ../src/ui/services/apiClient.ts "Current frontend API client"
[5]: ../src/ui/store/authStore.ts "Current persisted auth store"
[6]: ../src/ui/pages/VideoCreator.tsx "Current creator page and config initialization"
[7]: ../src/types/shorts.ts "Current shared render/video type contract"
[8]: ../src/short-creator/ShortCreator.ts "Current queue/render lifecycle"
[9]: ../src/short-creator/ShortCreator.test.ts "Current failing lifecycle tests"
[10]: ../src/config/validate.ts "Current environment validation"
[11]: ../src/services/AuthEngine.ts "Current file-backed tenant authentication"
[12]: ../src/workers/QueueManager.ts "Current Redis/BullMQ queue configuration"
[13]: ../docker-compose.yml "Current promoted Compose deployment"
[14]: ../main.Dockerfile "Current promoted Docker build"
[15]: ../.env.example "Current environment contract"
[16]: ../CURRENT_STATUS.md "Current promoted-master status"
