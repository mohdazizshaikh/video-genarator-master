# Full backup authentication — twentieth increment

Full backup creation, verification and restore now share an authentication policy implemented in `scripts/full-backup-auth.mjs`. A configured BACKUP_AUTH_KEY signs the complete archive fingerprint using a versioned, domain-separated HMAC-SHA256 record. The key must be a separately held 32-byte secret encoded as 64 hexadecimal characters. The detached .auth.json record contains only format/algorithm, archive hash, byte count and MAC; no key is copied into archives, output or sidecars. Authentication sidecars use 0600 permissions.

## Policy and verification

BACKUP_AUTH_REQUIRED accepts only literal true/false. True requires a valid key and authentication record. Configuring a key also requires authentication even when REQUIRED=false, so removing a sidecar cannot downgrade keyed verification. A present authentication sidecar without a usable key is rejected. With neither key nor signature, legacy structural verification remains available and explicitly reports authenticated:false. verified:true alone is not an authenticity claim.

Both full verification entry points authenticate before decryption or extraction. The verifier first makes a bounded private copy from a no-follow regular-file descriptor, then authenticates and parses that same private copy. Replacing the public archive after its MAC check cannot substitute different bytes for extraction. Compressed copies are capped at 100 GiB plus 64 MiB; existing decompressed size/header/metadata bounds remain. Adjacent checksum sidecars now reject dangling symlinks as well.

Authentication records have a strict schema and bounded regular-file storage. Invalid keys, malformed records, non-hex/Unicode/wrong-length MACs, mismatched hash/size, unknown fields and wrong keys fail closed without echoing secrets or parser contents. Authentication errors occur before an existing restore target is changed. A test with a positive-control decryption hook proves altered ciphertext does not reach OpenSSL. Another test replaces the public archive during MAC verification and recovers the original authenticated private bytes.

## Publication and retention

Creation signs and self-verifies in private staging. Sidecars are published before the archive rename, which acts as the availability marker. If that rename fails, only the invocation's published sidecars/staging are removed; previous backups are not pruned. Retention removes authentication records alongside their archive/checksum. Archive identity is content-bound rather than filename-bound, so operator renames preserve valid authentication when sidecars move with the archive.

## Operational limits

The CLI reads process environment; .env.example documents configuration but is not a secret store. Keep authentication keys independent of the encryption passphrase, outside the backed-up dataset, and available separately for recovery. Matching historical keys must be retained when rotating keys. Automatic key IDs/rotation, key escrow and deployed key-loss rehearsals are not implemented.

The encrypted payload format remains CBC/PBKDF2 with an optional detached archive MAC; native AEAD format migration remains open. HMAC authenticates possession of the configured secret, not the legitimacy of source records, a unique operator identity, freshness or protection against replay of an older valid archive. Key holders can authorize new archives. Unsigned inspection is still possible when no policy/key is configured, and downstream migration gates are not automatically wired to this flag. The metadata-only backup helper remains an unsigned byte-integrity tool.

Off-host replication, frozen-source consistency, filesystem durability, deployed queue/database recovery and measured RPO/RTO remain open. Private input copying closes archive-path replacement after authentication; it does not establish atomic snapshots of the original application dataset or defend against an attacker controlling the verifier's OS account. No actual project-data backup, restore, key provisioning, migration, provider action or deployment occurred; tests use temporary fixture data and dummy keys. No phase is complete.

## Tracker correction

Backup evidence from increments 16–19 is now attached to A26 (host-loss/queue recovery), not A14 (shutdown). Existing shutdown evidence is preserved. A26 is in progress, with off-host and deployed recovery acceptance still open.

## Verification

- Final full suite: **674 tests across 119 files passed**, including **98 full-backup/recovery cases**.
- Final focused recovery/authentication run: **98 passed** (24 added cases).
- Production verification passed backend typecheck, production build and AST/build consistency for **351 registrations across 46 routers**. That run had 673 tests before the final private-snapshot replacement case was added; the final 674-test run includes it and the private-copy implementation.
- Changed scripts/test ESLint, script syntax checks and scoped whitespace checks passed. Node-global lint scope includes the new authentication helper. Full-repository lint remains an open baseline.
- Tests cover signed plaintext/encrypted recovery, public-checksum rewrites, malformed/unsafe signatures, missing/wrong keys, strict policy, downgrade rejection, pre-decryption authentication with a positive-control hook, renamed archives, sidecar retention, failed publication cleanup and archive replacement after authentication.
- Logs and source hashes are saved under `implementation-evidence/backup-authentication-*`; no real archive, key or recovery payload is included.
