# Source-store safety — fourteenth increment

News sources and automation rules now reject malformed, empty and non-array files without resetting them. New stores are created exclusively; writes replace the file through a unique temporary file with mode 0600. Reads remain fresh across instances. Replacement failures preserve the previous file and remove temporary files.

Feed duplicate checks are scoped to the explicit workspace, including a separate legacy unowned scope. URL normalization preserves path/query case, normalizes host/default ports, ignores fragments and retains the existing trailing-path-slash equivalence. Source IDs use UUIDs to avoid timestamp collisions.

Eight new regression cases cover damaged-file preservation, tenant separation, case-sensitive URLs, interleaved instances and failed replacement. Existing source duplicate contracts are retained. Verification results are recorded below.

Limits: coordination is synchronous within one process, not a cross-process transaction or fsync durability guarantee. Row validation rejects invalid container/row shapes but does not certify every field. Existing files and ownership records were not migrated. The eight unreviewed legacy-store policies, TenantStore corruption/race behavior, SQL mappings and full recovery acceptance remain open. No phase is complete.

Verification: `npm run verify:production` passed backend typecheck, 517 tests across 116 files, production build and AST/build consistency for 351 route registrations in 46 routers. Changed-file ESLint passed. Full-repository lint remains an existing open baseline. Logs and source hashes are in `implementation-evidence/source-store-safety-*`. The initial full-suite run exposed the trailing-slash compatibility expectation; the corrected final run passes.
