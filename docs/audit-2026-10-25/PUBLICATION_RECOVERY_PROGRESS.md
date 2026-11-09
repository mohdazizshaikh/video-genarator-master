# Publication recovery and release lifecycle — 28 October 2026

Fifth implementation increment. A11 is implemented_unverified against its full acceptance criteria; A09/A12/A24 remain in progress and A10 retains integration acceptance gaps. No phase or complete-project acceptance is declared complete.

## Implemented behavior

- Publication executions persist the owned release/target/connector/destination/content identity, request ID, attempt and dispatch state. A canonical provider receipt is saved before release, job and attempt projections. Replays repair those projections without another upload, even if credentials expire or media is removed afterward.
- Lost acknowledgements, missing provider IDs and crashed dispatches enter `reconciling`. Automatic reupload is blocked. Only an explicit provider rejection permits a new request attempt. The generated request identity is local evidence; it is not a claim that every provider supports an idempotency key.
- Worker and dead-letter recovery preserve accepted receipts and unknown outcomes. Queue retries reuse one publish record and stable queue identity. Locked/failed queue removal is reported instead of silently creating replacement work. Legacy failed records without evidence of no dispatch are held for reconciliation.
- Release targets enforce transition guards and duplicate destination protection. Parent releases derive published, partially published, publishing, queued, failed, cancelled or reconciling status from targets. Reapproval after targets exist is blocked; accepted receipt evidence can repair stale terminal projections.
- Publish jobs, attempts, release records and checkpoints refresh file state and write through unique restricted temporary files and atomic rename. Invalid storage is preserved and reported rather than silently reset.
- Workers enforce canonical persisted due time even if queue payloads omit it. Telegram uses the verified destination, requires a valid message ID, distinguishes confirmed API rejection from ambiguous transport failure, and propagates transient credential verification failures. Its unsupported native scheduling method returns an explicit rejection without posting.
- Release UI shows reconciliation status and explains why automatic retries are blocked.

## Verification

| Check | Result |
|---|---|
| `npm run verify:production` | PASS: backend typecheck, 109 test files / 404 tests, production build, route inventory |
| `npm run typecheck:ui` | PASS |
| Final backend typecheck after new tests | PASS |
| ESLint on this increment's changed source/tests | PASS: 0 errors / 0 warnings |
| `git diff --check` | PASS |

The prior increment passed 104 files / 363 tests. New coverage includes receipt replay, projection-write failure, accepted receipt persistence failure, lost acknowledgement, concurrent same-process delivery, confirmed rejection retry, invalid provider IDs, owner/digest mismatches, corrupt state preservation, real worker integration with mocked queues/adapters, persisted due time, release queue recovery, transition/rollup policy, stale dead-letter protection and Telegram response semantics. All publication tests use temporary data and mocked provider boundaries. No live upload or alert was sent.

Evidence is under `implementation-evidence/publication-recovery-*`. Raw log timestamps reflect the host clock; this report date uses the supplied session date. Earlier reports remain historical evidence. Full-repository lint is not rerun or claimed passing by this increment.

## Acceptance limits and next work

1. JSON checkpoint coordination is within one Node process. Atomic rename does not provide cross-process claims, database transactions, fsync guarantees or atomic queue enqueue/event/outbox commits. PostgreSQL/object-storage migration and concurrent-process recovery remain P6 work.
2. A crash after dispatch intent but before HTTP may conservatively require reconciliation. There is no new operator resolution UI/API or provider lookup integration here. Unknown outcomes deliberately remain blocked; do not manually clear checkpoints to retry without checking the provider.
3. Queue enqueue acknowledgement ambiguity and transactional outbox enqueue remain open. Queue submission failure can leave queued local state requiring recovery. This increment does not promise exactly-once provider delivery globally.
4. Complete destination-set approval, complete lifecycle/cancellation/rescheduling policy and browser acceptance remain open. Adding a target is not yet approval of a frozen complete destination set.
5. Only Telegram's rejection proof was adapted in this increment. Other adapters with failed upload results lacking explicit rejection proof are conservatively held. Adapter normalization, refreshed credential persistence and live platform verification remain open.
6. Complete engine integrations, measured analytics/quota/cost contracts, teams/subscriptions, CI/document consistency and the original semantic-review backlog remain tracked. Structural inventory does not establish that every line has been semantically reviewed.

No deployment, production data migration, live provider test or repository cleanup was performed. Changes remain in the existing working tree for review.
