# Migration review helpers — sixteenth increment

The remediation planner and reconciliation decision validator now use the shared read-only ownership inspector. The planner preserves classifications, hashes and issue locations for wrapped, derived, directory-scoped and legacy stores. It no longer treats every array as a tenantId array, and a file-level mapping proposal cannot remove source blockers.

The decision validator derives its flat missing-owner/malformed-file expectations from inspector findings. Unresolved relationship, registry, namespace and provenance issues remain blockers even if an owner proposal has a valid signature. This is proposal validation only; no assignments, quarantine or data writes occur. Version 1 decisions still lack full collection/issue identities and source-hash binding, and cannot serve as an execution authorization.

Signature validation rejects non-hex, wrong-length, Unicode and incorrect signatures without throwing from timingSafeEqual. Manifest parse errors no longer echo raw parser content. Evidence validation now requires actual equality of sourceHash and durableHash in addition to the asserted match flag, plus valid string operator/timestamp metadata. A valid HMAC authenticates the supplied assertions under the configured key; it does not prove a backup, restore, service connection or isolation exercise occurred. Evidence is not wired into automatic cutover.

The migration runbook now records current reconciliation findings, the session/transaction lock sequence, raw-JSON credential exposure and the limits of backup verification. The backup helper itself is still open for namespace, traversal/symlink, encryption and restore hardening; this increment does not claim those fixes.

## Current read-only result

The planner agrees with shared inspection: 32 JSON stores, 3 legacy provenance findings, 2 missing owners and 9 store-level registry mismatches. Its exit status is 2 (blocked). Source hashes match the prior 32-store inspection. No application source data was changed.

## Remaining work

Production authority remains file-backed. Full decision identity/hash contracts, provenance resolution, migration mappings, backup/restore hardening and real database/object-store recovery acceptance remain open. No phase is complete.

## Verification

`npm run verify:production` passed backend typecheck, **546 tests across 117 files**, production build and AST/build consistency for **351 registrations across 46 routers**. The 13 new isolated child-process tests cover valid signatures, signed unequal hashes, malformed/Unicode signatures, invalid metadata, derived ownership, unresolved blockers, mapping proposals, malformed manifests, missing directories and symlinks. Changed scripts/test ESLint and scoped whitespace checks passed. Full-repository lint remains an open baseline. Evidence logs, metadata-only workspace report and source hashes are saved under `implementation-evidence/migration-review-helpers-*`.

Backup command output text was also corrected to describe raw-JSON secret exposure; its copying/verification implementation is unchanged. No actual backup or restore was executed in this increment.
