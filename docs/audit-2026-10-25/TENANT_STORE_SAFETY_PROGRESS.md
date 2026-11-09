# Workspace profile persistence — twenty-first increment

TenantStore no longer treats malformed/blank JSON as an empty workspace list or overwrites it during reads. It uses the existing exclusive initializer and atomic JSON-array replacement helper. Container/row shapes and nonempty unique profile IDs are checked before returning records or mutating the file. Existing invalid files remain untouched and require explicit recovery. New/replaced files use mode 0600.

## Same-process updates and bootstrap

Public methods remain asynchronous for caller compatibility, while each read/modify/replace sequence executes synchronously without yielding. Independent instances read fresh state and preserve interleaved profile, encrypted-key, engine and quota updates. Duplicate explicit IDs are rejected. Concurrent workspace bootstrap requests catch only the typed identity conflict, reread the winning owned profile and converge on the same response data rather than creating duplicates.

Tenant API handlers now catch rejected operations under Express 4 and return a generic 503 WORKSPACE_OPERATION_UNAVAILABLE response without raw parser content or credentials. This prevents a newly surfaced storage error from becoming an unhandled route rejection. Authentication/admin middleware still precedes the handlers; cross-workspace guards are retained.

## Credential response boundary

Profile sanitization now masks both encrypted and legacy plaintext provider key fields. Previously, the legacy apiKeys map was spread into responses unchanged. List/get/bootstrap/update responses use the same sanitizer; the new regressions prove legacy fixture values and ciphertext are absent from list/get output while source bytes retain the original legacy record for separately reviewed migration.

## Limits and remaining work

This is same-process coordination with atomic file replacement, not cross-process locking, transactional durable repositories, fsync guarantees or an atomic transaction across profiles/auth/usage. Synchronous I/O can block the event loop for large datasets; durable asynchronous storage remains the intended authority. Validation checks identities and basic container/row shapes, not every profile field.

Legacy plaintext update methods remain internal compatibility APIs and persisted plaintext is not automatically encrypted, reassigned or deleted. Public managed-key routes continue to encrypt updates; migration inspection still blocks plaintext credentials. Other store corruption policies, entitlement/team/billing workflows and deployed data recovery remain open. The 503 response is deliberately generic and does not repair or quarantine records. No actual application records were migrated or edited by this increment; write tests use temporary directories. No phase is complete.

## Verification

Production verification passed backend typecheck, **688 tests across 121 files**, production build and AST/build consistency for **351 registrations across 46 routers**. Focused profile/security regressions passed **36 tests**, including **14 new cases**. Changed-source/test ESLint and scoped whitespace checks passed. Full-repository lint remains an open baseline. Logs and source hashes are under `implementation-evidence/tenant-store-safety-*`.
