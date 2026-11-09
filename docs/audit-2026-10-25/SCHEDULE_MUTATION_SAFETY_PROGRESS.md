# Schedule mutation safety — twenty-sixth increment, 29 October 2026

Unresolved schedule executions now retain their configuration and recovery record. Both tenant-scoped and internal store update/delete paths check the current persisted execution within the same synchronous read/modify/replace operation. Claimed and reconciling executions reject configuration changes, deletion and caller-supplied completed/failed status. The API returns 409 for owned conflicts and retains 404 for foreign schedule IDs.

Pause and resume remain available and preserve the execution token, checkpoint and counters. Pausing controls future dispatch; it does not cancel a producer already running or resolve an unknown outcome. Generic store patches discard execution, last-output, run-count, failure-count and last-run fields so only dedicated execution methods can write them. After execution completion, ordinary edits/deletion remain available; the stored execution snapshot retains the configuration of that past dispatch while it exists.

## Configuration at claim acquisition

Every new claim stores a detached configuration snapshot covering the name, video ID, platform/category/language selections, engines, quality, recurrence/timezone/timing and metadata. The runner supplies a digest of its observed configuration when acquiring the claim. If another store edits that configuration before acquisition, the claim is rejected before producer dispatch. Counter, owner, due-time and pending-execution checks remain in place. Legacy direct claim callers may omit the expected digest, but still capture the current persisted configuration; the router always supplies it. Existing claims without snapshots are preserved rather than reconstructed from mutable settings.

The scheduler UI disables deletion while an execution is unresolved, explains that pausing is not cancellation, and surfaces failed status/delete requests instead of silently ignoring their HTTP status. Server checks remain authoritative for stale browser views and direct API callers.

## Verification and remaining limits

Production verification passed backend typecheck, **727 tests across 125 files**, production build and AST/build consistency for **353 registrations across 46 routers**. Focused scheduler verification passed **39 tests across four files**. UI typecheck, changed-file ESLint and scoped whitespace checks passed. Full-repository lint remains an open baseline. Logs and source hashes are under `implementation-evidence/schedule-mutation-safety-*`.

New temporary-directory regressions exercise both unresolved states, independent store instances, API conflicts, foreign-owner concealment, pause/resume preservation, stale configuration rejection, detached historical snapshots, permitted post-completion edits/deletion, forged generic fields and a router edit-before-claim race with zero enqueue calls. No actual application schedule or provider operation was executed.

This is same-process file-mode coordination, not a database transaction across server processes. Real cancellation, historical execution retention, completed queued-video deletion policy, renderer completion reconciliation, process-kill recovery, cross-store transactions and browser acceptance remain open. Pre-claim validation/freshness bookkeeping and timing deferral are not converted into a full versioned transaction in this increment. No phase or overall audit is complete.
