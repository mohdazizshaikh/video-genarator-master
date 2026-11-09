# Content Factory Migration Runbook

## Purpose

This runbook moves the platform from file-backed metadata and local artifact files toward PostgreSQL and MinIO/S3 without changing primary authority prematurely. The file-backed stores remain authoritative until every gate below passes.

## Safety invariants

The migration must not infer tenant ownership, overwrite or delete source data, print secrets, enable `RELEASE_CONTROL_PRIMARY_READS`, or apply SQL without owner-approved database access, backup approval, reconciliation approval, and rollback approval. The migration scripts are fail-closed when any required precondition is absent.

## Gate 1: inventory and reconciliation

Run the following commands from the canonical checkout:

```sh
npm run db:migration:reconcile
npm run db:migration:remediation-plan
npm run db:migration:readiness
```

The reconciliation report and remediation plan must be reviewed by the owner. Malformed stores and unowned records require an explicit recovery, quarantine, or mapping decision. A mapping manifest may be supplied to the dry-run planner, but it is validated only and never applied by that command. The planner and decision validator use the same read-only inspector as reconciliation/readiness. A signed decision is a proposal: it cannot clear unresolved source ownership, relationship, registry or provenance findings. Version 1 decision manifests address flat array indexes only; full issue-identity and frozen-source hash binding remain unimplemented.

## Gate 2: metadata backup and restore verification

Create and verify a metadata backup before migration:

```sh
npm run db:backup:create -- --output /secure/backup/location
npm run db:backup:verify -- --backup /secure/backup/location/metadata-<timestamp>
```

The backup contains raw JSON bytes, including malformed JSON, plus a SHA-256 manifest. It excludes `.env` and large artifact binaries, but raw JSON can contain plaintext API keys, tokens and other sensitive data. The metadata helper preserves malformed bytes, includes nested JSON namespaces, and excludes only root `backups/` and bundled `libs/whisper/`. It rejects static symlinks, unsafe manifest paths, duplicate entries, missing/extra files and checksum/size mismatches. New backup directories/files use 0700/0600 permissions; unique staging/publication paths preserve previous backups. Custom output inside the source tree is rejected except the default root `backups/`. Missing arguments, empty source inventories and malformed manifests fail closed. It does not encrypt or redact JSON bytes. Verification checks manifest/file consistency, not signed authenticity, original-source completeness or restore readiness. Source file names and bytes are rechecked before publication, but a frozen source is still required for a consistent migration snapshot. Artifact objects must be backed up independently through the MinIO/S3 versioned backup policy before any source cleanup.

### Full JSON and media recovery

The separate `npm run backup:full` and `npm run restore:full` commands cover declared JSON/media/log payloads. Full creation requires encryption or explicit `--allow-plaintext`. Both full verification entry points share a restricted USTAR/per-entry PAX reader that rejects unsafe paths, links/special entries, duplicate entries, invalid headers, incomplete inventories and mismatched totals/checksums. Creation self-verifies before publishing and pruning. Restore stages the payload privately, preserves an existing target under a UUID rollback directory and attempts rollback if publication fails. Restored files use 0600 permissions.

New full backups use PAX with macOS AppleDouble generation suppressed. The reader supports bounded UTF-8 path/decimal size overrides and discards known owner/time/xattr/ACL metadata without applying it. Effective paths, file identities and payload boundaries remain validated. Global PAX, GNU long-name/link, sparse, binary filename charsets and unknown metadata remain unsupported. Unlisted AppleDouble payloads in legacy archives remain blocked. Check compatibility before relying on an existing archive; large-file representation variants are not certified by the temporary small-file tests. Full backup authentication uses an independent BACKUP_AUTH_KEY (32 secret bytes encoded as 64 hex characters). Configure BACKUP_AUTH_REQUIRED=true for processes that must reject unsigned archives. A configured key enforces authentication even when REQUIRED=false. Authentication uses .auth.json sidecars over the archive fingerprint and is checked against a private input copy before decrypting/extracting. Preserve sidecars and matching historical keys separately from the dataset/encryption passphrase. With no key/signature, legacy verification explicitly reports authenticated:false; checksum verification alone is not an authenticity claim. This policy applies to the full backup/restore scripts, not the metadata-only helper. Temporary fixture rehearsals do not certify deployed recovery or key availability. Run against trusted, quiescent directories; atomic snapshots, fsync guarantees, native AEAD migration, key-rotation/recovery exercises, off-host recovery and measured RPO/RTO remain open.

## Gate 3: PostgreSQL schema migration

Provide `DATABASE_URL` through the deployment secret manager, not a tracked file. Set all three explicit approval flags and a unique operator identity only after the owner signs off:

```sh
MIGRATION_EXECUTE=true \
MIGRATION_BACKUP_APPROVED=true \
MIGRATION_RECONCILIATION_APPROVED=true \
MIGRATION_ROLLBACK_APPROVED=true \
MIGRATION_LOCK_OWNER=<operator-id> \
npm run db:migration:apply
```

The executor uses one transaction per migration, obtains a session advisory lock before checkpoint inspection and an advisory transaction lock, rejects checksum drift, and records a checkpoint only after a successful commit. It never enables primary reads. If a transaction fails, it rolls back that migration and leaves local authority unchanged.

## Gate 4: MinIO artifact migration

Provide `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, and optionally `MINIO_REGION` through the deployment secret manager. The artifact executor validates local path containment, tenant-prefixed object keys, manifest checksums, and byte sizes before upload. It verifies uploaded object metadata and size afterward. Local source files remain available for rollback.

```sh
MIGRATION_EXECUTE=true \
MIGRATION_BACKUP_APPROVED=true \
MIGRATION_RECONCILIATION_APPROVED=true \
MIGRATION_ROLLBACK_APPROVED=true \
RELEASE_CONTROL_PRIMARY_READS=false \
npm run storage:migration:apply
```

## Gate 5: read-verify and cutover

After PostgreSQL and MinIO migration, run the reconciliation and readiness commands again, execute authenticated two-tenant isolation tests, verify artifact downloads through signed or opaque references, and rehearse rollback from the backup. Only after discrepancies are zero, restore verification succeeds, job/event ownership is durable, and the owner approves the rollback rehearsal may a separately reviewed change enable primary reads. No command in this repository enables the cutover automatically.

## Current known blockers

The 28 October read-only inspection of the repository data covers 32 JSON stores and remains blocked by three legacy-state provenance issues, two ownerless render jobs and nine store-level owner/registry mismatch findings. Namespace mappings, durable runtime authority, encrypted/off-host backups, authenticated source inventories and real PostgreSQL/MinIO recovery acceptance remain incomplete. This snapshot does not certify a different deployment dataset; rerun the inspector against the intended source. Migration execution and primary-read cutover remain blocked.
