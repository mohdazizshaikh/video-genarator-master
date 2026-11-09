# Schedule asset reconciliation — twenty-fourth increment, 29 October 2026

Held SVG asset executions can now be positively confirmed from their persisted producer checkpoint without invoking generation again. Each new claim captures its expected asset count and whether it expects a video. Asset receipts are checkpointed after each persisted asset, and video IDs after enqueue returns. Pending assets are available through the existing owned, integrity-checked output download route for inspection.

## Operator contract

POST `/api/schedule/:id/confirm-assets` requires workspace authentication and one of `schedule:reconcile`, `workspace:admin` or `admin`. The body contains `executionId`, a nonempty bounded `evidenceReference`, and `verifiedOutcome: true`. The operator identity comes from authenticated claims. Missing permission returns 403, foreign schedules 404, invalid input 400 and unverifiable outcomes 409.

The service accepts only the exact complete asset checkpoint already bound to the execution. It checks unique artifact identities, active workspace ownership, generated SVG type, manifest/receipt agreement, tenant-directory containment, regular files, bounded size and SHA-256 bytes. A final checkpoint digest and execution-token check protects the terminal store update from stale verification. Confirmation advances counters and records the evidence reference, operator, time and checkpoint digest together. Repeating the same confirmed evidence is idempotent; changing it is rejected. Checkpoint updates preserve prior artifact prefixes and video identity, preventing rebinding.

No caller-supplied artifact adoption, producer invocation, publication approval, force release or negative-outcome retry is provided. Partial outputs, orphaned claims, legacy claims without a captured producer contract and all video outcomes remain blocked. A crash between an external effect and its checkpoint can still leave an unbound outcome requiring a separate recovery workflow.

## Verification

Production verification passed backend typecheck, all **715 tests across 124 files**, production build and AST/build consistency for **353 registrations across 46 routers**. Focused scheduler verification passed **34 tests**; changed-file ESLint and scoped whitespace checks passed. Nine reconciliation regressions cover restart confirmation, idempotence, permissions, tenant isolation, partial output, byte/path/owner tampering, missing intent, video rejection, stale digests and append-only checkpoints. Evidence logs and source hashes are in `implementation-evidence/schedule-asset-reconciliation-*`.

Tests use temporary data and local producer/queue stubs. No application schedules, provider operations or production data were modified. Browser acceptance, an operator UI, real process-kill recovery and deployed acceptance remain open. File-mode coordination is limited to one Node process; transactional cross-process authority, frozen full configurations, historical executions, cancellation/edit/deletion races and renderer completion reconciliation remain open. Full-repository lint remains an open baseline. No phase or overall audit is complete.
