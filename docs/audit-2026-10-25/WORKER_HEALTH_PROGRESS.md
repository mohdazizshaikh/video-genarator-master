# Worker health, readiness and scoped operations — 28 October 2026

Ninth implementation increment, addressing A21. Full acceptance remains implemented_unverified pending controlled Redis/process/browser checks and distributed operation requirements.

## Behavior

Worker status now comes from a process-local registry populated by the three workers actually started here: render, publish and dead-letter. No ingest/planning capacity is fabricated. Registration alone is offline; a worker must emit ready, report a running/nonpaused loop and observe a ready Redis connection before a heartbeat is recorded. Observations expire after 15 seconds, with a heartbeat interval of five seconds. Pause/close remove available capacity; replacement registration tokens prevent callbacks from an old worker from stopping its replacement. Monitoring timers are unreferenced and cleared on close. Current job counts remain unknown instead of being inferred from global queue activity.

`GET /api/health/live` reports process liveness. `GET /api/health/ready` and the existing `/api/health` alias return 503 until the engine is ready, during engine failure/shutdown, when required workers lack fresh observations in Redis mode, or when the Redis dependency is unavailable. The public response contains only status/readiness, without host memory or operational detail. A Redis probe has a 1.5-second response deadline; repeated health requests share a pending probe rather than accumulating another Redis command per timeout.

Global `/api/health/queue` and `/api/health/metrics` now require the configured admin key. Global operations dashboard data is available only with that key; it works without inventing a workspace identity. Transient queue handles are closed after count reads, including count timeouts. Operations dashboard dependency bundles and queue reads have response deadlines. File-store connections are reported as unknown instead of fictional SQL connection counts.

Regular authenticated dashboard requests return persisted job counts/states and learning events only for their workspace. Queue states also require a workspace and filter owned records. No global worker capacity, database paths/size, Redis memory/key counts or host resource details are returned to workspace users. Workspace queue totals are derived from persisted status, not claimed as exact live BullMQ counts. Reconciliation states remain visible in the detailed status breakdown.

The UI handles scoped snapshots, hides restricted operational panels and labels workspace counts as persisted jobs. Scheduler count reads use the scoped dashboard rather than the admin queue endpoint, preserving ordinary scheduler access. Unknown operational measurements are not presented as zero activity. Swagger's existing health description/example now reflects readiness.

## Compatibility and limits

- Deployment probes using `/api/health` now wait for actual readiness. Use `/api/health/live` for a liveness probe that must remain successful during initialization or graceful shutdown.
- Monitoring clients need `X-Admin-Key` for raw queue counts/Prometheus metrics. Workspace admin claims alone do not grant cross-workspace operational access.
- Heartbeats are observations of workers in this Node process. They are not distributed Redis leases, proof of job progress, per-tenant reservations or a cluster-wide capacity registry. A process whose event loop is blocked cannot answer its health request; external probe deadlines remain necessary.
- HTTP response deadlines do not cancel all underlying Redis/filesystem operations. A hung Redis probe stays shared until it settles. Startup's original dependency connection behavior, distributed failover and cancellation of every underlying dependency remain separate work.
- Host resource sampling and directory traversal remain global operations accessible only through the admin path. No production deployment, dependency failure drill, real provider call or browser interaction acceptance was performed.

## Verification

| Check | Result |
|---|---|
| `npm run verify:production` | PASS: backend typecheck, 111 files / 434 tests, production build, AST route/build consistency |
| `npm run typecheck:ui` | PASS |
| Final scheduler/API client regressions after fixture update | PASS: 8 tests |
| Changed-source/test ESLint | PASS: 0 errors / 0 warnings |
| `git diff --check` | PASS |

The route gate resolves 351 registrations in 46 router files. Raw timestamps retain the host clock; report date follows the supplied session date. Final evidence is under `implementation-evidence/worker-health-*`. Regression cases cover absent registrations, expired/paused/stopped/disconnected observations, replacement callbacks, monitor cleanup, initialization/failure/shutdown semantics, required worker readiness, shared timed-out Redis probes, global access guards, positive admin access, queue timeout/cleanup, two-workspace status/event isolation, restricted UI panels and scheduler access through scoped telemetry.

Full-repository lint, controlled live Redis/process checks, all-browser acceptance and remaining remediation phases stay open. No phase is declared complete.
