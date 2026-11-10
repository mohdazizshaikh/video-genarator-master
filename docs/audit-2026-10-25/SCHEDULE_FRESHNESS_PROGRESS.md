# Scheduler freshness and renderer readiness — thirtieth increment, 10 November 2026

A scheduled video no longer records its topic as recently used when enqueue is accepted. The minute runner records freshness only after it verifies the bound render and wins the completion update. It uses the execution configuration captured at claim time when available. Ordinary SVG runs likewise record freshness after the successful output update. Freshness is advisory: if its update fails after completion, the runner logs a warning without reopening the occurrence.

When no renderer is attached, due video work remains eligible for the next tick. The runner does not claim it, increment counters, advance recurrence or record freshness.

The focused suite passed 47 tests, including regressions for recovery after renderer attachment and freshness recording once after a restarted runner verifies the render. Verification evidence: the full suite passed on retry with three workers (**764 tests, 127 files**). The first run passed all assertions but reported a Vitest worker communication timeout. Backend typecheck, production build, route consistency (353 registrations across 46 routers), and changed-file lint passed. See [verification evidence](implementation-evidence/schedule-freshness-verification.log).

Still open: freshness is a separate file write, so a crash after completion can omit that update. The manual SVG reconciliation path does not write freshness. Failed/unbound render recovery, historical receipts, cross-process authority, and browser/deployment acceptance remain open.
