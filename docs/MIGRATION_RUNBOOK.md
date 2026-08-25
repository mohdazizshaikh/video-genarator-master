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

The reconciliation report and remediation plan must be reviewed by the owner. Malformed stores and unowned records require an explicit recovery, quarantine, or mapping decision. A mapping manifest may be supplied to the dry-run planner, but it is validated only and never applied by that command.

## Gate 2: metadata backup and restore verification

Create and verify a metadata backup before migration:

```sh
npm run db:backup:create -- --output /secure/backup/location
npm run db:backup:verify -- --backup /secure/backup/location/metadata-<timestamp>
```

The backup contains raw JSON bytes, including malformed JSON, plus a SHA-256 manifest. It does not include `.env`, plaintext API keys, or large artifact binaries. Artifact objects must be backed up independently through the MinIO/S3 versioned backup policy before any source cleanup.

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

The executor uses one transaction per migration, obtains a PostgreSQL advisory transaction lock, rejects checksum drift, and records a checkpoint only after a successful commit. It never enables primary reads. If a transaction fails, it rolls back that migration and leaves local authority unchanged.

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

The current local environment has no owner-approved `DATABASE_URL` or MinIO configuration. The reconciliation report identifies malformed `reports.json` and `scriptPlans.json` plus unowned records. Therefore the current system is **pre-migration ready**, not approved for migration execution or primary-read cutover. PostgreSQL and MinIO must not be enabled by inventing local credentials or by bypassing these gates.
