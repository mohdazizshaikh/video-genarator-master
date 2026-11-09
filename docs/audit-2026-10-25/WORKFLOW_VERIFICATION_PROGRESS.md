# Workflow and route verification — 28 October 2026

Eighth implementation increment, addressing the placeholder workflow and string-only route checks in A19. The complete A19 acceptance criteria remain open.

## Workflow verification

The previous pipeline test asserted that a hard-coded state list contained `queued` and `rendered`. It is replaced by three composed workflow scenarios using actual Express route dispatch, `ShortCreator` queue completion and artifact/version registration, connector/secret stores, release approval/target/queue routes, the publish worker, checkpoint stores and operator-confirmation API.

Each scenario renders identical input for two authenticated workspaces, checks distinct owned versions/artifacts, rejects cross-workspace reads and queue attempts, and verifies that caller-supplied ownership cannot replace authenticated identity. The connector is created through the API, its test-only secret is encrypted, and its destination is verified through a mocked Telegram boundary before destination-bound approval.

The scenarios exercise:

1. Approved owned content reaches the publish adapter, the verified destination reaches the adapter, parent/job status reflects its canonical receipt, and duplicate worker delivery does not upload again.
2. A lost upload response holds the publication, blocks queue/repeated-worker retries, accepts a permission-guarded recorded observation and repairs the result without another upload.
3. A forged foreign queue payload and modified approved artifact are rejected before provider construction/upload or publication checkpoint dispatch.

This starts with caller-supplied scenes. It does not cover real news fetching, transcription, rendering quality, platform authentication or live delivery. The renderer boundary writes fixture bytes, queue dispatch is captured in memory, Telegram verification is mocked, and the publish adapter is mocked. Tests run without sockets against real Express middleware/routers; injected claims test tenant authorization, not token issuance/signature verification. Focused authentication tests remain separate.

## Route/build gate

The route command now parses source and compiled JavaScript with TypeScript's AST. It resolves direct class router registrations, router constructor instances, deferred handler assignments and middleware forwarding, default-import compilation and multiple router classes per file. The gate derives mount prefixes from actual `this.app.use` expressions instead of a hand-written filename map, then compares source/compiled mount sets and per-class method/path registrations.

It resolves **349 registrations in 46 router files**. Parser regression fixtures cover multiline calls, comments/strings containing fake route text, arrays, unresolved dynamic paths, deferred mounts, default imports, multiple classes and a path literal mounted to an unrelated router. An unresolved direct registration, unmounted class, missing compiled registration or changed compiled mount fails the command. Arrays containing unresolved paths also fail rather than silently accepting only static members.

This is static build consistency for the registration patterns used by this repository, not runtime route reachability, middleware-order proof, condition evaluation or complete Express metaprogramming support. It does not claim to discover arbitrary alias-based registration code. Actual request assertions and browser journeys remain necessary. The two router classes in `profiles.ts` are now checked separately; the old filename map incorrectly referred to a nonexistent `oauth.ts`.

## Verification and remaining work

| Check | Result |
|---|---|
| `npm run verify:production` | PASS: backend typecheck, 109 test files / 421 tests, production build and AST route/build consistency |
| Final route gate after build | PASS: 349 registrations / 46 router files, parser fixtures |
| Changed test/script ESLint | PASS: 0 errors / 0 warnings |
| `git diff --check` | PASS |

No UI implementation changed in this increment. Raw log timestamps reflect the host clock; report date follows the supplied session date. Final evidence is saved under `implementation-evidence/workflow-verification-*`. No live messages/uploads, production migrations or deployment occurred. Full-repository lint and all browser journeys remain open. P0/P9 and the original semantic-review backlog are not marked complete.
