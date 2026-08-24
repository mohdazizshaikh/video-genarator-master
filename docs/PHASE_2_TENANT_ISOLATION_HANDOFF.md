# Phase 2 Tenant-Isolation Handoff

**Repository:** `/Users/admin/Documents/short-video-creator-master`  
**Date:** 2026-08-23  
**Author:** **Manus AI**  
**Primary migration flag:** `RELEASE_CONTROL_PRIMARY_READS=false`

## Executive status

Phase 2 has completed the AI-learning, quota, competitor-analysis, series-builder, skip-analysis, and operational-boundary increments. The application now treats tenant identity as a server-derived security property for these data paths. The implementation preserves the newer UI and engine contracts and does not introduce provider credentials.

The phase is **not yet closed globally**. Artifact storage implementation and residual-store closure remain required before PostgreSQL/MinIO migration begins. The inventory below separates tenant workspace data, platform operations, credentials, generated artifacts, and ephemeral engine state so that PostgreSQL and MinIO migration does not accidentally copy the file-backed design.

## Enforced invariants

| Invariant | Required behavior | Current evidence |
|---|---|---|
| Tenant identity | Use the verified bearer claim; never trust a request body or path identifier as ownership | `getAuthenticatedTenantId(req)` in AI, strategy, shadowban, and throttling routes |
| Missing identity | Protected operations fail closed with HTTP 401 | Docker smoke checks for `/api/ai/events` and `/api/system/throttle/check` |
| Cross-tenant access | A normal tenant cannot read or mutate another tenant’s records; use non-enumerating denial where appropriate | Throttling path lookup returns 403; AI reads filter by owner |
| Legacy records | Records without ownership are quarantined from tenant-scoped reads and execution | AI event filtering; legacy global model quarantine |
| AI learning | Events and model state are tenant-owned; training consumes only the owner’s events | `AiLearningStore` and `AiTrainingService` scoped methods |
| Quota policy | Normal callers can check/read only their own quota; plan changes and resets require the admin key | `/api/system/throttle/*` route guards |
| Strategy history | Competitor strategy history and series/episode state are tenant-owned | `CompetitorAnalysisEngine` and `SeriesBuilderEngine` scoped methods |
| Retention learning | Skip-analysis records and aggregation are tenant-owned | `SkipAnalysisEngine` scoped methods |
| Migration safety | No release-control primary-read change before durable stores, reconciliation, and acceptance gates pass | `RELEASE_CONTROL_PRIMARY_READS=false` preserved |

## Completed in the current Phase 2 track

The following boundaries have auth-derived ownership and scoped repository or service access: tenants, profiles and accounts, publishing jobs, channel mappings, render jobs, video metadata, video-library records and artifact paths, reports, derived script plans, pipeline jobs and variations, comparisons, analytics, audience targets, schedules, AI-learning events and model state, throttling quota routes, competitor strategy history, series and episode state, and skip-analysis retention data. Background execution paths that mutate these records have been updated where the boundary required worker propagation.

Legacy records are not silently assigned to an arbitrary tenant. They remain quarantined until an explicit migration policy is designed and verified against durable storage.

## Final inventory before PostgreSQL

| Candidate | Classification | Phase 2 action | Phase 3 destination |
|---|---|---|---|
| `AuthEngine` and tenant key state | Tenant/security-sensitive | Remains file-backed and must be migrated with secret rotation and transactional ownership | PostgreSQL plus a managed secret mechanism |
| `CredentialRotationEngine` / `credential-store.json` | Sensitive credential state | Do not expose through tenant routes; require explicit admin/tenant ownership review | Secret store; metadata in PostgreSQL |
| `CompetitorAnalysisEngine` | Tenant workspace strategy history; shared creator/pattern pools are reference data | Completed: scoped history and tenant-owned strategy writes; legacy history quarantined | PostgreSQL |
| `SkipAnalysisEngine` | Tenant video-derived retention data | Completed: tenant-scoped recording and aggregation; legacy data quarantined | PostgreSQL |
| `SeriesBuilderEngine` | Tenant content/workspace data | Completed: tenant-owned series, episodes, reads, mutations, and deletion; legacy data quarantined | PostgreSQL; media references in MinIO |
| `ErrorRecoveryEngine` | Platform operations and incident data | Completed: all listing, mutation, dead-letter, and clear operations require the admin key | PostgreSQL with admin authorization |
| `ResourceEngine` snapshots | Platform operations/capacity telemetry | Completed: snapshot, optimization, prediction, and history require the admin key | PostgreSQL or metrics backend |
| `CredentialRotationEngine` / `credential-store.json` | Sensitive credential state | Completed at route boundary: all credential operations require the admin key; migration must move values to a managed secret store | Secret store; metadata in PostgreSQL |
| `ViralRadarEngine` history | Platform-derived in-memory reference/cache; no persistent tenant history | Classified: keep protected live radar in Redis/metrics architecture unless saved scans become an explicit tenant feature | Redis/metrics backend |
| `RepurposeEngine` outputs | Tenant-generated clips, currently local files | Interim completed: generated filenames carry a sanitized auth-derived tenant prefix and listings filter by that prefix; MinIO manifests and signed access remain | MinIO/S3 |
| `ImageFiltersEngine` outputs | Tenant-generated artifacts, currently local files | Interim completed: generated previews and filtered outputs carry sanitized auth-derived tenant prefixes; serving and apply/batch paths reject non-owner files; durable manifests remain | MinIO/S3 |
| Image-generation outputs | Tenant-generated artifacts, currently local files | Interim completed: generated outputs carry sanitized auth-derived tenant prefixes and serving rejects non-owner/legacy files; durable manifests remain | MinIO/S3 |
| `ExportEngine` backups | Operational export | Preserve as an export mechanism, not as the authoritative database | PostgreSQL/MinIO backup pipeline |
| Remaining system-engine stores | Mixed | Review route exposure and mark each as admin-only, tenant-scoped, or stateless | PostgreSQL, Redis, metrics, or MinIO by classification |

This table is an implementation handoff, not a claim that every candidate is currently insecure or user-visible. ViralRadar is classified as platform-derived cache; artifact files remain the only material storage gap requiring a future MinIO implementation. Each remaining artifact path must receive an owner-aware manifest, focused tests, and a migration mapping before Phase 2 can be marked complete. Repurpose, image-generation, and image-filter naming/list/serving controls are now interim filesystem protections; durable MinIO manifests, signed URLs, and lifecycle management remain open. See `docs/POSTGRES_MINIO_MIGRATION_MATRIX.md` for the durable mapping.

## Validation evidence

Backend typecheck passed. The full Vitest regression suite passed with **53 test files and 124 tests** before the route-only admin guard increment; focused typecheck and route-adjacent tests passed after it, and the production Docker smoke gate passed. New tests cover tenant-specific AI events, legacy model quarantine, per-tenant model state, tenant-keyed quota state, competitor history, series ownership, and skip-analysis retention. `git diff --check` passed. After rebuilding the Docker stack on port `3123`, `GET /api/health` returned **200**, unauthenticated `GET /api/ai/events` returned **401**, and unauthenticated `POST /api/system/throttle/check` returned **401**.

## Phase 3 entry criteria

Phase 3 may begin after the final inventory is converted into a domain/data dictionary and migration matrix. The first implementation slice should establish PostgreSQL migrations, tenant-scoped repositories, uniqueness and foreign-key constraints, transactional job ownership, and dual-read verification while leaving `RELEASE_CONTROL_PRIMARY_READS=false`. MinIO should follow with artifact manifests, signed access, lifecycle cleanup, and a migration checksum. No provider credential, OAuth token, or tenant ownership should be fabricated during the migration.

## Phase 3 artifact manifest seam — 2026-08-24

`src/db/ArtifactManifestStore.ts` now provides migration-ready local manifest persistence with tenant ownership, artifact kind, local path, future object key, SHA-256 checksum, size, MIME type, lifecycle, timestamps, tenant-scoped lookup, and legacy-record quarantine. The seam is intentionally not wired as a replacement authority: local producer outputs remain authoritative until manifest registration, MinIO upload, reconciliation, and rollback gates are implemented with approved infrastructure. Owner-aware filename and serving controls for repurpose, image generation, and image filtering remain active. See `docs/POSTGRES_MINIO_MIGRATION_MATRIX.md` for the durable sequence.
