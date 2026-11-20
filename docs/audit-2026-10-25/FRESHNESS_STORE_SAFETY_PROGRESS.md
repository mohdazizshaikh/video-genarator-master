# Freshness store safety — thirty-second increment, 21 November 2026

The freshness engine initializes only new files and reloads persisted rows before checks, recent-category reads and writes. Independent instances no longer retain stale cooldown snapshots or overwrite each other's history inside one process. Atomic private UUID staging replaces direct writes; errors are surfaced rather than silently ignored.

Invalid JSON/row shapes, empty fields, noncanonical keyword case, invalid dates, unsafe counters and duplicate topic/category identities block reads and writes without resetting the file. No row is repaired or assigned automatically. Scheduler freshness-read failures leave the occurrence due without producer dispatch, counters or a claim; completed-output advisory write failures remain warnings.

Verification passed: **774 tests across 128 files**, 36 focused tests, backend typecheck, production build, route consistency (353 registrations / 46 routers), changed-file lint and whitespace checks. Temporary-directory tests cover invalid-file preservation, independent writer freshness and replacement failure cleanup. The scheduler regression verifies no claim/dispatch/counter change on an unreadable freshness check. See [verification record](implementation-evidence/freshness-store-verification.json). No live provider or production data operation was performed.

Same-process file replacement is not a distributed transaction or fsync guarantee. Completion and freshness are still separate writes. Existing damaged histories need operator review; no automatic retry/cancellation of unknown renders, full retention redesign or browser/deployed acceptance is included. No audit phase is complete.
