# Required-video provider contracts — 28 October 2026

Tenth implementation increment, addressing part of A24 and the native-scheduling portion of A10. Full provider acceptance remains open.

## Implemented behavior

X previously swallowed a media-upload error and created a text-only post, then returned publication success. Video media upload is now mandatory: file-read, media-upload or missing-media-ID failures stop before creating a public post. An acknowledged public-post response must contain a canonical publication ID before success is returned or logged.

X and LinkedIn no longer implement `scheduleVideo` by immediately publishing. They return an explicit unsupported/native-scheduling rejection without reading media or making provider calls. Managed worker due-time publishing remains the supported scheduling path for these adapters.

X and LinkedIn now track whether the public-post request has started. Failures before that boundary report `not_accepted` for the **public publication**, permitting existing safe retry policy where applicable. Failures after that boundary remain `unknown`; a timeout or HTTP error alone does not authorize another public post. A media asset may have been uploaded before a pre-publication failure; this contract does not claim media-asset rollback or orphan cleanup.

X, LinkedIn and YouTube share canonical external-ID validation and distinguish explicit denied access (401/403) from transient credential-verification failure. Transient failures propagate a classified error before worker dispatch instead of falsely declaring credentials invalid. YouTube token-refresh failure before video insertion reports no publication dispatch; failed insertion or a missing returned video ID remains uncertain. Existing YouTube quota/auth failure classification and native scheduling are preserved.

X/LinkedIn error results and logs redact configured credential values and omit raw Axios error/config objects. Added request timeouts bound their existing registration/upload/post operations. The canonical success result includes `externalId` and retains the existing `platformVideoId` compatibility alias. Success logs occur only after canonical-ID validation.

## Verification

| Check | Result |
|---|---|
| `npm run verify:production` | PASS: backend typecheck, 112 files / 451 tests, production build, AST route/build consistency |
| Changed-source/test ESLint | PASS: 0 errors / 0 warnings |
| `git diff --check` | PASS |

The route gate checks 351 registrations in 46 router files. No UI implementation changed in this increment. Raw log timestamps retain the host clock; report date follows the supplied session date. Final evidence is under `implementation-evidence/provider-contract-*`. New mocked-boundary regressions exercise required media, pre-post failure, missing media ID, public-post lost response, missing post/video ID, scheduling without posting, transient versus denied credential validation, redacted error logging, and YouTube refresh failure before insertion.

## Acceptance limits and compatibility

- Calling X or LinkedIn native scheduling now returns a failure instead of posting immediately. Callers must use the release queue's managed due time.
- A missing media/post identifier is a failure or hold; it is never a text-only success or an invented ID.
- These changes do not establish that existing provider endpoints, authentication mechanisms, multipart/video processing or permission checks meet current live platform requirements. Tests mock these boundaries; no live post, media upload or provider verification was sent.
- Facebook/Instagram contract normalization, provider processing/polling semantics, persisted refreshed credentials, deeper account/destination verification, reconciliation lookup and browser/live integration remain open. X/LinkedIn refresh methods remain unimplemented, and this increment does not claim otherwise.
- Public-post errors remain conservative when independent rejection proof is unavailable. Cross-process claims/transactions and media-orphan cleanup remain open.

No deployment, production migration or unrelated cleanup was performed. Full-repository lint and remaining remediation phases stay open; no phase is declared complete.
