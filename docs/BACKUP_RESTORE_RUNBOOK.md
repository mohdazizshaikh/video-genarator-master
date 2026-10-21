# Backup and Restore Runbook (G-09)

**Status date:** 2026-10-21  
**Scope:** file-backed stores and local media on a single host (the current production shape of this checkout). PostgreSQL/MinIO remain disabled and are not part of this runbook.

## What a backup contains

`scripts/backup.mjs` creates one encrypted tar.gz archive containing every file under `DATA_DIR_PATH`, with a `BACKUP_MANIFEST.json` (per-file size, SHA-256, mode, format, app version).

| Included | Excluded (documented) |
|---|---|
| All JSON stores (`connectors`, `releases`, `publishJobs`, `renderJobs`, `job-events`, `auth-tenants`, `tenants`, …) | `temp/` — transient render/upload work files |
| `connector-secrets.json` (ciphertext only) | `cache/` — re-downloadable runtime caches |
| `videos/` and image artifact directories | `backups/` — avoids recursion |
| `logs/`, `tenant-logs/` | `libs/` — re-provisioned runtime binaries (Whisper/FFmpeg), ~218 MB |
| `.env`? **Never.** | Archive only ships the app data dir |

The deployment `.env` is deliberately out of scope. Restoring encrypted connector secrets requires the operator-held `TENANT_KEYS_SECRET`; API auth tokens require `JWT_SECRET`; provider access requires the provider credentials themselves. Keep these in the operator secret store, not next to the archives.

**Security default:** the data dir contains credential material (hashed tenant keys plus a legacy plaintext tenant `apiKey` field, and encrypted connector secrets). Unencrypted archives are refused unless `--allow-plaintext` is passed explicitly. Encrypted archives use AES-256-CBC with PBKDF2 (200,000 iterations); the passphrase comes from `BACKUP_PASSPHRASE` (minimum 12 characters). A lost passphrase means an unrecoverable archive.

## Commands

```bash
# Create an encrypted, paused (consistent) backup with retention
BACKUP_PASSPHRASE=... ./scripts/backup.sh \
  --output /srv/backups --encrypt --pause-container ace-app --keep 7

# Verify an archive end-to-end (latest by default)
BACKUP_PASSPHRASE=... node scripts/backup.mjs --verify
BACKUP_PASSPHRASE=... node scripts/backup.mjs --verify /srv/backups/<archive>.tar.gz.enc

# Restore into a staging directory (never overwrites a non-empty target without --force)
BACKUP_PASSPHRASE=... node scripts/restore.mjs \
  --backup /srv/backups/<archive>.tar.gz.enc --target /srv/restore-check

# Verify only, no writes
BACKUP_PASSPHRASE=... node scripts/restore.mjs --backup <archive> --verify-only
```

`scripts/backup.sh` is now a compatibility wrapper for `scripts/backup.mjs`. The legacy `scripts/backupData.ts` is not a disaster-recovery backup (wrong filenames, JSON subset, no media); `scripts/migrations/backup.mjs` remains metadata-only for migration gates.

## RPO, scheduling, and retention

- A **paused** backup (`--pause-container ace-app`) is a point-in-time consistent snapshot: the container is stopped, data is copied, and the container is restarted after the archive is written.
- RPO = the schedule interval. No schedule is configured by this repository; the operator must install one.
- Recommended baseline: daily at 02:00, verify at 03:00, keep 7 archives (or 30 days, per retention policy), then replicate archives off-host. Minimum viable retention for a single-host deployment is one verified off-host copy per day.

```cron
# /etc/cf-backup.env  (chmod 600, owner) contains BACKUP_PASSPHRASE=...
0 2 * * * cd /path/to/short-video-creator-master && set -a && . /etc/cf-backup.env && set +a && ./scripts/backup.sh --output /srv/backups --encrypt --pause-container ace-app --keep 7 >> /var/log/cf-backup.log 2>&1
0 3 * * * cd /path/to/short-video-creator-master && set -a && . /etc/cf-backup.env && set +a && node scripts/backup.mjs --verify >> /var/log/cf-backup-verify.log 2>&1
```

`--keep N` prunes the oldest `content-factory-backup-*` archives and their `.sha256` sidecars in the output directory. Archives and sidecars are written with mode `0600`.

## Restore procedure

1. Stop the app so no store writes occur during restoration: `docker stop ace-app`.
2. Restore into the live data directory with an explicit rollback artifact:
   ```bash
   BACKUP_PASSPHRASE=... node scripts/restore.mjs \
     --backup /srv/backups/<archive>.tar.gz.enc --target ./data --force
   ```
   The tool verifies the sidecar checksum, decrypts, extracts, verifies every file against the manifest, then renames the existing `./data` to `./data.pre-restore-<stamp>` before copying the verified files into place.
3. Restore the operator secrets (`.env`: `JWT_SECRET`, `TENANT_KEYS_SECRET`, provider credentials) from the operator secret store. They are not in the archive.
4. Start the app: `docker start ace-app` (or `docker compose up -d`). Note: on this Docker daemon an external `docker kill` is a manual stop and does not trigger `unless-stopped`; use an explicit start.
5. Verify health `GET /api/health`, authenticate a tenant, and compare connectors, releases, and release targets against the pre-incident expectation.

**Rollback** (restore failed or data must be returned to its pre-restore state):

```bash
docker stop ace-app
mv data data.failed-$(date +%Y%m%d_%H%M%S)
mv data.pre-restore-<stamp> data
docker start ace-app
```

Then verify health and tenant reads. `restore.mjs --force` prints the exact `preRestoreArchive` path and a rollback instruction in its JSON result.

**Rehearse before the incident:** restore to a staging directory, boot a disposable app against it with `REDIS_ENABLED=false` (so it cannot join the live queue), authenticate with a restored tenant key, and compare API snapshots. Then remove the disposable container. Never point the disposable instance at the live Redis or the live data directory.

```bash
docker run -d --name ace-restore-check -p 3124:3123 \
  --env-file .env -e PORT=3123 -e REDIS_ENABLED=false \
  -e DATA_DIR_PATH=/app/data -e DOCKER=true -e DEV=false -e SKIP_RUNTIME_INSTALL=true \
  -v /srv/restore-check:/app/data short-video-creator-master-app:latest
# health on :3124, authenticate, compare; then:
docker rm -f ace-restore-check
```

## Rehearsal evidence — 2026-10-21

The rehearsal ran against the live local stack (owner-provided Telegram connector and six published targets) with an encrypted paused backup and an isolated restore instance:

| Step | Result |
|---|---|
| Backup | `content-factory-backup-2026-10-21T17-43-05-611Z.tar.gz.enc`, 111,254,288 bytes, SHA-256 `ae1f1c95e7579ebd62ffd9cd09f64dec9c9c156c2dcdfe732760e46b7b8e734e`; 52 files / 115,741,667 bytes uncompressed; app paused and healthy again 4.05 s after restart; stop→archive 9.6 s |
| Verification | 1.24 s; 0 manifest mismatches, 0 unexpected files |
| Restore | 2.4 s; 52 files incl. 5 videos |
| Integrity comparison | 32/32 JSON store SHA-256 identical; 5/5 video SHA-256 identical (107,347,708 bytes) |
| Isolated app | restored data booted on port 3124 with Redis disabled; healthy in 4.02 s; authenticated with the restored tenant key; connectors, releases, release details, and 6/6 published targets identical to the source (`sourceMatches: true`) |
| RTO | restore + boot-to-verified = 6.4 s (total drill 25.3 s) |

RPO for the file-backed scope is the operator's backup interval (the drill proves a consistent point-in-time snapshot when paused). The isolated instance proves restored stores, encrypted connector secrets, media, and tenant authentication are usable together.

## Limitations (still open)

- **Off-host replication is not implemented.** Archives are written to a local output directory; a host loss loses them. Replicate to independent storage and test retrieval.
- **Redis/BullMQ queue state is not in the archive.** Durable job/release/target records are in the JSON stores; transient queued jobs must be re-enqueued through the operator recovery path after a restore. The Compose `redis_data` volume is separate.
- **Durable PG/MinIO scope is not covered** — both remain disabled by owner gate.
- **Automatic scheduling is operator-owned**; this repository ships the tools and verification, not a scheduler.
- **Legacy plaintext tenant key field** in `auth-tenants.json` makes unencrypted archives unsafe; keep `--encrypt` mandatory and treat `--allow-plaintext` as a break-glass option.
- Paused backups briefly stop the app (measured ~14 s downtime for 116 MB of data on this host); larger video libraries lengthen the window. Schedule backups during quiet periods.
