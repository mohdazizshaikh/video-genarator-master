# Persistent schedule outputs — twenty-second increment

A22 is now in progress. Scheduled image, banner and current single-slide carousel producers persist actual SVG bytes before recording a successful run. Supplementary quote-card/poster outputs are also persisted and must return real bytes. Files use workspace-hashed directories, UUID names and 0600 permissions. Each is registered as an owned active artifact with MIME type, size and SHA-256. The schedule stores a server-owned lastOutput receipt containing artifact IDs/checksums/sizes, or an explicitly video-queued receipt for the existing video-dispatch path.

## Retrieval and UI

GET /api/schedule/:id/outputs/:artifactId requires workspace authentication, an owned schedule, a receipt binding and an active same-owner artifact. The route checks resolved containment under that workspace's scheduled-output directory, regular-file size (32 MiB maximum), MIME/kind and both persisted checksums before returning bytes. Missing/foreign bindings return 404; changed/unavailable content returns a generic 409. SVG responses are attachments with nosniff and a restrictive sandbox CSP. Paths are not exposed in schedule receipts. Caller patches cannot replace lastOutput.

The schedule page offers authenticated blob downloads for saved assets and labels video receipts as queued with render completion pending. Failed manual runs now show a configuration/producer error. This UI was built and covered by the existing build gate; interactive browser acceptance remains open.

## Honest scope and dependency safety

Runs requesting multiple platforms, categories or languages, or an unknown content type, now fail before production instead of silently using the first choice. Creation/editing can still save those configurations; complete multi-output planning and user-facing validation remain future work. The current carousel recipe emits one slide; full multi-slide generation is not claimed. No social publication or translation is implied by a saved SVG.

Artifact manifest reads now fail closed on malformed/non-array data instead of allowing registration to overwrite it. Atomic replacement uses unique temporary files and owner-only permissions. Unreviewed/legacy rows remain hidden from normal owned views and are preserved when new owned records are added; they are not automatically assigned or deleted. The legacy quarantine helper is not a complete provenance-remediation workflow.

## Remaining A22 acceptance

Video dispatch is still counted by the existing schedule execution mechanism and one-shot status may become completed after enqueue. The new receipt distinguishes video-queued from assets-persisted, but does not prove rendering, approval or publication completed. Durable claimed executions, exactly-once occurrence recovery, video completion reconciliation, multi-scope generation, historical output discovery, quota accounting and complete artifact retention remain open. Freshness/schedule/artifact writes are not a cross-store transaction. A failure after file/manifest creation can leave owned or unbound artifacts for reconciliation; no speculative cleanup deletes such data. The latest successful receipt is not a complete run history.

No actual schedules or application records were changed, and no provider/render service was contacted. New write/byte/failure tests use temporary directories and the real local SVG producer. Runtime remains file-backed and no phase is complete.

## Verification

Production verification passed backend typecheck, **700 tests across 122 files**, production build and AST/build consistency for **352 registrations across 46 routers**. Focused schedule/manifest tests passed **22 cases**, including **12 new cases**. Changed scripts/UI/source ESLint and scoped whitespace checks passed; full-repository lint remains an open baseline. Tests cover producer types, byte checksums, owner isolation, supplementary outputs, forged receipt patches, missing bytes, corrupt manifest preservation, unsupported multi-scope runs, legacy-row retention and download tampering/containment.
