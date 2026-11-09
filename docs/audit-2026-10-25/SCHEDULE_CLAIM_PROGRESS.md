# Schedule occurrence claims — twenty-third increment, 29 October 2026

The persistent ScheduleRouter now records an execution claim before starting asset persistence or video enqueue. The claim lives with its schedule and binds a UUID token to the workspace-scoped schedule, expected run counter and due timestamp. Synchronous read/modify/rename prevents two independent router/store instances in one process from starting the same observed occurrence. A stale snapshot, mismatched owner/version, pending claim or held execution cannot acquire a new claim.

## Terminal outcomes and uncertainty

Successful producer binding and schedule counters advance under the matching claim token in one schedule-file replacement. Repeating that completion token is idempotent. Wrong tokens/owners are rejected, and a generic recordRun call cannot advance a pending claimed occurrence. Pre-producer validation failures remain ordinary failed attempts. Known in-memory generation failures with no file/queue effects can finish the claim as failed.

Once asset persistence or enqueue may have acted, an exception puts the claim into reconciling state with any collected output receipt. The runner does not advance the occurrence or retry it automatically. A restart preserves both orphaned claimed states and reconciling states; no timeout/lease expiry converts an uncertain outcome into permission to enqueue again. Finished claims cannot be downgraded by a later hold request.

The schedule UI reports in-progress/awaiting-recovery or reconciling states and disables the immediate-run button while the occurrence is held. Caller patches and pause/resume do not remove the server-owned claim. There is no force-release or outcome-resolution endpoint in this increment; a separately reviewed reconciliation workflow remains necessary.

## Migration gate

Readiness now includes schedules.json in its unmapped-namespace gate. Clean JSON ownership alone cannot admit schedule receipts/claims to SQL cutover without an implemented mapping. No migration or database/object-store connection occurred.

## Remaining acceptance and limits

These file-mode claims coordinate instances within one Node process and survive restarts. They are not a cross-process compare-and-swap, database lock or distributed exactly-once guarantee. Multiple operating-system processes still require transactional durable authority. Application crashes can interrupt producer-to-receipt binding; the design holds rather than guesses the outcome. Operator resolution, historical executions, cancellation/deletion/edit races, cross-store transactions and a complete recovery runbook remain open. The record is not a fully frozen snapshot of every schedule setting.

Video completion is still not reconciled from the renderer; successful video claims mean the enqueue receipt was recorded, not that rendering, approval or publishing finished. One-shot status and counters retain the dispatch semantics documented in the previous increment. Unknown enqueue outcomes are now held instead of advancing and permitting another occurrence. No actual application schedule or provider operation was executed; tests use temporary data and local enqueue stubs. No phase is complete.

## Verification

Final full suite passed **706 tests across 123 files**. Focused scheduler/migration guards passed **41 cases**, including six new claim/mapping cases. Production verification passed backend typecheck, production build and AST/build consistency for **352 registrations across 46 routers**; its 705-test run preceded the additional schedule mapping-gate case, which is included in the final 706-test run. Changed-source/test ESLint and scoped whitespace checks passed; full-repository lint remains an open baseline. Browser interactions and real process-kill/queue recovery were not exercised. Evidence logs and source hashes are under `implementation-evidence/schedule-claim-*`.
