# Input safety batch — thirty-fifth increment, 21 November 2026

Three related tasks were implemented in parallel, then reviewed together.

## Schedule mutation contracts

New schedule creates and updates validate required identity/configuration shapes before persistence. Scope arrays contain nonempty strings; engine flags are booleans; quality values are finite and tier values recognized; metadata has the expected basic shape. Whitespace workspace creation is rejected. Generic create/update inputs cannot install server execution receipts, counters, last-run values or timing markers. Minimal valid configuration and readable ownerless legacy rows remain supported. Dedicated execution/deferral methods retain authority over their fields.

## Content version contracts

Create and draft editing share basic validation for nonempty title/script/signature, scene arrays, plain metadata objects and nonempty source strings. Create checks workspace identity. Rejected input preserves persisted bytes. Draft lookup/approval checks retain workspace visibility and approved-release immutability. Scene internals, source URL fetch policy and a complete metadata schema are outside this validation.

## Scheduler response handling

The scheduler UI now checks HTTP and application-level status before accepting list/stats/run responses. Failed dashboard loads retain the page's last good state rather than replacing it with an empty schedule list. Manual-run failures show a refresh/review message instead of silently clearing the busy state; lost responses are never automatically retried. Accepted dispatch remains distinct from verified output completion. Envelope checks do not constitute a full frontend model schema.

Verification passed: **832 tests across 132 files**, backend and UI typechecks, production build, route consistency (353 registrations / 46 routers), changed-file lint and whitespace checks. The batch adds 44 regression cases: 17 schedule, 20 content-version and 7 UI request cases. Independent focused suites passed 60 schedule-related tests, 57 content-version/release tests and 7 UI request tests (overlapping legacy tests are not additive coverage). See [verification record](implementation-evidence/input-safety-batch-verification.json).

Tests use temporary files or mocked authenticated fetch. No real provider, live application schedule or production-data operation was run. Durable cross-process storage, unknown-render recovery, complete schema validation, browser interaction/visual acceptance and deployed verification remain open. No phase or overall audit is complete.
