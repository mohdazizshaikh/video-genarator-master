# Scheduler cooldown deferral — thirty-first increment, 20 November 2026

Freshness blocks now postpone the same occurrence instead of recording a failed attempt and consuming its recurrence. Counters, status and execution history remain unchanged. The retry time uses the reported positive finite cooldown, capped at seven days with a one-second minimum; missing/invalid values fall back to one minute.

The synchronous store mutation checks the workspace, active status, run counter, observed due time, configuration digest and absence of unresolved execution. A stale cooldown cannot overwrite an intervening edit, pause, claim or newer retry time. Deferred one-time work stays active until it can dispatch.

Verification passed: **766 tests across 127 files** on a two-worker retry, 37 focused scheduler tests, backend typecheck, production build, route checks (353 registrations / 46 routers), changed-file lint and whitespace checks. The initial run had one existing ShortCreator readiness-poll failure; the assertion was retained unchanged. See [verification record](implementation-evidence/schedule-cooldown-verification.json).

These are same-process JSON guards, not cross-process compare-and-swap transactions. Manual dispatch honors freshness and may persist the retry time. Invalid generation configuration remains a separate failed-attempt path. Durability, advisory freshness consistency, failed/unbound outcome resolution and browser/deployed acceptance remain open.
