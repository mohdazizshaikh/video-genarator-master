# Operator publication confirmation — 28 October 2026

Seventh implementation increment, covering part of the operator-reconciliation gap in A11. Overall remediation remains in progress.

## Implemented behavior

An operator with `release:approve`, workspace-admin or admin permission can record an observed existing publication for a held execution. `POST /api/releases/:releaseId/targets/:targetId/confirm-publication` requires:

- The current checkpoint request ID.
- A canonical external publication ID.
- A provider link or case reference (10–500 characters, no control characters).
- `verifiedOnProvider: true`, acknowledging that the operator checked the exact content and destination.

The endpoint validates owned release/target/job bindings and the approved content digest. It accepts only a checkpoint in `reconciling`; prepared, currently dispatching, rejected or unrelated requests cannot be resolved through this action. Legacy unknown outcomes without a checkpoint remain blocked.

The checkpoint saves the receipt and first observation (reference, authenticated operator name or workspace identity, server timestamp) before updating release/job/attempt projections. An identical retry by the same operator repairs a projection failure without replacing the observation or generating a second success attempt. Conflicting IDs, evidence or operators cannot overwrite an accepted observation. This action never uploads, removes/re-adds queue work or authorizes an uncertain retry.

Release details include the current execution request ID, state, attempt and observation. The UI offers held targets, asks for the publication ID/reference and explicit verification, then refreshes the published result. It displays the recorded observer and reference as text. Evidence references are not fetched, rendered as HTML or passed to a provider.

## Trust and compatibility limits

This is an **operator observation**, not an automatic provider lookup. The system cannot independently establish that the entered ID belongs to the exact publication. Approval permissions therefore control this action. The existing auth model identifies a workspace session and optional name; full per-member identity and immutable audit storage remain separate work.

No negative-outcome retry is exposed: missing search results or an operator belief that an upload failed do not prove nonacceptance. Provider lookup integrations, legacy outcome reconciliation and a safe negative-resolution workflow remain open. A held request can originate from a lost acknowledgement while remote work finishes; recording an observation does not cancel remote work. Late or conflicting provider results require operational investigation rather than an automatic resend.

Checkpoint observation persistence uses the current single-process JSON implementation, not a database transaction or tamper-proof audit log. Queue/event/outbox transactions and concurrent-process claims remain open. Browser interaction acceptance remains open; UI regression coverage currently includes static rendering plus TypeScript/build checks.

## Verification

| Check | Result |
|---|---|
| `npm run verify:production` | PASS: backend typecheck, 109 test files / 419 tests, production build and route inventory |
| `npm run typecheck:ui` | PASS |
| Changed-source/test ESLint | PASS: 0 errors / 0 warnings |
| `git diff --check` | PASS |

Raw logs retain host timestamps; report date follows the supplied session date. Final command results and source hashes are recorded under `implementation-evidence/operator-reconciliation-*`. Regression tests cover permission/tenant/request checks, missing checkpoints, explicit provider-verification acknowledgement, invalid IDs/evidence, disallowed request states, conflicting confirmation, replay without upload and failure after receipt persistence.

No live provider calls, alerts, migrations or deployments were performed. No phase is declared complete, and full-repository lint is not claimed passing.
