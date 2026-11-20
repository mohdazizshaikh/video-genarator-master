# Schedule store integrity — thirty-fourth increment, 21 November 2026

Schedule persistence now uses the shared exclusive initializer and private atomic writer. Existing empty or malformed files are never reset. Reads reject invalid row shapes, missing/duplicate schedule IDs, invalid explicit workspace IDs, unsafe or negative counters, and malformed execution identities/states/counters. Errors are generic and do not echo raw JSON payloads.

Valid ownerless legacy rows remain preserved and excluded from tenant views and due dispatch. No ownership is inferred, no invalid execution is cleared, and no corrupt row is silently dropped. All store mutations read and validate before replacement. Failed replacement preserves the prior file and removes UUID staging.

Verification passed: **788 tests across 129 files**, 38 focused tests, backend typecheck, production build, route consistency (353 registrations / 46 routers), changed-file lint and whitespace checks. Eleven new temporary-directory cases cover damaged bytes, identity/counter/execution validation and failed replacement cleanup. See [verification evidence](implementation-evidence/schedule-store-verification.json). No provider or real application data operation was executed.

Validation is targeted at identity/counter/execution safety, not a complete schema for every optional schedule/output field. Runtime provenance reconciliation, cross-process transactions, fsync guarantees, browser/deployed recovery and failed/unbound render resolution remain open. No phase is complete.
