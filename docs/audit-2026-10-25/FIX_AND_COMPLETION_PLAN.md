# Complete remediation and feature-completion plan

**Created:** 25 October 2026. **Status:** implementation in progress; see the tracker and dated implementation evidence.

**Objective:** resolve all 31 findings in [MASTER_AUDIT.md](MASTER_AUDIT.md), finish the incomplete product workflows in [FEATURE_MATRIX.md](FEATURE_MATRIX.md), and close the semantic-review backlog explicitly recorded in [FILE_REVIEW_LEDGER.md](FILE_REVIEW_LEDGER.md). A successful build, an existing page, or a renamed placeholder does not establish feature completion.

Use [IMPLEMENTATION_TRACKER.json](IMPLEMENTATION_TRACKER.json) for the 31 finding tasks plus 10 completion tasks. Tasks began as `planned`; their current status is maintained in the tracker. The original audit remains an immutable baseline; changes and closure evidence belong in the tracker and a subsequent dated validation record.

## Default implementation decisions

- A workspace is the security root. Profiles, accounts, destinations, artifacts, schedules, usage, releases and custom learning records belong to it; the server derives the workspace and actor from verified identity. Shared built-in reference data is separately immutable.
- Public signup creates the server-configured free entitlement. Owner/admin/editor/reviewer/viewer privileges are server-side; plan upgrades and credential/role changes require the corresponding authority.
- Every creation entry point uses shared application services. REST, MCP, bulk and schedules must not maintain competing ownership or approval rules.
- A content review approves a specific script/version. Rendering produces an owned immutable artifact. A release approval binds the exact content version, artifact checksum, publish metadata and destination set. Changing any approved field requires a new version/approval. Existing draft/ready status enums must be reconciled into documented transitions rather than expanded independently in each route.
- API clients select opaque content/artifact/destination IDs. Filesystem paths are internal adapter details. Every producer registers its output; downloads resolve owned artifacts with range support and short-lived access where necessary.
- PostgreSQL becomes the transactional metadata authority after verified migration; S3-compatible storage becomes the artifact authority. The current file backend is a temporary, explicitly single-instance mode. A singleton alone is not a final multi-process durability fix.
- Scheduling has one persisted timezone/due-time contract. Providers without native scheduling execute after the due time. Retries and jitter have separately persisted timing and never silently convert scheduled publication into immediate publication.
- Jobs have durable execution identity, attempt history, cancellation and reconciliation. If a provider cannot deduplicate or look up an ambiguous accepted upload, hold the target in `reconciling`/operator review; do not promise universal exactly-once publication or automatically upload again.
- Provider adapters return canonical external IDs, actual media outcomes and typed failures. Capability flags describe tested supported behavior. API-version compatibility is checked against official provider documentation during implementation.
- Enhancement features become connected behavior with bounded spend/retries. Planning/scoring tools remain honestly labelled; rendering features require exported-media proof. Full completion includes the actual team/billing/connector workflows, not just relabelling their existing log actions.
- No production migration, publishing, payment activation or deployment is performed by creating this plan. Build the reviewable implementation and isolated evidence first; record external credentials, target environments and activation decisions only when those final stages are ready.

## Phase sequence and exit gates

Priority labels on findings are unchanged. Dependency-critical foundations may start earlier than their original severity suggests. Quality checks and documentation updates accompany every phase; P9 is their final closure, not their first use.

| Phase | Deliverable | Dependencies | Exit gate |
|---|---|---|---|
| P0 | Complete review backlog, contracts, reproducible checks | None | Source/document coverage backlog is explicit; meaningful failing defect tests and canonical contracts exist |
| P1 | Authentication, ownership, roles and entitlement boundary | P0 | Anonymous and two-tenant negative tests pass across every affected entry point |
| P2 | Safe outbound fetches, webhook lifecycle, translation isolation | P1 | SSRF tests cannot issue blocked requests; owner/secret/cache isolation passes |
| P3 | Owned artifacts, immutable approvals and unified publication path | P1 | No caller path authority; stale/foreign/unapproved content cannot dispatch |
| P4 | Correct schedules and consistent provider adapters | P3 | Due time, cron/timezone, output persistence and provider media contracts pass |
| P5 | Recoverable workers, events, shutdown and truthful health | P3, P4 | Restart/crash/deadline tests pass in isolated mode; interim file limitations remain declared |
| P6 | Transactional database, object storage, migration and disaster recovery | P2, P5 | Multi-process consistency, shadow reconciliation, clean restore and rollback pass before cutover |
| P7 | Authenticated browser journeys and all-page interaction coverage | P2–P5 | All 46 page journeys pass against isolated services, including session switch and playback |
| P8 | Connected engines, analytics, teams, billing and provider lifecycle | P6, P7 | Every advertised capability produces its defined outcome and has measurement/provenance |
| P9 | Enforced CI, current docs, full acceptance and controlled rollout package | P6–P8 | Every finding and completion task has closure evidence; remaining live prerequisites are explicitly open |

### P0 — Contracts, coverage and verification foundation

Tasks: **A19, A20, A27 start here; C01.**

1. Refresh source/status against the audit snapshot, preserve existing untracked webhook work, and record the baseline revision/configuration shape without secret values. Any changed finding is revalidated rather than treated as an immutable implementation fact.
2. Finish substantive reading of inventory-only and partially reviewed first-party code. Include UI components/hooks, service bodies, Python bridges, shell/SQL scripts, build/deployment configuration, mocks, tests, attached historical requirements and all original documents. Catalogue new defects under additional IDs; keep third-party and binary-media review boundaries explicit.
3. Write canonical contracts for identity/roles, artifact ownership, content/release transitions, schedule semantics, provider outcomes and error handling. Document API compatibility/deprecation and data ownership policies before changing routes.
4. Convert the isolated defect probes into focused executable regression tests. Add real Express request tests and browser interaction infrastructure; replace the hardcoded state-array pipeline placeholder. Keep provider/network calls mocked in the default suite and run external integrations in a separate explicit job.
5. Fix AST route extraction and distinguish the nine documentation check errors from actual missing routes. Establish correct lint scopes for normal React UI versus Remotion compositions; repair errors without globally disabling useful rules.
6. Replace the rule “one matching test filename per source file” with meaningful behavior coverage mapping where appropriate. Track security-sensitive handlers/workers as mandatory coverage. Do not create empty tests merely to satisfy the 137-file filename gate.

**Gate:** contracts and substantive review evidence are recorded, regressions demonstrate the audit failures, and all verification commands produce useful actionable results. The quality/document tasks remain open until final enforcement and current-source evidence in P9.

### P1 — Authentication, ownership and entitlement closure

Tasks: **A01, A02, A04, A05, A06, A15.**

1. Separate explicitly public auth bootstrap from protected system operations. Place guards before registration and use an explicit admin boundary for platform-wide administration.
2. Make owner context mandatory in REST/MCP/render/scheduler services; scope list/read/status/media/delete operations and queue deduplication. Bind MCP sessions to the authenticated workspace/actor as well as session identity.
3. Create an authoritative owned-video lookup; reject unknown/unowned IDs and validate filesystem resolution within internal storage adapters. Preserve legacy unowned data in quarantine with a report for explicit remediation.
4. Close branding and residual-engine isolation: assets, compliance, recycle/freshness, buckets, shadowban, best-time, hashtag history, trend-hijack history, custom hooks/rules, costs and knowledge-base mutation. Audit other mutable stores discovered in C01 under the same rules.
5. Assign signup plan/permissions on the server; remove key hashes from response construction. Implement membership/role checks and token-version revocation so suspension, sensitive role changes and revoked sessions have a defined effect.
6. Retain provider credentials only in workspace-managed encrypted storage; explicitly guard any temporary local compatibility mode and keep it out of the production publish path.

**Gate:** each affected route has anonymous, correct-owner, wrong-owner, insufficient-role and permitted-admin tests. No worker or server callback can recover authority from a caller-supplied tenant ID.

### P2 — Outbound requests, secrets and translation

Tasks: **A07, A08, A29, A30.**

1. Review and integrate the existing webhookSecurity source; build one hardened transport for webhooks and feeds with explicit per-use policy. Preserve HTTP compatibility only for feed sources that need it, while rejecting internal addresses and redirects to them. Webhooks remain HTTPS-only.
2. Validate at create/update and immediately before dispatch. Pin a validated DNS address, preserve TLS hostname verification, disable or revalidate redirects, and enforce deadlines, response limits and bounded concurrency. Test IPv4/IPv6/mapped addresses, DNS rebinding and proxy behavior with injected resolvers/transports.
3. Allowlist webhook mutations, keep owner/ID immutable, target one hook for tests, encrypt stored credentials and sanitize persisted failures. Migrate existing plaintext records with explicit missing-key failure and recoverable rollback.
4. Replace the truncated translation cache key with a full-input digest plus owner/language/provider/config identity. Add input/batch bounds, request cancellation and truthful unavailable/degraded results. Prefixing source text with a language label is not accepted as completed translation.

**Gate:** no negative test performs real outbound communication; denied destinations never reach the transport. One selected-hook test produces one mocked dispatch, no secret appears in returned/logged/persisted errors, and translation prefix collisions cannot return another script suffix.

### P3 — Artifacts, approvals and one release path

Tasks: **A03, A12; C02; C04 contract starts here.**

1. Add shared artifact/content/release services with owner checks used by routes and workers. Register primary videos, thumbnails and other outputs with checksum/type/size/provenance; P6 completes object-store authority.
2. Replace publish `renderOutputPath`/`thumbnailPath` inputs with owned artifact IDs. Resolve file paths internally and verify real paths, media type, current checksum and approval binding before any upload. Resolve provider destinations from verified workspace connectors.
3. Preserve a legacy endpoint only as an adapter into the same safe release service. It must not skip approval, artifact authorization or credential isolation. Update the publish dashboard to use the same contracts.
4. Implement immutable approved content and releases: changed scripts, media, metadata or destinations create a new version/approval requirement. Define legal release/target transitions and aggregate the parent from its targets.
5. Scope idempotency keys to workspace plus intent; duplicate equivalent requests return the same result while changed payloads with the same key fail deterministically.
6. Unify direct creation, bulk, automated drafts, persistent scheduling and both library views around canonical owned content/render/artifact records.

**Gate:** a cross-tenant or caller-selected path cannot reach a provider; modifying any approved payload invalidates approval; duplicate requests do not create orphan publish records; parent release status matches the destination outcomes.

### P4 — Scheduling and provider correctness

Tasks: **A10, A22, A24, A31.**

1. Define persisted schedule timezone, cron expression, next occurrence, one-shot due time, retry time, cancellation and missed-occurrence policy. Calculate recurrence from cron/timezone rather than adding an hour.
2. Claim each occurrence once, persist jitter once and expand the requested platform/language/category combinations explicitly. Validate bounded combinations and unsupported configurations at submission.
3. Save image/carousel/banner/video output as content/artifact records. Engine-not-ready means deferred work; a schedule becomes successful only after its defined completion milestone. Source automation creates reviewable content and does not bypass release approval.
4. Delay local execution for non-native provider schedules; validate native scheduling and separate accepted scheduling from actual public publication.
5. Normalize provider IDs/media results/failure classes. Fail video publishing if media upload fails; distinguish bad credentials from temporary validation/network errors. Persist refreshed credentials with conflict-safe rotation and revoke semantics.
6. Build per-provider mocked contract suites for Telegram, YouTube, Instagram, Facebook, LinkedIn and X. Verify API/capability requirements against official docs at implementation time; live provider tests remain separately tracked until valid credentials/destinations and test authorization exist.

**Gate:** frozen-clock daily/weekly/DST/retry cases and process restarts preserve due times; no video publishes early; every supported provider returns consistent IDs and truthful media state. A24 remains open for each intended live provider lacking credential-backed evidence.

### P5 — Execution lifecycle, events and operations

Tasks: **A09, A11, A14, A21; C03 starts here.**

1. Introduce durable execution identity and structured attempts across ingest/planning/render/publish/outbox work. Make processing transitions, correlation IDs and the stable job→artifact relation explicit.
2. Fix independently cached file stores immediately through a shared coordinated writer and fresh reads in supported file mode. Atomic rename alone is insufficient. P6 replaces this interim limitation with transaction-backed repositories.
3. Add render deadlines, cancellation, progress, cleanup and checkpoint/reuse behavior. Persist terminal failures; retries distinguish incomplete output from reusable validated output. No unbounded polling.
4. Persist publish intent before provider calls; use provider idempotency/session IDs where supported. On ambiguous provider outcome, reconcile or require operator resolution before another upload. Test the crash windows around every side effect and local commit.
5. Implement bounded retry classes, deferred rate limits, DLQ visibility/recovery and event/outbox deduplication with distinct execution attempts preserved.
6. Replace competing signal handlers with one awaited shutdown sequence and a bounded deadline; close HTTP, timers, workers, Redis and TTS subprocesses predictably.
7. Start ingest/planning workers only when their workflows are wired and configured; measure their registered heartbeats. Split liveness/readiness and protect/scoped operational metrics. Add dependency deadlines rather than indefinite Redis pings.

**Gate:** isolated crash/restart, timeout, cancellation, duplicate delivery, shutdown and DLQ tests pass. A09/A11 are not fully closed until P6 demonstrates multi-process transactional consistency and safe recovery.

### P6 — Durable storage, migration and disaster recovery

Tasks: **A13, A25, A26; final durable closure of A09/A11; C03, C04.**

1. Declare and lock PostgreSQL/S3 dependencies. Add isolated PostgreSQL, S3-compatible object storage and Redis test configuration without changing production authority. Prove migration tools reach safety gates without opening connections when approvals/configuration are missing.
2. Define repository ports and schema/model translations for workspaces/members, connectors/destinations/secrets references, content/version/approval/release/targets, render/publish executions, events/outbox, artifacts, schedules, analytics, quotas/costs and mutable engine state.
3. Enforce same-workspace and connector/destination relationships with composite constraints; choose consistent workspace-scoped idempotency keys and indexes. Write business state, lifecycle events and outbox entries transactionally.
4. Implement PostgreSQL repositories and a real outbox dispatcher with leasing, retries, idempotent delivery and dead-letter/operator handling. Exercise concurrent independent processes rather than only multiple objects in a single test.
5. Implement object upload/download, checksum verification, tenant prefixes, short-lived signed access, retention, quarantining and reference-safe cleanup. Register every artifact producer, including renders, filters, thumbnails, repurposed outputs and exports.
6. Repair readiness/approval logic, migration locks and checksums. Build ownership reconciliation reports, reject ambiguous/unowned records and preserve source files for rollback; never infer owners from filenames or assign all data to one default tenant.
7. Perform dry-run → consistent encrypted backup → controlled backfill/shadow writes → read verification → reconciliation → rollback rehearsal. Only then prepare the reviewed cutover configuration. Define one authority and a post-cutover rollback/write-capture strategy; do not blindly dual-write permanently.
8. Restrict Redis networking/auth. Provide encrypted off-host backups, held-secret recovery instructions, integrity/path validation, queue reconstruction/checkpoints and clean-room restore. Establish measurable RPO/RTO and record actual results.

**Gate:** no lost updates/events under multiple processes; fresh readers see committed work; every object reconciles; restored metadata/media/queue intent agree; primary-read cutover fails closed unless all approved gates pass. Provisioning and cutover prerequisites stay open until the actual target environment is ready.

### P7 — Browser workflow completion

Tasks: **A16, A17, A18; C05.**

1. Scope GET and in-flight caches by session/workspace/normalized request, clear/abort old work on auth change and ignore late responses. Compare parsed API origins before attaching credentials in both HTTP clients.
2. Implement authenticated media delivery that supports large video playback, seeking, download, expiry and cross-workspace denial. Verify image/filter/thumbnail previews use the same safe artifact-access model.
3. Remove Node core browser imports, use browser UUID APIs and move authoritative audit records server-side. Fix auth onboarding/session expiry, error and empty states, and user-visible operation outcomes.
4. Update creation/publishing/releases/schedules/connectors/library pages to the unified ID-based APIs. Every mutation refetches or invalidates the relevant scoped state; background progress comes from current job events.
5. Execute every row of PAGE_ACCEPTANCE_PLAN.md in a real browser with isolated providers. Include empty/success/validation/error/permission/expired-session states and keyboard/accessibility checks for interactive controls.

**Gate:** all 46 routes have real interaction evidence; no protected resource relies on an unauthenticated bare media URL; session-switch tests cannot show another tenant's data; browser console has no uncaught workflow errors.

### P8 — Complete the advertised product capabilities

Tasks: **A23, A28; C06, C07, C08.**

1. Create a capability register for every engine/function: input, output type, runtime caller, owner, feature flag, provider, fallback, cost and proof. Trace every visible control to an active effect or a clearly defined advisory output.
2. Wire all seven enhanced services: memory retrieval/storage, feedback regeneration, predictive scoring, alternative asset sourcing, platform metadata, beat synchronization and bounded agent orchestration. Use owner-scoped durable data/provenance, cancellation and cost/retry budgets.
3. Connect editing/audio/visual/watermark/thumbnail effects that promise media transformation to actual rendering/FFmpeg output. Keep prediction/strategy tools labelled as measured heuristics or experimental outputs until evaluated; do not manufacture a trained-model claim.
4. Verify representative short/long, portrait/landscape, category overlays/templates, subtitles, multilingual narration/translation, music, stock/AI fallback and asset export. Evaluate media properties, actual frames, audible narration and subtitle timing; compare before/after effects where relevant.
5. Complete analytics ingestion, A/B assignment and exposure tracking, quota reservations/release on failure and a reconcilable usage/cost ledger. Simulated dashboard constants are not accepted as real operational metrics.
6. Implement real member invitation/acceptance/removal and role changes with server-side audit/session revocation. Connect integration buttons to actual connector lifecycle rather than writing a log action.
7. Implement subscription state and provider-neutral payment integration: verified/idempotent billing events, plan changes/cancellations, entitlement checks, invoices/status and reconciliation. Use isolated sandbox contracts first; live payment provider choice/credentials are a prerequisite to live billing closure.
8. Complete each intended provider's verification, encrypted secrets, refresh, revoke, failure/recovery and destination lifecycle. Record staged/live acceptance per provider rather than treating Telegram proof as proof for all providers.

**Gate:** every advertised feature yields the documented persisted/exported result; each engine flag affects execution; teams/subscriptions/integrations do the actual action; live-unconfigured dependencies remain explicitly open instead of becoming fake success or disappearing from scope.

### P9 — Full validation, documentation and rollout readiness

Tasks: **A19, A20, A27 final closure; C09, C10; final live-provider/operations gates.**

1. Run the full checks against a clean frozen-lock install and production build. Enforce lint/typecheck/backend+UI+script checks, meaningful route/ownership/worker/browser tests and the chosen security policy in CI; no blanket `|| true` bypass.
2. Replace branch-specific mutable deployment commands with tested immutable artifact/image deployment. Verify dependency packaging, configuration, migration order and release/schema compatibility. Rehearse rollback in an isolated target.
3. Run two-tenant, role-based end-to-end journeys: sources → script → content review → render → artifact → release approval → scheduled provider publish → timeline/analytics → failure → retry/reconciliation/DLQ recovery. Include account suspension, revoked secrets and tampered/foreign artifact IDs.
4. Run bounded concurrency/load/backpressure tests and alert drills against the agreed latency/queue-lag/failure/spend/resource budgets. Demonstrate worker and dependency failures show truthful health.
5. Reconcile all 56 original documents: keep historical evidence dated, establish one current capability/status register, regenerate indexes/API/store maps, fix old links and rehearse installation/migration/backup/restore instructions. Replace static “all engines active” claims with measured capability state.
6. Produce closure evidence per task: revision, affected contracts/files, tests/drills, result, remaining prerequisite and rollback implications. Re-review changed critical paths and add any new findings before claiming closure.
7. Prepare a concrete rollout package: target configuration, migration/reconciliation results, held-secret prerequisites, live provider destinations, backup/restore evidence, monitoring, rollback trigger and operator actions. Production activation is a separate final action against that reviewable package.

**Gate:** every A-task and completion C-task is verified. If external integration or deployment prerequisites remain, report local/staging completion accurately and retain the corresponding task as open. No percentage or “production ready” label substitutes for these gates.

## Validation strategy and evidence rules

- **Unit/property tests:** owner checks, content hashes, allowed transitions, cache isolation, cron/timezone math, provider error mapping and URL/IP policy. Frozen clocks and injected resolvers/transports make failures deterministic.
- **HTTP contract tests:** actual Express routing and middleware order; auth/role/owner matrices, payload validation and non-enumerating cross-tenant errors. AST discovery is inventory, not the test itself.
- **Integration tests:** real isolated Redis/PostgreSQL/object storage with concurrent processes; transaction rollback, scheduling, retries, event/outbox delivery, provider mocks and cancellation.
- **Browser tests:** real effects, mutations, onboarding, auth expiry/session switch, media range/download, all 46 routed pages, errors/empty states and keyboard flow. SSR markup tests remain useful only for their narrower assertions.
- **Media tests:** representative real renders plus ffprobe/properties, frame checks, audio/subtitle review and effect comparisons. Golden frames tolerate known codec/font differences; do not equate file existence with correct media.
- **Recovery tests:** process-kill checkpoints, provider-accepted/local-commit crash, ambiguous-outcome handling, DLQ replay, clean shutdown, consistent snapshots, tampered archive rejection and clean-room restore.
- **External acceptance:** each provider/payment adapter is tested with sandbox or approved owner credentials/destinations. Record exactly what was exercised; never reuse mock or historical proof as current live acceptance.
- Run targeted tests for a change, then the appropriate phase regression gate. Repeat broad checks after meaningful integration changes; avoid creating tests that merely duplicate trivial implementation.

A task may be `planned`, `in_progress`, `implemented_unverified`, `verified`, or `blocked_external`. A blocked external gate does not block independent local work and is not a completed task. Each verified task records its source revision, relevant tests/drill artifact, observed result and residual limits. A stale security-probe script that expects the old vulnerability must be replaced by a regression expectation after the fix, not reinterpreted as a passing test.

## Data and compatibility policy

- Preserve and report legacy unowned records; no silent ownership guesses, lossy cleanup or reset of malformed stores. Backfills are separately logged and reversible.
- Changing API path payloads requires an explicit compatibility adapter and updated first-party clients. The adapter has the same authorization/approval requirements; deprecation never introduces a parallel unsafe path.
- Changes to signed media tokens, sessions, encrypted webhook secrets and provider credentials include expiry/key-version/revocation compatibility tests. Missing keys fail clearly without destroying data.
- Before schema/object-store cutover, define backup consistency, dual-write/read-verify failure behavior and post-cutover rollback. “Disable the flag” is insufficient once new durable-only writes exist.
- Preserve the existing untracked webhook-security work; review it as input before integration. No unrelated checkout or historical document is overwritten to make current checks appear green.

## Decisions and external prerequisites to resolve at the relevant phase

| Item | Planning default | Required before |
|---|---|---|
| Identity/membership | Workspace-owned server-side roles and revocable sessions | Team/role acceptance |
| Queue/cron timezone | Explicit IANA timezone per schedule, UTC due-time storage | P4 schedule acceptance |
| Legacy unowned records | Quarantine and operator-reviewed reconciliation | P6 backfill/cutover |
| Database/object-store target | PostgreSQL + S3-compatible storage; isolated services first | P6 target provisioning/cutover |
| Live providers | All six current adapters remain in scope; unsupported capabilities are explicit | Per-provider live closure |
| Billing provider | Provider-neutral contracts and isolated event adapter first | Live subscriptions/payment closure |
| RPO/RTO/SLO/load budget | Define and measure against the intended deployment capacity | P6 recovery and P9 production gates |
| Live side effects/deployment | Complete implementation and reviewable staging evidence first | Explicitly authorized final activation |

No calendar promise is attached to this plan: the current audit leaves a substantial semantic-review backlog and external integration unknowns. After P0, size the implementation from confirmed contracts and the first completed vertical slice; report estimates as ranges with assumptions.

## Finding-by-finding work packages

The following packages preserve every audit ID and give its implementation and closure criteria. Shared infrastructure is implemented once and reused; a finding is not closed early merely because its scaffolding phase finished.

### A01 — System assets and compliance bypass authentication

- **Priority:** P0; **start:** P1; **closure:** P1; **status:** planned.
- **Primary source:** [src/server/routers/systemengines.ts](../../src/server/routers/systemengines.ts).
- **Implementation:** Move public bootstrap into an explicit public router; guard all other handlers before registration. Derive compliance ownership from claims; protect global operations with the admin guard. Test unauthenticated reads and mutations.
- **Acceptance:** Anonymous asset/compliance read and mutation requests fail; tenant A cannot read, forge, modify or delete B records; only approved bootstrap endpoints remain public; admin operations require server-verified admin access.

### A02 — Core video API does not enforce resource ownership

- **Priority:** P0; **start:** P1; **closure:** P1; **status:** planned.
- **Primary source:** [src/server/routers/rest.ts](../../src/server/routers/rest.ts).
- **Implementation:** Require a nonempty authenticated owner throughout create, status, list, media, path, and delete; authorize each ID against an owner record. Remove raw path authority and apply the same policy to MCP.
- **Acceptance:** REST, MCP, bulk and scheduler creates persist the verified owner. Tenant B sees 404 for A status, metadata, stream, path and deletion; list returns only B resources. Invalid IDs and traversal/symlink escapes fail. Legacy unowned media stays quarantined.

### A03 — Publishing accepts caller-selected local media and bypasses approved content identity

- **Priority:** P0; **start:** P3; **closure:** P3; **status:** planned.
- **Primary source:** [src/server/routers/releases.ts](../../src/server/routers/releases.ts).
- **Implementation:** Accept an opaque owned artifact ID, verify manifest, file type/realpath, content-version binding, destination, and approval in both enqueue and worker. Gate or remove the global legacy publish path.
- **Acceptance:** A request cannot supply an authoritative filesystem path. API and worker resolve the same owned artifact and approved digest. Cross-owner artifacts, stale approvals, mismatched thumbnails and legacy global credential bypasses are rejected before provider dispatch.

### A04 — In-flight render deduplication crosses tenants

- **Priority:** P1; **start:** P1; **closure:** P1; **status:** planned.
- **Primary source:** [src/short-creator/ShortCreator.ts](../../src/short-creator/ShortCreator.ts).
- **Implementation:** Include tenantId in both signature namespace and queue match; reject missing ownership. Test identical content submitted by two tenants.
- **Acceptance:** Identical content submitted by A and B creates independent owned jobs; retries within A reuse the intended job. Missing owner fails before metadata or media creation.

### A05 — Branding allows cross-tenant reads and writes

- **Priority:** P1; **start:** P1; **closure:** P1; **status:** planned.
- **Primary source:** [src/server/routers/branding.ts](../../src/server/routers/branding.ts).
- **Implementation:** Derive tenant from claims or enforce an explicit admin exception for path tenant; scope list, CSS, reset, and update.
- **Acceptance:** Branding read, CSS, update, reset and list are owner-scoped; forged path tenants cannot affect other workspaces. A permitted admin action is explicitly tested and audited.

### A06 — Residual mutable engine stores remain global

- **Priority:** P1; **start:** P1; **closure:** P1; **status:** planned.
- **Primary source:** [src/server/routers/recycle.ts](../../src/server/routers/recycle.ts).
- **Implementation:** Classify reference data separately; add owner to mutable tenant data, quarantine legacy records, and exercise cross-tenant read/write denial per family.
- **Acceptance:** Every mutable store in the residual-store checklist has claim-derived ownership, migration/quarantine rules and cross-tenant read/write tests. Built-in reference data is immutable to ordinary tenants; custom hooks/rules are scoped.

### A07 — Webhook requests have no effective SSRF policy

- **Priority:** P1; **start:** P2; **closure:** P2; **status:** planned.
- **Primary source:** [src/services/WebhookNotificationEngine.ts](../../src/services/WebhookNotificationEngine.ts).
- **Implementation:** Integrate and test URL validation and a pinned transport for create, update, and each send; disable redirects and sanitize transport errors. Preserve the existing untracked work while integrating.
- **Acceptance:** Create/update/send reject private, loopback, link-local, metadata, reserved and disallowed provider hosts, including IPv6 and DNS/redirect changes. HTTPS transport uses the validated address and original TLS identity; time/response limits apply. No test contacts a real internal address.

### A08 — Webhook updates can reassign ownership; test dispatch targets other hooks

- **Priority:** P1; **start:** P2; **closure:** P2; **status:** planned.
- **Primary source:** [src/services/WebhookNotificationEngine.ts](../../src/services/WebhookNotificationEngine.ts).
- **Implementation:** Allowlist mutable fields and preserve immutable tenant/id. Send tests directly to one selected hook with try/finally restoration. Encrypt secrets and redact errors.
- **Acceptance:** Webhook owner/id cannot be overwritten. Test dispatch calls exactly one selected hook once, irrespective of subscribed events, and restores temporary state on error. Secrets are encrypted, API payloads are masked and persisted/logged failures are redacted. Migration preserves usable secrets with rollback.

### A09 — Independent cached JSON stores lose events and serve stale timelines

- **Priority:** P1; **start:** P5; **closure:** P6; **status:** planned.
- **Primary source:** [src/db/JobEventStore.ts](../../src/db/JobEventStore.ts).
- **Implementation:** Use one coordinated writer as an interim measure and transactional durable storage for authority. Add multiple-instance read/write tests; event+outbox writes must be one transaction.
- **Acceptance:** Two independent writers/readers retain every event and see fresh ordered timelines; retries reuse event identity without losing distinct attempts. Event and outbox insertion commit atomically in durable mode; outbox claims, retries and delivery recovery are tested.

### A10 — Future publish times can publish immediately

- **Priority:** P1; **start:** P4; **closure:** P4; **status:** planned.
- **Primary source:** [src/workers/PublishWorker.ts](../../src/workers/PublishWorker.ts).
- **Implementation:** Persist due time and delay/claim execution at that time for providers without native scheduling. Reject unsupported schedules instead of publishing now.
- **Acceptance:** A frozen-clock test proves no provider side effect before due time. Native and queue scheduling share one due-time contract; cancellation/reschedule survives restart and invalid/past dates have explicit validation.

### A11 — Publish idempotency does not cover provider success before local persistence

- **Priority:** P1; **start:** P5; **closure:** P6; **status:** planned.
- **Primary source:** [src/workers/PublishWorker.ts](../../src/workers/PublishWorker.ts).
- **Implementation:** Persist execution intent/request identity and reconcile ambiguous outcomes before retry. Add deterministic crash tests around provider response and every local commit boundary.
- **Acceptance:** Crash injection before request, after provider acceptance, and before/after each local commit causes reconciliation or a safe unresolved state rather than a blind reupload. Render restart resumes/checks a stable execution identity; timeouts, cancellation, DLQ and operator recovery are bounded.

### A12 — Approval does not freeze the approved payload or roll up release state

- **Priority:** P1; **start:** P3; **closure:** P3; **status:** planned.
- **Primary source:** [src/db/ContentVersionStore.ts](../../src/db/ContentVersionStore.ts).
- **Implementation:** Make approved versions immutable or create new versions on change; bind approval to content/artifact digest. Enforce transitions and derive parent release status from targets.
- **Acceptance:** Editing approved content creates a new version and invalidates any approval for changed payload. Release/target transitions are enforced; all-published, mixed, failed and cancelled targets update the parent correctly. Workspace-scoped idempotency works without cross-tenant collisions.

### A13 — Migration entry points cannot load their required packages

- **Priority:** P1; **start:** P6; **closure:** P6; **status:** planned.
- **Primary source:** [scripts/migrations/apply.mjs](../../scripts/migrations/apply.mjs).
- **Implementation:** Declare and lock required dependencies; verify non-executing guard behavior and isolated database/object-store integration. Implement adapters and reconciliation before cutover; do not enable primary reads during this audit.
- **Acceptance:** Frozen-lock install declares pg/S3 clients. Apply/artifact tools load and fail cleanly at missing-approval gates without I/O. Isolated PostgreSQL/MinIO integration and file/durable adapters pass reconciliation; deployed authority is stated accurately.

### A14 — Shutdown can exit before worker close completes

- **Priority:** P1; **start:** P5; **closure:** P5; **status:** planned.
- **Primary source:** [src/index.ts](../../src/index.ts).
- **Implementation:** Use a single awaited shutdown sequence with server close, scheduler/interval stop, worker drain, Redis close, subprocess shutdown, and a bounded deadline.
- **Acceptance:** SIGTERM/SIGINT stop admission, stop schedulers/timers, drain or checkpoint workers, close HTTP/Redis and child processes, then exit. A second signal and deadline are handled deterministically. Restart preserves pending/reconciling work.

### A15 — Registration accepts an enterprise plan selected by an anonymous caller

- **Priority:** P1; **start:** P1; **closure:** P1; **status:** planned.
- **Primary source:** [src/services/AuthEngine.ts](../../src/services/AuthEngine.ts).
- **Implementation:** Assign server-side signup entitlement, separate billing/admin changes, remove hash fields explicitly, and define token revocation/rotation semantics.
- **Acceptance:** Anonymous callers cannot choose paid/admin entitlements; registration/verification responses omit key hashes and secrets. Server-side roles control plan/bootstrap changes; suspended users and revoked sessions lose access under the defined token-version policy.

### A16 — Browser caches are shared across authentication sessions

- **Priority:** P1; **start:** P7; **closure:** P7; **status:** planned.
- **Primary source:** [src/ui/services/apiClient.ts](../../src/ui/services/apiClient.ts).
- **Implementation:** Namespace cache/in-flight work by session and parameters; clear/abort on auth change. Resolve URLs and compare parsed origins before adding credentials in both helpers.
- **Acceptance:** Switch A→B without reload never returns A cached or in-flight responses. Cache identity includes session and normalized query parameters; logout aborts or discards old requests. Both HTTP helpers attach tokens only to the explicitly configured API origin.

### A17 — Video playback/download omit the bearer credential

- **Priority:** P1; **start:** P7; **closure:** P7; **status:** planned.
- **Primary source:** [src/ui/pages/VideoDetails.tsx](../../src/ui/pages/VideoDetails.tsx).
- **Implementation:** Use an authenticated blob/object URL or a short-lived tenant-scoped video URL; support range streaming and revoke object URLs on cleanup.
- **Acceptance:** A real browser plays, seeks and downloads owned short/long videos, including large files and token expiry. Cross-owner/expired links fail; streaming supports ranges and controlled signed access. Any object URLs are cleaned up.

### A18 — Browser tenant actions call a Node-only crypto module

- **Priority:** P1; **start:** P7; **closure:** P7; **status:** planned.
- **Primary source:** [src/ui/pages/TenantConsole.tsx](../../src/ui/pages/TenantConsole.tsx).
- **Implementation:** Use globalThis.crypto.randomUUID and exercise tenant mutation interactions in a browser test.
- **Acceptance:** Production browser tenant interactions run without Node crypto imports or console errors; UUID generation uses a browser-supported API and server-side audit writes remain authoritative.

### A19 — Passing gates do not validate the full workflow

- **Priority:** P1; **start:** P0; **closure:** P9; **status:** planned.
- **Primary source:** [src/integration/pipeline.e2e.test.ts](../../src/integration/pipeline.e2e.test.ts).
- **Implementation:** Add meaningful two-tenant workflow tests with mocked providers plus controlled integration drills. Use AST route discovery and actual request tests; classify doc-parser errors correctly.
- **Acceptance:** The placeholder pipeline test is replaced with real API/store/queue flow assertions. AST route inventory resolves multiline registrations and actual mounts; request tests verify guard/status/body contracts. Browser tests execute effects and mutation flows for all 46 routed pages.

### A20 — Lint and dependency auditing are nonblocking in main CI

- **Priority:** P1; **start:** P0; **closure:** P9; **status:** planned.
- **Primary source:** [.github/workflows/ci.yml](../../.github/workflows/ci.yml).
- **Implementation:** Repair baseline and enforce appropriate gates; build immutable artifacts with build dependencies and deploy the tested revision. Keep separate advisory scans visibly advisory.
- **Acceptance:** Repository lint is clean under correctly scoped UI/Remotion rules; no blanket failure swallowing remains. CI runs backend/UI/script checks, tests, build and relevant security/contract gates. Deploy consumes the tested immutable revision with correct dependencies and branch/tag handling.

### A21 — Queue connectivity is reported as worker liveness

- **Priority:** P1; **start:** P5; **closure:** P5; **status:** planned.
- **Primary source:** [src/server/routers/health.ts](../../src/server/routers/health.ts).
- **Implementation:** Measure registered worker heartbeats and dependency deadlines; separate liveness/readiness; scope tenant metrics and protect global operational details.
- **Acceptance:** Health shows only registered heartbeat-reporting workers; stopped/nonexistent workers are not online. Liveness and readiness differ during initialization/dependency failure. Tenant dashboards exclude other tenants; admin metrics and dependency timeouts are tested.

### A22 — Persistent scheduler reports success without durable generated output

- **Priority:** P1; **start:** P4; **closure:** P4; **status:** planned.
- **Primary source:** [src/server/routers/schedule.ts](../../src/server/routers/schedule.ts).
- **Implementation:** Use a claimed durable execution record, persist outputs and owner, record success only after actual completion, and resolve each requested destination/language explicitly.
- **Acceptance:** Every schedule occurrence has a claimed persisted execution, records output artifact/content IDs and marks success only on completed work. Not-ready engines defer without false freshness/success. Every requested platform/category/language is handled or rejected explicitly; one jittered due time is persisted.

### A23 — Several AI and enhancement features are advisory or disconnected

- **Priority:** P2; **start:** P8; **closure:** P8; **status:** planned.
- **Primary source:** [src/services/PipelineOrchestrator.ts](../../src/services/PipelineOrchestrator.ts).
- **Implementation:** Label heuristics and directives accurately; trace each selected control to a real producer/result. Integrate intended enhancements with input/output tests and measured evaluations.
- **Acceptance:** Every advertised engine has a declared input/output contract, active runtime caller and meaningful output test or an explicitly advisory product definition. Required enhancement services are wired and feature flags affect real execution. Render-affecting controls are verified in exported media; scores identify heuristic/experimental status and evaluation evidence.

### A24 — Provider result and failure contracts are inconsistent

- **Priority:** P2; **start:** P4; **closure:** P9; **status:** planned.
- **Primary source:** [src/publishers/PlatformPublisher.ts](../../src/publishers/PlatformPublisher.ts).
- **Implementation:** Normalize adapter results and failure taxonomy, require media for a video publish, persist refreshed credentials, and test transient validation errors separately from invalid auth.
- **Acceptance:** All adapters return one canonical external ID, media outcome, scheduling and error contract. Video upload failure cannot become text-only success. Refresh/revocation is persisted safely; transient credential-check failures retry appropriately. Platform-specific integration tests pass and live verification stays a separate recorded gate.

### A25 — Durable-storage readiness gates and SQL ownership constraints need completion

- **Priority:** P2; **start:** P6; **closure:** P6; **status:** planned.
- **Primary source:** [scripts/migrations/readiness.mjs](../../scripts/migrations/readiness.mjs).
- **Implementation:** Make every gate explicit and consistent; test false-string approvals and enabled-primary flags. Add composite ownership constraints and complete schema/model translation before migration.
- **Acceptance:** Readiness blocks primary-read flags and string false approvals. SQL enforces workspace/connector/destination ownership with composite constraints and covers events/outbox/artifacts/executions/usage/approvals. File-record mappings and transaction boundaries are tested against the actual schema.

### A26 — Local backup scope does not provide host-loss or queue recovery

- **Priority:** P2; **start:** P6; **closure:** P6; **status:** planned.
- **Primary source:** [scripts/backup.mjs](../../scripts/backup.mjs).
- **Implementation:** Define and rehearse recovery for application state, queues, media, and held secrets; replicate off-host and verify consistency. Restrict Redis exposure. Validate archive/manifest paths before extraction/copy when accepting untrusted archives.
- **Acceptance:** Encrypted off-host backup and clean-room restore recover metadata, artifacts and queued/executing/reconciling jobs using separately held keys. Traversal/symlink/manifest tampering is rejected before writes; corrupt/incomplete archives fail. Measured recovery meets the agreed RPO/RTO and Redis is private/authenticated.

### A27 — Documentation gives contradictory current-state claims

- **Priority:** P2; **start:** P0; **closure:** P9; **status:** planned.
- **Primary source:** [docs/REALITY_GAP_REGISTER.md](../../docs/REALITY_GAP_REGISTER.md).
- **Implementation:** Keep historical snapshots dated and immutable, designate one current capability register, and derive inventories from code. Distinguish implemented, connected, locally tested, live tested, and durable.
- **Acceptance:** One current capability/status register agrees with generated source inventories, configuration and executed evidence. Historical audits remain dated. All 56 original documents are reviewed, links resolve, setup/runbook commands are rehearsed in isolation, and current completion claims require evidence.

### A28 — Team, subscription and integration controls are log actions rather than complete services

- **Priority:** P2; **start:** P8; **closure:** P8; **status:** planned.
- **Primary source:** [src/ui/hooks/useTenantMutation.ts](../../src/ui/hooks/useTenantMutation.ts).
- **Implementation:** Either implement the service workflows and role checks or label these actions as operational notes; use Connectors for real provider lifecycle and a durable server audit ledger.
- **Acceptance:** Real invitations/member revocation and role enforcement persist across sessions; billing/entitlements are server-authoritative and payment-provider changes are verified events; connector UI reflects actual connect/refresh/revoke state. Actions are recorded server-side with actor/owner and no UI-only success claims.

### A29 — Translation cache collides on the first 50 characters

- **Priority:** P1; **start:** P2; **closure:** P2; **status:** planned.
- **Primary source:** [src/services/TranslationEngine.ts](../../src/services/TranslationEngine.ts).
- **Implementation:** Key by full-content digest and tenant/provider/model identity; distinguish unavailable or partial translation from a successfully translated result. Test different suffixes with the same prefix.
- **Acceptance:** Scripts sharing a 50-character prefix never share cached suffixes; cache isolation covers tenant, full input, source/target language and provider configuration. Translation fallback is explicitly degraded/unavailable rather than fake translated text; unsupported languages and oversized batches are validated.

### A30 — Custom RSS validation makes unrestricted server-side requests

- **Priority:** P1; **start:** P2; **closure:** P2; **status:** planned.
- **Primary source:** [src/news-fetcher/RssFetcher.ts](../../src/news-fetcher/RssFetcher.ts).
- **Implementation:** Apply a shared server-side URL policy to initial feed validation, subsequent reads and redirects; bound time and response size and test internal-address rejection without network dispatch.
- **Acceptance:** Feed validation and subsequent fetches enforce the shared SSRF/DNS/redirect policy, per-fetch timeout/size limits and tenant-owned source access. Local/private URLs are rejected before any outbound request; cancellation and malformed/oversized feed handling are tested.

### A31 — Schedule recurrence ignores the configured cron expression

- **Priority:** P1; **start:** P4; **closure:** P4; **status:** planned.
- **Primary source:** [src/db/ScheduleStore.ts](../../src/db/ScheduleStore.ts).
- **Implementation:** Calculate next due time using the configured cron and timezone, define one-shot semantics, and test daily/weekly/DST/failure-retry recurrence separately.
- **Acceptance:** Daily, weekly and timezone-specific schedules calculate correct next occurrences rather than adding one hour. One-shot, retry, missed occurrence and DST behavior are explicit and tested with a frozen clock.

### C01 — Finish the semantic review backlog

- **Priority:** completion; **start:** P0; **closure:** P0; **status:** planned.
- **Implementation:** Account for every original file/function and classify code as active, disconnected, obsolete or third-party. Read the complete bodies of inventory-only/partial application source, validate remaining document instructions and turn newly discovered defects into tracked work. Maintain the original snapshot and add reviewed revision/evidence instead of claiming inventory equals review.
- **Acceptance:** All first-party source and original documents have a recorded substantive review; new findings are triaged and mapped to a phase. Binary/example/third-party exclusions are explicit.

### C02 — Unify creation, render, library and release contracts

- **Priority:** completion; **start:** P3; **closure:** P3; **status:** planned.
- **Implementation:** Route REST/MCP/bulk/source automation/persistent schedules through shared application services. Create stable content-version, render-execution and artifact relations. Make the two video-library views resolve the same owned records rather than separately authoritative lists.
- **Acceptance:** One created video is consistently visible, reviewable, playable, versioned and selectable for release; no path or stale-library workaround is necessary.

### C03 — Complete durable repositories and transactional outbox delivery

- **Priority:** completion; **start:** P6; **closure:** P6; **status:** planned.
- **Implementation:** Implement repository ports and PostgreSQL adapters for all authoritative domains; write event+outbox in business transactions, run a real outbox dispatcher, and claim work with leases. Keep file mode explicitly single-instance while supported.
- **Acceptance:** Multi-process writers/readers and outbox restart/retry tests pass with no lost events; owner constraints hold at database and API boundaries.

### C04 — Complete the artifact lifecycle

- **Priority:** completion; **start:** P6; **closure:** P6; **status:** planned.
- **Implementation:** Register every render/image/filter/thumbnail/repurpose/export producer, upload objects, verify checksum/type/size, return owner-scoped signed URLs, and implement reference-aware retention/quarantine/deletion.
- **Acceptance:** An isolated worker can produce media and another worker/browser can retrieve it without depending on the first worker filesystem; deletion cannot remove referenced/foreign artifacts.

### C05 — Execute all 46 browser journeys

- **Priority:** completion; **start:** P7; **closure:** P7; **status:** planned.
- **Implementation:** Use the route acceptance matrix, test actual interactions, auth expiry, session switch, validation, progress, retry and permission states. Verify output downloads and media preview rather than only static markup.
- **Acceptance:** Every routed page has dated evidence for its meaningful interactions; failures and unsupported provider states are accurately represented.

### C06 — Wire all seven enhancement services

- **Priority:** completion; **start:** P8; **closure:** P8; **status:** planned.
- **Implementation:** Integrate memory, feedback, predictive scoring, asset fallback, metadata generation, beat sync and agent loop with bounded retries, owner scope, durable provenance, feature flags and cost budgets. Define one metadata service authority instead of divergent generator behavior.
- **Acceptance:** Each toggle changes a measured execution path with an observable output/provenance record; disabled mode preserves the documented baseline; failed engines produce a truthful degraded result.

### C07 — Complete engine/media quality and measurement

- **Priority:** completion; **start:** P8; **closure:** P8; **status:** planned.
- **Implementation:** Connect intended editing/audio/visual/watermark/thumbnail effects to rendering; preserve pure advisory engines as accurately labelled tools. Verify captions, multi-language TTS, stock fallback, short/long portrait/landscape and category overlays. Add real analytics collection, A/B exposure/assignment, quota reservations and a usage/cost ledger.
- **Acceptance:** Representative rendered outputs meet documented media criteria; metrics trace to real events; quota limits apply under concurrent jobs and costs reconcile per tenant/provider/job.

### C08 — Finish team, billing and connector product workflows

- **Priority:** completion; **start:** P8; **closure:** P8; **status:** planned.
- **Implementation:** Implement member identities/invitations/roles, server-side audit, subscription lifecycle and provider-neutral billing adapter; finish per-provider account/destination verification, token refresh/revoke and encrypted credential handling. Select the live payment provider before payment activation.
- **Acceptance:** All local/mock contracts pass; each live-enabled integration has separate credential-backed acceptance. Unsupported/live-unconfigured integrations stay visibly pending and do not count as complete.

### C09 — Rehearse production operations and load

- **Priority:** completion; **start:** P9; **closure:** P9; **status:** planned.
- **Implementation:** Measure queue lag, error/latency rates, resource use and spend; wire alerts, run overload/backpressure/retry tests, restore to clean infrastructure and rehearse release rollback with compatible schema. Define measurable SLO/RPO/RTO targets before claiming success.
- **Acceptance:** Evidence meets the agreed budgets; old/new versions and rollback mode are compatible, secrets are supplied through managed configuration, and no audit gate is bypassed.

### C10 — Publish closure evidence and current documentation

- **Priority:** completion; **start:** P9; **closure:** P9; **status:** planned.
- **Implementation:** Produce a finding-by-finding closure record, source revision, test/drill artifacts, provider acceptance status and page/function/document coverage. Run a fresh independent validation pass of changed boundaries and reconcile any new findings.
- **Acceptance:** All A01–A31 and C01–C10 have verified evidence or remain explicitly open; production/full-completion labels are used only when their entire gate passes.

## Overall definition of complete

All 31 audit findings and all 10 completion packages are verified against the implemented revision; all original first-party source/documents have substantive review records; all 46 routed journeys have interaction evidence; intended engines and business workflows produce their actual outcomes; durable data/media/queue recovery is demonstrated; live provider/payment prerequisites have their own current acceptance; CI and documentation represent the measured system. Any residual gap stays visible and prevents claiming full completion.
