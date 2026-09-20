# Greenfield Runtime Reset Evidence

Generated: 2026-08-27

## Decision

The local Content Factory runtime was reset as a fresh greenfield environment. Legacy file-backed runtime data, old PostgreSQL/MinIO/Redis service state, and queues were removed after an external rollback archive was created. Source code and the current `.env` configuration were preserved.

## Destructive scope

| Area | Result |
|---|---|
| File-backed runtime data under `data/` | Removed and reinitialized |
| PostgreSQL Docker volume | Removed and recreated empty |
| MinIO Docker volume | Removed and recreated empty |
| Redis Docker volume and queues | Removed and recreated empty |
| Orphaned legacy hyphenated service volumes | Removed after archive |
| Source code and migration scripts | Preserved |
| `.env` | Preserved; remains ignored and owner-only |
| External Telegram publishing | Not performed |

## Rollback archive

An emergency archive was created outside the project at `/Users/admin/Documents/short-video-creator-master-reset-archive-20260826T231746Z`. It contains the legacy file-backed data and Docker-volume tar archives with SHA-256 checksums. It is not part of the active runtime data path.

## Fresh initialization verification

The recreated stack is healthy on port `3123`. PostgreSQL, MinIO, Redis, and the application are running. The health endpoint reports Redis `ok` and the video engine `ready`.

The fresh tenant stores contain exactly one workspace: **Aaditech Solution**. The workspace was registered with the supplied owner email and then bootstrapped through the authenticated tenant endpoint. The generated API key is stored outside the repository at `/Users/admin/aaditech-solution-api-key.txt` with owner-only permissions; its value is intentionally not included in this document or logs.

The fresh content, publishing, rendering, scheduling, pipeline, analytics, and metadata stores contain no legacy records. Platform baseline libraries remain available where they are part of the application initialization.

## Gate result

The final migration-readiness check passes with `unownedRecords: 0`, no malformed stores, valid database and MinIO configuration presence, and no blockers. `readyForMigration` is `true`, while `readyForPrimaryReadCutover` remains `false` by design. PostgreSQL/MinIO migration has not been applied; the file-backed authority remains active until the separately reviewed migration runbook is executed.

## Next safe step

Before connecting Telegram publishing, complete the owner-approved migration execution/read-verify/rollback procedure or explicitly continue greenfield file-backed development. Telegram connector credentials and destination identifiers must remain workspace-scoped, encrypted at rest, verification-gated, and must not be auto-posted without an approved release target.
