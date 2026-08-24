# Promoted Master Migration Evidence

**Migration date:** 2026-08-22

## Promotion result

The newer checkout at `/Users/admin/Documents/Short-video-creator` was promoted into `/Users/admin/Documents/short-video-creator-master`. The previous master directory was preserved as `/Users/admin/Documents/short-video-creator-master-pre-promotion-20260822-022327`. A timestamped rollback archive is stored at `/Users/admin/Documents/short-video-migration-backups/20260822-021949`.

The rollback package contains source archives for both checkouts, data/configuration archives for both checkouts, a PostgreSQL dump, and PostgreSQL, Redis, and MinIO named-volume archives with SHA-256 records. The old project Docker stack was stopped and removed with its project volumes after these backups were created. Only short-video project application images were removed; shared base images and unrelated Docker projects were not targeted.

## Promoted Docker deployment

The promoted master was built as `short-video-creator-master-app` from the newer source. The first build exposed a real Docker context defect: `scripts/copy-edge-tts-script.js` was required by the promoted package build but was not copied into the Docker build stage. The Dockerfile was corrected to copy that helper before `pnpm build`, and the rebuilt image completed successfully.

The current Compose stack contains the promoted `ace-app` and `ace-redis` services. PostgreSQL and MinIO are **not part of the newer checkout’s Compose definition**, so they are not running in the promoted stack. This is an intentional feature-boundary difference from the archived master deployment and must not be described as a PostgreSQL/MinIO verification.

## Final verification

| Check | Result |
|---|---|
| Master UI `/` | HTTP 200 |
| `/api/health` | HTTP 200; `status=ok`, Redis `ok`, video engine `ready` |
| `/api/short-videos` | HTTP 200; existing ready video records visible |
| `/api/tenants` | HTTP 200 |
| `/api/docs.json` | HTTP 200 |
| Redis container | Healthy |
| Redis eviction policy | `noeviction`, corrected for BullMQ durability |
| Application container | Healthy on `localhost:3123` |
| Old temporary port 3133 | Stopped |
| Archived old Docker resources | Removed after backup |

The newer checkout does not contain the archived master’s `RELEASE_CONTROL_PRIMARY_READS`, PostgreSQL `job_events`, `/api/job-events`, or `/api/engines` feature set. In the promoted application, `/api/job-events` and `/api/engines` return HTTP 404 because those routes are not present in this newer route contract. Therefore, the old master’s primary-read/cutover claims do not carry over to this promoted checkout; those features require a separate implementation if they are still required.

No primary-read flag was enabled. No external provider credentials were created. The promoted deployment is healthy for the newer checkout’s actual application contract, but it is not evidence that the archived PostgreSQL/MinIO/release-control architecture exists in the promoted source.
