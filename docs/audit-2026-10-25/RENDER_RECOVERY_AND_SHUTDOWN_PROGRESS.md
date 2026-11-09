# Fourth implementation increment: render recovery and coordinated shutdown

Date: 2026-10-25. This increment advances A14, A09, A06 and C02/C04. No phase is complete. The persistent schedule-occurrence work in A22 and the provider-upload ambiguity work in A11 remain open.

## One bounded shutdown sequence (A14)

A shared coordinator replaces competing signal handlers. SIGTERM/SIGINT request the same shutdown promise and cannot trigger an early successful exit while worker close promises are pending.

1. Stop HTTP admission and both persistent/source schedule producers; pause worker consumption.
2. Drain HTTP connections, MCP sessions, workers, background initialization and asynchronous worker completion/failure listeners.
3. Drain the in-memory video queue through artifact/content-version registration; new video requests are refused once the engine drain starts.
4. Close Redis and the Chatterbox subprocess using the existing subprocess shutdown helper.

The sequence shares a 30-second total deadline. Errors still allow other closers to run; failure or deadline expiry exits with status 1 and records incomplete shutdown. Successful shutdown exits with status 0 only after the barriers finish. Initialization guards prevent subsequent workers/schedulers from starting once shutdown is requested.

BullMQ's async event listeners are now explicitly tracked for render, publish and dead-letter workers. Their persistence failures are consumed and reported, and worker close includes their pending writes. This prevents successful process exit from racing unfinished failure/dead-letter bookkeeping. It does not make event and outbox writes transactional.

HTTP readiness reports shutdown, the persistent schedule runner is stopped, and open MCP streams are closed to allow HTTP draining. The source scheduler drains its active rule before closing and skips later rules after stop. Its enqueue guard is now workspace-scoped; a request from one workspace cannot block another workspace's same category slot.

## Persisted render execution and output identity (C02/C04, A09 foundation)

RenderWorker delegates to a shared execution service rather than enqueueing a new in-memory render on every delivery and polling forever.

- A render execution is persisted before enqueue. Its record binds workspace, render job, execution ID and a fixed deadline. The returned video ID is persisted before waiting for its outcome.
- A re-delivery with a confirmed binding inspects that video. It never enqueues another video merely because a worker restarted. A claim with no confirmed video binding, a legacy started job without a checkpoint, an unavailable bound render or an expired wait is held in `reconciling`.
- Reconciliation is terminal for automatic render-worker retries in this increment. It requires operator review; there is no automatic resolution or retry button yet. A timeout does not cancel the underlying media subprocess/render operation.
- Completion requires the owned video, active video artifact, matching ready content version with the producer's render signature, storage containment and matching artifact checksum. The completed execution and render job expose video/artifact/content-version IDs.
- Completion is checkpointed before the job projection is written. If that job update fails, a re-delivery or failure listener can repair it from confirmed completion without rendering again. Final progress-telemetry failure does not undo a completed render.
- Render-job mutations now use fresh synchronous read-modify-rename operations with restricted temporary files. Same-process independent writers retain interleaved creates and attempt increments. Corrupt job and execution files throw and remain unchanged.

File-mode claims coordinate instances in one Node process. They do **not** provide cross-process mutual exclusion or a database transaction across execution, job, artifact, content-version, event and outbox files.

## Connected scheduler visibility

New authenticated endpoints `/api/queue/render-jobs` and `/api/queue/render-jobs/:id` return only the caller's jobs and omit internal output paths. The scheduler hook uses these persisted jobs rather than treating video-library entries as render jobs. Failed requests propagate to the page error state instead of becoming empty results.

The scheduler table links confirmed rendered jobs to their video only when all output IDs exist. Uncertain renders display “Needs review.” Link normalization and rendered markup are tested; interactive browser acceptance remains open.

## Configuration and compatibility

`RENDER_JOB_TIMEOUT_MS` is documented in .env.example. Default: 1,800,000 ms (30 minutes); supported range: 1,000–86,400,000 ms. The deadline is persisted and is not renewed on re-delivery. It bounds waiting for the renderer; it is not a hard cancellation deadline for media processing or every filesystem operation.

Existing started render jobs without execution checkpoints are explicitly held for reconciliation. No migration or reconciliation was applied to real project/deployment data. Unconfirmed outputs are not silently promoted to completed jobs.

## Verification

- `npm run verify:production`: PASS — backend typecheck, **104 test files / 363 tests**, production build, compiled route inventory.
- `npm run typecheck:ui`: PASS.
- ESLint on source/tests changed in this increment: PASS, zero errors/warnings.
- `git diff --check`: PASS.

Evidence: implementation-evidence/increment4-*.log and increment4-source-manifest.json. Tests use temporary stores, fake signal/HTTP/worker runtimes, mocked generation, or small fixture media. They cover signal deduplication, phase ordering, stuck-close deadlines, listener persistence barriers, engine drain, MCP close, resumed and ambiguous render deliveries, corrupt storage, output links/checksum, projection repair, tenant-isolated job APIs and scheduler data/UI contracts.

No live notification, upload, Redis service, production media render, deployment migration or real process termination was invoked by these tests.

## Remaining acceptance gates

A14 remains `implemented_unverified` until actual process/Redis/media-engine shutdown and restart are rehearsed, including signals during initialization, persistent schedule execution and forced-deadline subprocess cleanup. On deadline expiry remaining cleanup is best effort and the exit is explicitly unsuccessful. The persistent schedule runner's already-started work is not yet represented by a durable occurrence record.

A22 still requires durable schedule occurrences, completion-based success, saved supplementary assets and explicit handling of all requested language/platform/category combinations. A11 still requires provider-success checkpoints and ambiguity/reconciliation rules. A21 worker heartbeat/readiness remains open; Redis connectivity is not proof that a worker is alive.

Cross-process claims, transactional event/outbox insertion, physical renderer cancellation, automated reconciliation, durable queue repair, complete output/deletion/storage migration and browser/provider acceptance remain open in P5/P6 and the completion tasks. A passing local suite does not establish production readiness or full-project completion.
