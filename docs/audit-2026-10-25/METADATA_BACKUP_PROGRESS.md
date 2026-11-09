# Metadata backup safeguards — seventeenth increment

The metadata migration backup helper now fails closed for missing arguments, malformed/empty manifests, malformed entries, unsafe paths, duplicate paths, missing/extra files, checksum/size mismatches and static symlinks. Read descriptors use no-follow/nonblocking flags and require regular files. Path validation rejects traversal, absolute paths, empty segments, Windows separators/drive forms and reserved root manifest paths. The complete backup inventory is compared to manifest entries before payload verification.

Creation copies raw JSON, including damaged JSON, under unique owner-only staging directories. Nested directories use 0700 and files use 0600. Source JSON names and file hashes are rechecked before publication; the staging backup is itself verified before rename. Previous backup directories are never deleted. On failure, cleanup is restricted to this invocation's staging directory. Tests inject final rename failure and changed source bytes to check failure cleanup and preservation.

The source policy includes nested JSON, including tenant-state owner markers. Only root backups/ and bundled libs/whisper/ are excluded; unrelated nested directories called backups are included. Non-JSON files, .env and artifact binaries are outside metadata scope. Custom output beneath the source tree is blocked except the default root backups/ directory.

## Acceptance limits

This is static path and file-integrity hardening. Backup creation still requires frozen, trusted source/output directories: repeated inventory/hash checks do not create an atomic snapshot, prevent all concurrent ancestor-directory replacement races or fsync data to stable storage. SHA-256 manifests are unsigned; changing both a file and its manifest can pass, as an explicit test demonstrates. Verification cannot prove an originally omitted source file existed. Empty source inventories fail rather than produce vacuous success.

Raw JSON may contain tokens, plaintext legacy credentials and tenant content. No encryption, redaction, off-host replication, retention system, artifact-object backup, restore executor or restore rehearsal is implemented here. Flags explicitly report encrypted:false and restoreRehearsed:false. Legacy empty manifests are now rejected. Existing backups with the documented format, metadata fields, safe paths and complete regular-file inventories remain verifiable.

The separate full backup/restore scripts remain outside this increment and require their own review. No actual repository-data backup, restore, migration, provider request or cutover was performed. All write/failure tests operate in temporary directories. Production runtime authority remains file-backed; no phase is complete.

## Verification

- Production verification passed backend typecheck, **576 tests across 118 files**, production build and AST/build consistency for **351 route registrations in 46 routers**.
- Focused backup regressions: **30 passed**.
- Changed backup script/test ESLint and scoped whitespace checks passed. Full-repository lint remains an open baseline.
- Logs and source hashes are saved under `implementation-evidence/metadata-backup-*`. No real-data backup payload is included in these artifacts.
