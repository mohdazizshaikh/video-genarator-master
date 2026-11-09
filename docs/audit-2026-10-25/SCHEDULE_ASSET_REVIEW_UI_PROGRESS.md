# Schedule asset review interface — twenty-fifth increment, 29 October 2026

The persistent scheduler page now displays pending image downloads and an operator review panel for held asset executions. Confirmation is offered only for reconciling executions with a captured asset-only contract, a complete checkpoint and unique artifact IDs. Active claims, partial outputs, videos and missing contracts show a recovery-review message instead. The server remains authoritative for permission, ownership and byte-integrity checks.

Operators inspect each pending output using the existing authenticated download route, enter an evidence reference and explicitly attest that every expected result was inspected. The action posts the captured execution ID and evidence to the confirmation endpoint through authenticatedFetch. Empty, oversized, multiline or unverified evidence cannot be submitted through the request helper. The control disables while submitting and after successful confirmation, and refreshes schedules after success. Recorded reconciliation evidence and authenticated operator identity are visible on the schedule card, with React text escaping.

Permission failures explain the missing reconciliation permission; conflicts ask the operator to refresh and inspect the current outputs. Other HTTP failures remain errors rather than becoming apparent success. The UI does not grant permissions, invoke a producer, force-release a claim or approve publication. The panel is visible to workspace viewers; the server requires the privileged reconciliation permission for its mutation.

## Verification

Production verification passed backend typecheck, **723 tests across 125 files**, production build and AST/build consistency for **353 registrations across 46 routers**. UI typecheck, changed-file ESLint and scoped whitespace checks passed. Eight new regressions cover review visibility, initially disabled confirmation, unsupported states, escaped recorded evidence, exact authenticated request binding, invalid evidence and HTTP 403/409/500 handling. The focused eight-test suite also passed after replacing the control-character regex with equivalent character-code validation for ESLint. Evidence and source hashes are under `implementation-evidence/schedule-asset-review-ui-*`.

UI checks use static React rendering and mocked authenticated requests; they do not constitute a browser interaction or visual acceptance test. The production test run started before the equivalent lint-only validation rewrite; focused tests and UI typecheck cover the final source, and the production build completed afterward. No real provider, application schedule or production data was modified.

## Remaining work

Video completion reconciliation, orphaned/unbound outcome recovery, transactional cross-process storage, cancellation/edit/deletion races, full configuration snapshots, historical executions and deployed recovery acceptance remain open. A claimed execution awaiting restart recovery cannot be confirmed through this panel until a separate reviewed workflow resolves its active/unknown state. Full-repository lint remains an open baseline. No phase or overall audit is complete.
