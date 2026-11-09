# Full backup and recovery — eighteenth increment

Both full archive verification entry points now use `scripts/full-backup-integrity.mjs`. Extraction no longer delegates unvalidated archives to tar. The reader validates USTAR header checksums, octal sizes, safe paths, unique entries, regular-file/directory types, payload boundaries, terminating zero blocks and trailing content before completing extraction. Links, devices, FIFO entries and extended TAR records are rejected. Gzip output is streamed with a 100 GiB limit; entries are capped at 100,000. Extracted files use mode 0600 in private 0700 directories.

Manifest validation requires a nonempty array, safe unique payload paths, SHA-256/size checks, exact file inventory and matching declared totals. The optional sidecar must have valid SHA-256 syntax and match the archive. Invalid gzip, truncated TAR, malformed JSON, bad checksums and unsafe paths produce generic structured failures without raw archive content or command stderr. Archive hashes and encrypted payloads are read through local tools/files only.

## Backup publication

Full backups now request USTAR explicitly, use UUID archive names, build archive/encrypted output privately, verify the complete archive before publication and only then apply retention. Plaintext intermediate archives remain inside private staging and are removed during cleanup. Published archives use 0600 permissions. Source JSON/media names and hashes are rechecked after staging; source symlinks/special files are rejected, `.env` files excluded and nested source output blocked. Existing declared temp/cache/backups/libs exclusions remain. Retention ignores symlink candidates.

## Restore publication

Restore copies the fully verified payload into a private sibling directory and rechecks copied sizes/hashes before moving any existing target aside. A canonical live-directory check covers aliases and related paths; an explicit target is required and filesystem-root/symlink targets are rejected. Nonempty targets require force. Missing explicit argument values fail closed. Existing target directories are retained under UUID rollback paths, including empty targets. All restored payload files use 0600 rather than trusting archive modes. Successful staging publishes by rename. If publication fails, rollback is attempted; if that also fails, structured output identifies the preserved recovery directory. Failure cleanup removes staging, not retained original target data.

## Compatibility and acceptance limits

This reader accepts a restricted USTAR subset. New backups use that subset. Older PAX/GNU extended/sparse archives and long names or large individual files requiring those extensions are rejected; compatibility support needs its own tested implementation. This is a deliberate fail-closed compatibility limit, not full TAR format coverage. External `tar` creation and OpenSSL encryption/decryption remain runtime dependencies.

The existing encrypted format remains AES-256-CBC/PBKDF2 and does not provide authenticated encryption. Optional SHA-256 sidecars and embedded manifests are unsigned and cannot authenticate a rewritten archive. Off-host replication, signed inventories, key recovery, fsync durability, atomic frozen-source snapshots, cross-process adversarial directory-race resistance, deployed recovery times and database/Redis recovery remain open. Trusted quiescent source/output directories are required. The container pause option is unchanged and was not invoked.

Tests rehearse recovery only in isolated temporary directories, using fixture JSON and media bytes. They do not establish production RPO/RTO or recovery of real credentials, providers, queues or external services. No actual project-data backup/restore, migration, deployment or provider operation occurred. Runtime remains file-backed; no phase is complete.

## Verification

- Final full test suite: **618 tests across 119 files passed**, including **42 full-backup/recovery cases**.
- Production verification passed backend typecheck, production build and AST/build consistency for **351 registrations across 46 routers**. That run had 608 tests before additional malformed-TAR, copied-target-integrity and missing-argument cases were added; the final 618-test run includes them.
- Changed scripts/test ESLint and scoped whitespace checks passed. The Node-global lint scope now includes these three script files. Full-repository lint remains an open baseline.
- Fixtures cover plaintext/encrypted round trips, absent/wrong passphrases, unsafe paths, special/link/extended records, duplicate entries, malformed manifests/totals/checksums, gzip/TAR corruption, source and target guards, retained rollback data, injected copy/publication/rollback failures and corrupted copied target bytes.
- Logs and source hashes are saved under `implementation-evidence/full-backup-recovery-*`. These artifacts contain no real backup payload.
