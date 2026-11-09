# Migration dependencies and guarded readiness — 28 October 2026

Twelfth implementation increment, addressing the load/guard portion of A13 and related P6 safety gaps. Runtime PostgreSQL/object-store authority is **not implemented or activated** by this increment.

## Dependencies and non-executing paths

The required `pg` (8.23.1) and `@aws-sdk/client-s3` (3.1158.0) packages are now explicit exact dependencies in the pnpm lockfile. Their modules load in an isolated smoke test without constructing clients. Frozen-lock installation passes with lifecycle scripts disabled and the local package cache.

SQL and artifact migration execution SDKs are dynamically loaded only after preconditions pass. Missing execution/approval/configuration gates return structured blockers even when SDK modules do not exist beside the command. No database/object-store connection is opened on those blocked paths. The tests copy scripts into temporary projects without SDK modules to prove this behavior.

## Corrected readiness and execution checks

- Approval flags must equal the literal string `true`; a nonempty `false` is no longer accepted.
- Primary-read authority safety is included in the final readiness decision. Enabled cutover, missing data directories and malformed local checkpoints block readiness.
- Current content-version, connector/secret, release, artifact/execution and tenant-state namespaces are explicitly reported as requiring reconciliation coverage. They are not silently treated as platform-shared data. Presence of those namespaces blocks migration readiness until their ownership/schema/secret handling is implemented. No generic environment override was added for this gap.
- The SQL runner takes a session-wide advisory lock **before** reading migration checkpoints, preventing another instance of this runner from using a stale pre-lock checkpoint snapshot. Per-migration transactions/checksums remain; failure rolls back and closes/releases the runner lock. Error output uses a bounded phase/code and generic message instead of raw connection-error text.
- Artifact validation resolves source realpaths before containment checks, rejecting symlinks escaping the configured data root. Duplicate IDs/object keys, invalid key segments and sanitized owner-prefix collisions block execution instead of overwriting or mixing identities.
- Artifact upload output reports `metadataVerified` and `contentVerified: false`. A HEAD response containing the supplied checksum metadata is not claimed as independent verification of stored object bytes. Local files remain authoritative and are not deleted.
- Migration-script lint now has explicit Node globals; source lint rules were not waived.

## Verification

| Check | Result |
|---|---|
| Frozen pnpm lock install, offline and scripts disabled | PASS |
| `npm run verify:production` | PASS: backend typecheck, 114 files / 495 tests, production build and AST route/build consistency |
| Final migration guard regressions | PASS: 15 tests, including final checkpoint/manifest validation changes |
| Changed scripts/test ESLint | PASS: 0 errors / 0 warnings |
| `git diff --check` | PASS |

No UI implementation changed in this increment. The route gate checks 351 registrations across 46 router files. Raw timestamps retain the host clock; report date follows the supplied session date. Evidence and source hashes are under `implementation-evidence/migration-guards-*`. Fifteen new regression cases cover absent SDK guard paths, false approvals, unsafe cutover, checkpoint integrity, source presence, namespace coverage, symlink escape, duplicate/prefix collisions, runner lock ordering/contention, rollback, secret-safe failures and SDK module loading.

The successful SQL-execution test uses a **fake `pg` package in a temporary project**, logs its query ordering and opens no database socket. It does not establish PostgreSQL compatibility or apply production SQL. No real migration, S3 upload, deployment, ownership assignment or primary-read cutover occurred.

## Remaining P6 work

1. Implement and select actual PostgreSQL/object-storage runtime repositories, schema/tenant constraints and transactional claims/event/outbox/enqueue behavior. Application authority remains file-backed.
2. Add complete reconciliation for all current top-level and tenant-state namespaces, including workspaceId records, derived publish-attempt ownership, encrypted secrets, execution checkpoints and immutable approvals. Current readiness intentionally cannot approve ordinary datasets containing uncovered namespaces.
3. Validate actual PostgreSQL/MinIO integration, concurrent processes, checkpoint replay, backup/restore and rollback drills. Local readiness is structural/configuration gating, not proof of connectivity or service correctness.
4. Independently verify object bytes and protect migration sources against concurrent modification between validation and upload. Metadata-only checks and realpath validation do not establish immutable snapshot or TOCTOU protection.
5. Complete migration provenance/approval evidence and controlled cutover acceptance. Existing SQL/schema compatibility, lock behavior with older runner versions, and deployed service configuration remain unverified here.

No phase is declared complete. Full-repository lint and the original semantic-review/browser/provider acceptance backlogs remain open.
