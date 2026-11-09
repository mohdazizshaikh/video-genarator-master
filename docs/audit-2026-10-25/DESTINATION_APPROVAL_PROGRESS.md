# Destination-bound release approval — 28 October 2026

Sixth implementation increment, addressing the destination-scope portion of A12. Overall remediation and complete-project acceptance remain in progress.

## Behavior

The approval endpoint now requires 1–50 unique connector/destination pairs. It resolves these to owned connected connectors and verified destinations, then saves their platform, external account identity and external destination identity alongside the existing approved content snapshot. Caller-supplied provider identities do not define approval authority.

Target creation rejects destinations outside the approved set. Queueing and worker dispatch require matching current provider identities and valid connector/destination status. Workers check again after asynchronous credential validation and progress updates, before claiming a provider request. A changed identity cannot silently redirect an approved publication. Existing accepted receipts still replay before credential and destination checks: confirmation of an earlier publication remains a fact.

The Releases page lets an operator include verified destinations before approving content and destinations together. It displays the approved destinations and permits target creation only within that set. Queuing choices omit legacy unbound targets and failed targets without recorded retry proof.

## Compatibility

- API clients must send `destinations: [{ connectorId, destinationId }]` to `POST /api/releases/:releaseId/approve`.
- Existing approvals without a destination snapshot cannot add targets, queue or begin a provider upload through the server/worker path. With no existing targets, the UI permits approval of content and selected destinations. With existing targets, create a new release; the approval lock is retained.
- Low-level file-store compatibility methods still read/create legacy unscoped records for existing fixtures/data. These records do not acquire dispatch authority. No production record is silently migrated or assigned an approval scope.
- The approved set is an allowed destination set. Creating a target does not automatically enqueue it, and not every approved destination must be targeted. Changing scope after targets exist requires a new release.

## Verification

| Check | Result |
|---|---|
| `npm run verify:production` | PASS: backend typecheck, 109 files / 411 tests, production build and route inventory |
| `npm run typecheck:ui` | PASS |
| Changed-source/test ESLint | PASS: 0 errors / 0 warnings |
| `git diff --check` | PASS |

See `implementation-evidence/destination-approval-*` for final command output and source hashes. Full-repository lint is not claimed passing. Raw logs retain host timestamps; report date follows the supplied session date. New regression cases cover approval permissions, omitted/empty/duplicate/foreign/malformed destination inputs, persisted provider identity, unapproved target rejection, approved target creation, reapproval lock, legacy queue rejection and changed provider account/destination rejection before dispatch (including during credential validation).

No live posting, external notification, migration or deployment was performed. Tests use temporary stores and mocked queue/provider boundaries. Existing UI tests render the shell; interactive browser acceptance is still open.

## Remaining acceptance gaps

Cross-process transaction/claim correctness, transactional queue/event/outbox commits, manual/provider reconciliation tooling, complete cancellation/rescheduling policy and live provider/browser acceptance remain open. Provider account verification depth depends on the connector verification workflow; approval does not independently prove provider permissions. Full adapter normalization and the original semantic-review backlog remain tracked. No phase is declared complete.
