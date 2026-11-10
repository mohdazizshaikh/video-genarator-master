# Phase 11 Operations Runbook

## Scope
- CI hardening
- Security automation
- API rate limiting
- Backup automation
- Observability checks

## CI Gates
- Lint: `pnpm exec eslint src --ext .ts,.tsx`
- Typecheck: `npx tsc -p tsconfig.build.json --noEmit`
- Tests: `pnpm vitest run`
- Build: `pnpm build`

## Security Scans
- `pnpm audit --prod`
- Optional container scan in CI via Trivy action.

## Backup Procedure
- Run `pnpm backup:data` before major deploys.
- Artifacts are written under `${DATA_DIR_PATH}/backups/backup-<timestamp>`.

## Observability
- Health endpoint: `/api/health`
- Queue states: `/api/health/queue/states`
- Metrics endpoint: `/api/health/metrics`

## Rate Limiting
- Applied globally on `/api` routes.
- Default: 120 req/min per IP.

## Recovering a pending scheduled video

1. Inspect the owned schedule through `GET /api/schedule/:id`. Record its execution ID and checkpointed video ID. A pending video does not advance the run counter or recurrence.
2. Check the renderer and stored outputs. The minute runner can complete the same bound video after restart when the workspace owns its metadata, active MP4 manifest and ready renderer-created content version, and the bytes and all requested SVGs verify. Pausing future dispatch does not stop this check.
3. If the evidence is missing, partial, foreign, or changed, preserve the claim and files for investigation. The runner does not start a replacement. Do not edit the checkpoint, copy another workspace's artifact, or treat an older `lastOutput` as proof of the current run.
4. Verify that the execution completed and that `lastOutput.state` is `video-completed` for the bound video. Publication still requires its own approval and dispatch workflow.

Previously completed enqueue-only records are not backfilled. File-mode coordination protects commits inside one server process. Cross-process scheduling, unknown or failed render resolution, and deployed recovery exercises remain open.

When the renderer has not been attached yet, a due video stays due and the runner rechecks on its next tick. It does not consume the occurrence. Topic freshness is recorded after verified completion as a separate advisory write. If a warning reports a freshness write failure, the verified render and completed occurrence remain valid.
