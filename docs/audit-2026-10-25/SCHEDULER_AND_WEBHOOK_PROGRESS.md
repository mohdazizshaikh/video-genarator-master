# Third implementation increment: schedules and webhook contracts

Date: 2026-10-25. A07, A08, A30 and A31 remain `implemented_unverified`: this record establishes local contracts and regression evidence, not complete browser/provider/production acceptance.

## Schedule recurrence (A31)

The persistent schedule store previously advanced every run by one hour, while the background runner tested the original publishAt forever. It now computes nextRun from the configured cron expression and IANA timezone, and both due queries and the runner consult that persisted value.

- The explicit publishAt date is the first run; it need not match the recurring cron. Timezone applies to later cron occurrences. Legacy records default to UTC and cron recurrence.
- Each completed attempt advances from actual completion time to the next strictly later cron occurrence. Missed occurrences coalesce into one attempt rather than a burst of catch-up jobs.
- A recurring failure increments failureCount and waits for the next cron occurrence. There is no separate automatic immediate retry policy in this increment.
- `recurrence: "once"` completes or fails after one attempt and clears nextRun. Explicit manual execution bypasses due time and timing variation, still requiring active status, ownership and the existing freshness gate. A finished one-shot is not automatically retried.
- Spring DST gaps shift the missing local time forward; repeated fall hours execute once. Frozen-clock tests cover both cases in America/New_York, plus UTC, Asia/Kolkata, weekly, leap-day, minute and second calculations.
- The runner still polls once per minute. Sub-minute occurrences are coalesced under that resolution; second-field parsing does not promise second-accurate dispatch.
- In-process overlapping execution of the same owned schedule is guarded. Timing variation is persisted once as nextRun plus an internal marker, survives reconstruction, and is cleared after an attempt. Pausing a deferred schedule prevents its automatic dispatch.
- Renderer unavailability and failed asset generation no longer count as successful execution. Success here means generation/enqueue succeeded; it does not certify completed rendering or publication.
- Freshness and best-time services now use shared per-workspace engine instances. HTTP updates allowlist editable fields; identity, ownership, counters and internally calculated due times cannot be supplied through PATCH.
- Store mutations perform a synchronous read-modify-atomic-rename sequence to avoid same-process interleaving. Corrupt JSON throws and is preserved. This is not a multi-process transaction or durable execution claim.
- The schedule form exposes recurrence and timezone. Its first-run input uses browser local time; default form time and UTC recommendation conversion were corrected.

cron-parser 4.9.0 is now an explicit pinned dependency. That exact version was already present in the lockfile and local dependency tree through BullMQ; no dependency was downloaded. Its public parser API avoids relying on node-cron's private matcher internals.

## Webhook and RSS follow-through (A07, A08, A30)

- Invalid webhook channels, event lists, field types, destinations and custom headers return safe HTTP 400 responses. Missing or foreign test targets return 404. Missing secret-storage configuration returns 503. Unexpected mutation/test errors expose a generic response.
- The webhook UI checks HTTP responses for load, save, delete, toggle and test operations. A failed delete or toggle cannot flow through the success handler. Existing masked secret sentinels remain preserved on update.
- Notification payloads are validated before filtering or dispatch. Secret-storage configuration is checked before notification delivery.
- Isolated legacy-storage tests verify encryption of credential-bearing URLs/headers, mode 0600, reload with the retained key, preservation of ownerless quarantined records, and unchanged legacy bytes when encryption is unavailable. Existing wrong-key tests remain in the production suite. Corrupt config/log files are not reset.
- Mocked transports verify stalled-request deadlines, oversized incoming/outgoing bodies and response-stream failures without contacting any destination.

## Verification

- `npm run verify:production`: PASS — backend typecheck, **94 test files / 325 tests**, production build and compiled route inventory.
- `npm run typecheck:ui`: PASS.
- ESLint of all source/test files changed in this increment: PASS, zero errors/warnings.
- `git diff --check`: PASS.

Evidence is saved in implementation-evidence/increment3-*.log. Exact source hashes are in implementation-evidence/increment3-source-manifest.json. Tests used temporary data directories and mocked notification/generation adapters. No real webhook notification, provider upload, production migration or deployment was performed.

## Remaining gates

Browser interaction/visual acceptance remains open. Webhook key rotation, export and rollback tooling needs an operational rehearsal; isolated migration fixtures do not constitute a production migration. Historical webhook errors are not retroactively rewritten. Cancellation integration and wider DNS/transport fault coverage remain open.

Schedule execution still lacks cross-process claims and durable crash reconciliation. A crash after enqueue but before recordRun can produce duplicate work on restart; it needs the execution identity/outbox work in P5. Ownership of scheduled output, supplementary asset persistence, review/release linkage and provider outcomes remain under C02/A22/A24. Legacy executed schedules with no usable nextRun need explicit reconciliation; their old publishAt is not reused automatically. Full-repository lint and semantic-review backlog remain open as recorded in the master tracker. No phase is declared complete by these local checks.
