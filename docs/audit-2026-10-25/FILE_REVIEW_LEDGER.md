# File and named-function review ledger

Every file below is accounted for. “Inventory” means parsed/indexed and examined through declarations, dependency/I/O/route signals; it does not mean its complete function bodies were manually verified. “Focused” means a substantive code-path/configuration review; it still does not imply exhaustive branch testing. “Partial” identifies source excerpts/call-site tracing. Documentation sections were catalogued and selected claims cross-checked. Binary assets were fingerprinted, not rendered.

Ignored runtime/generated/dependency directories (node_modules, tts-env, dist, data, cache, .git, voice-analysis, and the local ~ directory) are outside the Git source inventory. Local .env values are deliberately not copied. This is an explicit scope boundary, not a claim they were semantically audited.

## .dockerignore

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 6; bytes: 39.

## .editorconfig

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 10; bytes: 149.

## .env.example

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 142; bytes: 6589.

## .github/workflows/ci.yml

- Kind: configuration/data/asset; coverage: **Focused**; lines: 144; bytes: 4852.
- Findings: A20.

## .github/workflows/deploy.yml

- Kind: configuration/data/asset; coverage: **Focused**; lines: 155; bytes: 4684.

## .github/workflows/qa.yml

- Kind: configuration/data/asset; coverage: **Focused**; lines: 102; bytes: 3886.

## .github/workflows/security.yml

- Kind: configuration/data/asset; coverage: **Focused**; lines: 23; bytes: 477.

## .gitignore

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 45; bytes: 836.

## .npmrc

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 3; bytes: 47.

## .pnpm-build-allow-list

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 7; bytes: 87.

## .pnpmfile.cjs

- Kind: code; coverage: **Inventory**; lines: 8; bytes: 83.
- Named functions/methods: `readPackage` (L3).

## .prettierrc

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 7; bytes: 67.

## .replit

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 56; bytes: 921.

## API_ENDPOINTS.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 331; bytes: 17325.

## ARCHITECTURE_ANALYSIS.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 322; bytes: 10310.

## CONTRIBUTING.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 32; bytes: 612.

## CURRENT_STATUS.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 273; bytes: 56860.

## FRONTEND_INVENTORY.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 757; bytes: 28756.

## FRONTEND_TRACKING.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 501; bytes: 27501.

## LICENSE

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 22; bytes: 1068.

## MANUAL_VERIFICATION_CHECKLIST.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 156; bytes: 5238.

## MANUAL_VERIFICATION_LOG.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 157; bytes: 2363.

## PHASE_TRACKING.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 966; bytes: 47120.

## PHASE_WISE_RENDER_TRACKING.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 540; bytes: 32652.

## PRODUCTION_VERIFICATION_CHECKLIST.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 209; bytes: 5009.

## PROGRESS_STATUS.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 194; bytes: 5838.

## README.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 513; bytes: 15582.

## STATUS.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 417; bytes: 18939.

## STATUS_REPORT.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 57; bytes: 1591.

## __mocks__/node-cron.ts

- Kind: code; coverage: **Inventory**; lines: 21; bytes: 316.
- Named functions/methods: `schedule` (L5), `validate` (L11).

## __mocks__/pexels-response.json

- Kind: generated/reference; coverage: **Inventory**; lines: 12345; bytes: 377416.

## attached_assets/Pasted--19-Humanized-Content-Engine-yaml-id-6l3xyd-options-tal_1777797471535.txt

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 281; bytes: 4064.

## attached_assets/Pasted--COMBINED-FIX-PROMPT-Create-Video-Scheduler-No-Breakage_1778021222222.txt

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 183; bytes: 9527.

## attached_assets/Pasted--COMPLETION-PROMPT-v13-0-Incremental-Safe-LLM-Skipped-R_1778018161797.txt

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 196; bytes: 10478.

## attached_assets/Pasted--ULTIMATE-FINAL-MASTER-PROMPT-v11-0-AI-Viral-Content-Ma_1777767588341.txt

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 679; bytes: 9390.

## attached_assets/Pasted--ULTIMATE-FINAL-MASTER-PROMPT-v11-0-AI-Viral-Content-Ma_1778017015063.txt

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 569; bytes: 8956.

## attached_assets/Pasted-You-are-a-senior-full-stack-AI-architect-Your-task-is-N_1778001656682.txt

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 195; bytes: 3229.

## attached_assets/Pasted-You-are-a-senior-software-architect-and-DevOps-engineer_1777807835113.txt

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 211; bytes: 3570.

## codebase-index.json

- Kind: generated/reference; coverage: **Inventory**; lines: 7663; bytes: 192358.

## data/analysis/cmn9g3g6c000001s13rt010pi/frame_01.jpg

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 26804.

## data/analysis/cmn9g3g6c000001s13rt010pi/frame_02.jpg

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 56121.

## data/analysis/cmn9g3g6c000001s13rt010pi/frame_03.jpg

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 66475.

## data/analysis/cmn9g3g6c000001s13rt010pi/frame_04.jpg

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 23752.

## data/analysis/cmn9g3g6c000001s13rt010pi/frame_05.jpg

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 105238.

## data/analysis/cmn9g3g6c000001s13rt010pi/frame_06.jpg

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 41848.

## data/analysis/cmn9i41se000001s17anqfp5j/frame-01.png

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 654906.

## data/analysis/cmn9i41se000001s17anqfp5j/frame-02.png

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 694501.

## data/analysis/cmn9i41se000001s17anqfp5j/frame-03.png

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 656481.

## data/analysis/cmn9i41se000001s17anqfp5j/frame-04.png

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1385184.

## data/analysis/cmn9i41se000001s17anqfp5j/frame-05.png

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1505855.

## data/libs/whisper

- Kind: directory or submodule; coverage: **Inventory**; lines: n/a; bytes: n/a.

## database/migrate.sh

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 23; bytes: 597.

## database/migrations/001_init.js

- Kind: code; coverage: **Inventory**; lines: 131; bytes: 4521.
- Named functions/methods: `ensureDir` (L20), `ensureJsonFile` (L29).

## database/seed.sh

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 23; bytes: 557.

## database/seeders/001_seed_defaults.js

- Kind: code; coverage: **Inventory**; lines: 162; bytes: 9482.
- Named functions/methods: `readJson` (L21), `writeJson` (L28), `cuid` (L32).

## docker-compose.yml

- Kind: configuration/data/asset; coverage: **Focused**; lines: 88; bytes: 2419.

## docker-entrypoint.js

- Kind: code; coverage: **Inventory**; lines: 53; bytes: 1590.
- Named functions/methods: `ensureEspeakDataPath` (L10), `copyDirectoryIfMissing` (L25).

## docs/AADITECH_FIRST_REEL_PACKAGE.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 71; bytes: 4120.

## docs/AADITECH_PUBLIC_FACTS_AUDIT.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 35; bytes: 2334.

## docs/ADVANCED_OVERLAY_SYSTEMS.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 45; bytes: 4394.

## docs/AI_ENGINES_USAGE.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 189; bytes: 5068.

## docs/API.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 810; bytes: 29107.

## docs/ARCHITECTURE.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 203; bytes: 11248.

## docs/BACKUP_RESTORE_RUNBOOK.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 115; bytes: 8427.

## docs/CATEGORY_PIPELINE_MATRIX.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 49; bytes: 9703.

## docs/CLIENT_PROFILES.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 103; bytes: 4935.

## docs/DATABASE_SCHEMA.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 416; bytes: 13270.

## docs/DEPLOYMENT.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 342; bytes: 6876.

## docs/DEPLOYMENT_CHECKLIST.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 301; bytes: 8462.

## docs/FILES_CREATED.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 331; bytes: 10949.

## docs/GREENFIELD_RESET_EVIDENCE.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 41; bytes: 2838.

## docs/HUMAN_ENGINE.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 36; bytes: 3515.

## docs/IMPLEMENTATION_SUMMARY.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 289; bytes: 10020.

## docs/INDEPENDENT_CURRENT_MASTER_AUDIT.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 353; bytes: 37114.

## docs/INDEX.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 767; bytes: 74920.

## docs/IT_PRODUCT_SERVICES_OVERLAY.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 10; bytes: 1244.

## docs/LOCAL_DURABLE_SERVICES_SETUP.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 119; bytes: 5548.

## docs/LOCAL_TEST_AUTH.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 39; bytes: 1873.

## docs/MASTER_GAP_AUDIT_AND_IMPLEMENTATION_PLAN.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 199; bytes: 20897.

## docs/MASTER_TECHNICAL_AUDIT_REPORT.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 447; bytes: 44735.

## docs/MIGRATION_RUNBOOK.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 69; bytes: 4067.

## docs/MINIMAL_INTEGRATION.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 229; bytes: 6146.

## docs/MULTI_WORKSPACE_CONNECTOR_ARCHITECTURE.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 304; bytes: 24170.

## docs/NEW_FEATURES.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 476; bytes: 12723.

## docs/PHASE_2_TENANT_ISOLATION_HANDOFF.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 66; bytes: 9185.

## docs/PIPELINE.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 384; bytes: 10810.

## docs/POSTGRES_MINIO_MIGRATION_MATRIX.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 61; bytes: 7465.

## docs/PROMOTED_MASTER_MIGRATION_EVIDENCE.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 35; bytes: 3042.

## docs/REALITY_GAP_REGISTER.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 71; bytes: 12560.
- Findings: A27.

## docs/SYSTEM_MAP.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 546; bytes: 30905.

## docs/TELEGRAM_API_VERIFICATION_NOTES.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 16; bytes: 2213.

## docs/TESTING_CHECKLIST.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 206; bytes: 8028.

## docs/phase11-operations.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 32; bytes: 761.

## docs/phase7-engine-depth-study.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 32; bytes: 1055.

## docs/postman_collection.json

- Kind: generated/reference; coverage: **Inventory**; lines: 476; bytes: 15737.

## eslint.config.mjs

- Kind: code; coverage: **Inventory**; lines: 4; bytes: 79.

## main-cuda.Dockerfile

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 103; bytes: 2787.

## main-tiny.Dockerfile

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 103; bytes: 2883.

## main.Dockerfile

- Kind: configuration/data/asset; coverage: **Focused**; lines: 110; bytes: 3419.

## migrations/001_content_factory.sql

- Kind: configuration/data/asset; coverage: **Focused**; lines: 130; bytes: 5954.
- Python/shell/SQL declarations: `enforce_release_target_workspace` (L108).

## package.json

- Kind: configuration/data/asset; coverage: **Focused**; lines: 152; bytes: 6148.

## pnpm-lock.yaml

- Kind: generated/reference; coverage: **Inventory**; lines: 8229; bytes: 271122.

## postcss.config.js

- Kind: code; coverage: **Inventory**; lines: 6; bytes: 82.

## postcss.config.mjs

- Kind: code; coverage: **Inventory**; lines: 6; bytes: 70.

## remotion.config.ts

- Kind: code; coverage: **Inventory**; lines: 12; bytes: 467.

## replit.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 103; bytes: 6731.

## replit.nix

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 8; bytes: 70.

## rest.http

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 56; bytes: 1029.

## scripts/backup.mjs

- Kind: code; coverage: **Focused**; lines: 246; bytes: 12047.
- Named functions/methods: `valueFor` (L36), `hasFlag` (L42), `fail` (L43), `sha256` (L47), `sha256File` (L48), `run` (L60), `listFiles` (L65), `createBackup` (L83), `verifyBackup` (L186).
- Findings: A26.

## scripts/backup.sh

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 23; bytes: 1039.

## scripts/backupData.ts

- Kind: code; coverage: **Inventory**; lines: 27; bytes: 858.
- Named functions/methods: `run` (L5).

## scripts/copy-edge-tts-script.js

- Kind: code; coverage: **Inventory**; lines: 13; bytes: 473.

## scripts/deploy.sh

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 113; bytes: 4455.
- Python/shell/SQL declarations: `info` (L22), `success` (L23), `warn` (L24), `error` (L25), `step` (L26).

## scripts/healthcheck.sh

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 62; bytes: 2194.
- Python/shell/SQL declarations: `check` (L18).

## scripts/migrate-authenticated-ui-fetches.mjs

- Kind: code; coverage: **Inventory**; lines: 25; bytes: 871.
- Named functions/methods: `walk` (L7).

## scripts/migrations/apply.mjs

- Kind: code; coverage: **Focused**; lines: 60; bytes: 3954.
- Findings: A13.

## scripts/migrations/artifacts.mjs

- Kind: code; coverage: **Focused**; lines: 70; bytes: 6109.
- Named functions/methods: `prefixFor` (L20).

## scripts/migrations/backfill-release-approval.mjs

- Kind: code; coverage: **Inventory**; lines: 19; bytes: 822.

## scripts/migrations/backup.mjs

- Kind: code; coverage: **Inventory**; lines: 61; bytes: 4165.
- Named functions/methods: `valueFor` (L7), `digest` (L12), `listJsonFiles` (L13).

## scripts/migrations/evidence.mjs

- Kind: code; coverage: **Inventory**; lines: 35; bytes: 3312.
- Named functions/methods: `valueFor` (L7), `canonical` (L12).

## scripts/migrations/inspect-unowned-records.mjs

- Kind: code; coverage: **Inventory**; lines: 24; bytes: 1395.

## scripts/migrations/ownership-policy.mjs

- Kind: code; coverage: **Inventory**; lines: 31; bytes: 894.
- Named functions/methods: `isTenantScopedStore` (L28).

## scripts/migrations/preflight.mjs

- Kind: code; coverage: **Focused**; lines: 50; bytes: 2800.

## scripts/migrations/readiness.mjs

- Kind: code; coverage: **Focused**; lines: 44; bytes: 4166.
- Named functions/methods: `requiredEnv` (L12).
- Findings: A25.

## scripts/migrations/reconcile.mjs

- Kind: code; coverage: **Inventory**; lines: 49; bytes: 2666.

## scripts/migrations/reconciliation-decision.mjs

- Kind: code; coverage: **Inventory**; lines: 61; bytes: 5020.
- Named functions/methods: `valueFor` (L7), `canonical` (L14), `validTenant` (L15).

## scripts/migrations/register-fresh-workspace.mjs

- Kind: code; coverage: **Inventory**; lines: 17; bytes: 1228.

## scripts/migrations/remediation-plan.mjs

- Kind: code; coverage: **Inventory**; lines: 47; bytes: 3375.
- Named functions/methods: `argValue` (L7).

## scripts/migrations/repair-database-url.mjs

- Kind: code; coverage: **Inventory**; lines: 28; bytes: 1639.

## scripts/migrations/status.mjs

- Kind: code; coverage: **Inventory**; lines: 28; bytes: 1006.

## scripts/migrations/validate-config-shape.mjs

- Kind: code; coverage: **Inventory**; lines: 56; bytes: 2240.

## scripts/migrations/write-unowned-report.mjs

- Kind: code; coverage: **Inventory**; lines: 63; bytes: 2771.
- Named functions/methods: `code` (L16).

## scripts/plan-profile-account-connector-migration.mjs

- Kind: code; coverage: **Inventory**; lines: 50; bytes: 1721.
- Named functions/methods: `readJson` (L9).

## scripts/qa/allowlist.json

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 32; bytes: 597.

## scripts/qa/check-ai-mistakes.ts

- Kind: code; coverage: **Inventory**; lines: 145; bytes: 5064.
- Named functions/methods: `loadAllowlist` (L25), `isAllowed` (L29), `main` (L52).

## scripts/qa/check-docs-consistency.ts

- Kind: code; coverage: **Inventory**; lines: 106; bytes: 4877.
- Named functions/methods: `normalize` (L19), `stripVolatile` (L24), `main` (L31).

## scripts/qa/check-test-existence.ts

- Kind: code; coverage: **Inventory**; lines: 94; bytes: 3249.
- Named functions/methods: `gitChangedFiles` (L14), `main` (L46).

## scripts/qa/docs-lib.ts

- Kind: code; coverage: **Inventory**; lines: 169; bytes: 6698.
- Named functions/methods: `normalizePath` (L19), `normName` (L24), `findRouterClass` (L37), `routesForClass` (L55), `extractEndpoints` (L70), `extractRouterCount` (L94), `renderEndpointTable` (L100), `renderApiBlock` (L106), `renderRouterBlock` (L111), `renderStoreBlock` (L116), `readMarkerSection` (L135), `replaceMarkerSection` (L147).

## scripts/qa/generate-docs.ts

- Kind: code; coverage: **Inventory**; lines: 34; bytes: 1328.
- Named functions/methods: `main` (L16).

## scripts/qa/generate-index.ts

- Kind: code; coverage: **Inventory**; lines: 35; bytes: 1087.
- Named functions/methods: `shortCommit` (L15), `main` (L20).

## scripts/qa/index-lib.ts

- Kind: code; coverage: **Inventory**; lines: 196; bytes: 6794.
- Named functions/methods: `classifyType` (L46), `extractExports` (L62), `buildIndex` (L69), `buildRoutes` (L93), `buildPages` (L115), `findComponentFile` (L139), `buildStores` (L150), `renderIndexMd` (L164).

## scripts/qa/lib.ts

- Kind: code; coverage: **Inventory**; lines: 96; bytes: 3294.
- Named functions/methods: `walk` (L24), `rel` (L37), `readFile` (L41), `writeFile` (L45), `fileExists` (L49), `logFinding` (L53), `reportAndExit` (L58), `firstDocblock` (L73), `runCommand` (L87).

## scripts/qa/route-inventory.test.ts

- Kind: test; coverage: **Focused**; lines: 173; bytes: 5502.
- Named functions/methods: `extractRoutesFromFile` (L19), `getRouterMountPath` (L41), `normalizePath` (L96), `main` (L105).

## scripts/qa/two-tenant-acceptance.mjs

- Kind: code; coverage: **Inventory**; lines: 81; bytes: 4602.
- Named functions/methods: `auth` (L9), `get` (L15), `metrics` (L20), `probeTenant` (L24).

## scripts/render_edge_sample.ts

- Kind: code; coverage: **Inventory**; lines: 40; bytes: 2238.
- Named functions/methods: `main` (L27).

## scripts/restore.mjs

- Kind: code; coverage: **Focused**; lines: 206; bytes: 8886.
- Named functions/methods: `valueFor` (L34), `hasFlag` (L40), `finish` (L41), `sha256` (L46), `sha256File` (L47), `run` (L59), `listFiles` (L64), `verifyArchive` (L77), `restore` (L127).

## setup.sh

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 166; bytes: 6787.
- Python/shell/SQL declarations: `info` (L30), `success` (L31), `warn` (L32), `error` (L33), `step` (L34), `check_cmd` (L47).

## src/INTEGRATION_GUIDE.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 328; bytes: 8706.

## src/agents/agent-loop.service.ts

- Kind: code; coverage: **Inventory**; lines: 211; bytes: 6659.
- Named functions/methods: `constructor` (L37), `runLoop` (L53).

## src/aggregator/ReportMerger.test.ts

- Kind: test; coverage: **Inventory**; lines: 39; bytes: 1126.

## src/aggregator/ReportMerger.ts

- Kind: code; coverage: **Inventory**; lines: 56; bytes: 1411.
- Named functions/methods: `mergeReports` (L20).

## src/assets/asset.service.ts

- Kind: code; coverage: **Inventory**; lines: 205; bytes: 5669.
- Named functions/methods: `constructor` (L29), `initializeSources` (L38), `getVideoWithFallback` (L61), `findLocalAsset` (L110), `generateFallbackAsset` (L154), `getLocalAssetStats` (L168), `registerSource` (L197).

## src/components/root/Root.tsx

- Kind: code; coverage: **Inventory**; lines: 332; bytes: 9377.
- Named functions/methods: `calculateMetadata` (L12), `RemotionRoot` (L22).

## src/components/root/index.ts

- Kind: code; coverage: **Inventory**; lines: 5; bytes: 109.

## src/components/types.ts

- Kind: code; coverage: **Inventory**; lines: 11; bytes: 254.

## src/components/utils.ts

- Kind: code; coverage: **Inventory**; lines: 181; bytes: 4741.
- Named functions/methods: `createCaptionPages` (L53), `getOrientationConfig` (L148), `calculateVolume` (L165).

## src/components/videos/AdvancedKnowledgeOverlay.tsx

- Kind: code; coverage: **Inventory**; lines: 62; bytes: 3445.
- Named functions/methods: `AdvancedKnowledgeOverlay` (L20).

## src/components/videos/CategoryOverlay.tsx

- Kind: code; coverage: **Inventory**; lines: 77; bytes: 2572.
- Named functions/methods: `CategoryOverlay` (L19).

## src/components/videos/CategoryPipelineProfiles.test.ts

- Kind: test; coverage: **Inventory**; lines: 36; bytes: 1650.

## src/components/videos/CategoryPipelineProfiles.ts

- Kind: code; coverage: **Inventory**; lines: 64; bytes: 7892.
- Named functions/methods: `normalizePipelineCategory` (L53), `resolveCategoryPipeline` (L61).

## src/components/videos/ContentTemplateEngine.test.ts

- Kind: test; coverage: **Inventory**; lines: 144; bytes: 4688.
- Named functions/methods: `scenes` (L8).

## src/components/videos/ContentTemplateEngine.ts

- Kind: code; coverage: **Inventory**; lines: 350; bytes: 9625.
- Named functions/methods: `normalize` (L227), `looksNumbered` (L231), `buildHaystack` (L241), `templateById` (L270), `listContentTemplates` (L273), `resolveContentTemplate` (L277), `pickTemplateChrome` (L330).

## src/components/videos/ITProductShowcaseOverlay.tsx

- Kind: code; coverage: **Inventory**; lines: 63; bytes: 4981.
- Named functions/methods: `serviceLabel` (L15), `capabilityChip` (L28), `ITProductShowcaseOverlay` (L39).

## src/components/videos/LandscapeVideo.tsx

- Kind: code; coverage: **Inventory**; lines: 253; bytes: 8241.
- Named functions/methods: `LandscapeVideo` (L25), `SceneMedia` (L196).

## src/components/videos/LongFormVideo.tsx

- Kind: code; coverage: **Inventory**; lines: 275; bytes: 10475.
- Named functions/methods: `LongFormVideo` (L27), `buildChapterLabel` (L61).

## src/components/videos/MarketingOverlay.tsx

- Kind: code; coverage: **Inventory**; lines: 141; bytes: 3661.
- Named functions/methods: `MarketingOverlay` (L18).

## src/components/videos/NewsOverlay.tsx

- Kind: code; coverage: **Inventory**; lines: 307; bytes: 9257.
- Named functions/methods: `resolveOverlayTheme` (L23), `NewsOverlay` (L65).

## src/components/videos/PortraitVideo.tsx

- Kind: code; coverage: **Partial**; lines: 306; bytes: 10572.
- Named functions/methods: `PortraitVideo` (L30), `SceneMedia` (L249).

## src/components/videos/SportsOverlay.tsx

- Kind: code; coverage: **Inventory**; lines: 70; bytes: 3813.
- Named functions/methods: `sportLabel` (L19), `SportsOverlay` (L28).

## src/components/videos/TemplateChrome.tsx

- Kind: code; coverage: **Inventory**; lines: 124; bytes: 3753.
- Named functions/methods: `anchorStyle` (L15), `TemplateChrome` (L29).

## src/components/videos/Test.tsx

- Kind: code; coverage: **Inventory**; lines: 17; bytes: 372.
- Named functions/methods: `TestVideo` (L3).

## src/components/videos/ThemeEngine.ts

- Kind: code; coverage: **Inventory**; lines: 344; bytes: 10386.
- Named functions/methods: `normalize` (L276), `matchesKeywords` (L283), `stableHash` (L288), `resolveTheme` (L297), `pickTemplateVariant` (L338).

## src/components/videos/fontStacks.ts

- Kind: code; coverage: **Inventory**; lines: 9; bytes: 375.

## src/config.ts

- Kind: code; coverage: **Inventory**; lines: 301; bytes: 11172.
- Named functions/methods: `expandHomeDir` (L8), `constructor` (L162), `ensureConfig` (L287), `isDevMode` (L298).

## src/config/categories.ts

- Kind: code; coverage: **Inventory**; lines: 58; bytes: 1158.
- Named functions/methods: `normalizeCategory` (L46), `isContentCategory` (L55).

## src/config/channelRules.ts

- Kind: code; coverage: **Inventory**; lines: 78; bytes: 2083.
- Named functions/methods: `getCategoryRule` (L75).

## src/config/featureFlags.ts

- Kind: code; coverage: **Focused**; lines: 60; bytes: 2126.
- Named functions/methods: `getFeatureFlags` (L55).

## src/config/languageSupport.ts

- Kind: code; coverage: **Inventory**; lines: 41; bytes: 1406.
- Named functions/methods: `defaultVoiceForLanguage` (L18), `labelForLanguage` (L22), `toSpeechSynthesisLocale` (L26).

## src/config/validate.ts

- Kind: code; coverage: **Focused**; lines: 197; bytes: 7200.
- Named functions/methods: `isValidUrl` (L71), `isValidCron` (L83), `isValidHex32` (L91), `validateEnvironment` (L98), `runEnvironmentValidation` (L177).

## src/db/ABVariantStore.test.ts

- Kind: test; coverage: **Inventory**; lines: 19; bytes: 686.

## src/db/ABVariantStore.ts

- Kind: code; coverage: **Inventory**; lines: 71; bytes: 2163.
- Named functions/methods: `constructor` (L20), `readAll` (L28), `writeAll` (L34), `create` (L38), `list` (L54), `assign` (L58).

## src/db/AiLearningStore.test.ts

- Kind: test; coverage: **Inventory**; lines: 47; bytes: 2163.

## src/db/AiLearningStore.ts

- Kind: code; coverage: **Inventory**; lines: 154; bytes: 4667.
- Named functions/methods: `constructor` (L46), `readEvents` (L76), `writeEvents` (L86), `addEventForTenant` (L90), `listEventsForTenant` (L107), `defaultModelState` (L115), `getModelStateForTenant` (L125), `saveModelStateForTenant` (L139).

## src/db/AnalyticsStore.test.ts

- Kind: test; coverage: **Inventory**; lines: 28; bytes: 1705.

## src/db/AnalyticsStore.ts

- Kind: code; coverage: **Inventory**; lines: 104; bytes: 3770.
- Named functions/methods: `constructor` (L25), `readAll` (L33), `writeAll` (L39), `upsertForTenant` (L43), `upsert` (L59), `getByVideoForTenant` (L80), `getByVideo` (L85), `getByPlatform` (L89), `listForTenant` (L93), `list` (L98).

## src/db/ArtifactManifestStore.test.ts

- Kind: test; coverage: **Inventory**; lines: 50; bytes: 1984.

## src/db/ArtifactManifestStore.ts

- Kind: code; coverage: **Focused**; lines: 111; bytes: 4042.
- Named functions/methods: `requireTenantId` (L26), `ownerPrefix` (L31), `constructor` (L40), `load` (L44), `persist` (L56), `register` (L63), `listForTenant` (L85), `findForTenant` (L91), `findByLocalPathForTenant` (L97), `quarantineLegacy` (L103).

## src/db/AudienceStore.test.ts

- Kind: test; coverage: **Inventory**; lines: 26; bytes: 1466.

## src/db/AudienceStore.ts

- Kind: code; coverage: **Inventory**; lines: 58; bytes: 1725.
- Named functions/methods: `constructor` (L19), `readAll` (L27), `writeAll` (L33), `add` (L37), `listForTenant` (L49), `list` (L54).

## src/db/ChannelConfigStore.test.ts

- Kind: test; coverage: **Inventory**; lines: 34; bytes: 1659.

## src/db/ChannelConfigStore.ts

- Kind: code; coverage: **Inventory**; lines: 87; bytes: 2476.
- Named functions/methods: `constructor` (L18), `readAll` (L26), `writeAll` (L37), `list` (L41), `listForTenant` (L45), `create` (L50), `deleteForTenant` (L68), `delete` (L78).

## src/db/ConnectorSecretStore.test.ts

- Kind: test; coverage: **Inventory**; lines: 49; bytes: 2361.
- Named functions/methods: `makeStore` (L12).

## src/db/ConnectorSecretStore.ts

- Kind: code; coverage: **Inventory**; lines: 66; bytes: 2626.
- Named functions/methods: `constructor` (L24), `read` (L30), `write` (L39), `put` (L44), `get` (L52), `remove` (L58).

## src/db/ConnectorStore.test.ts

- Kind: test; coverage: **Inventory**; lines: 75; bytes: 2594.
- Named functions/methods: `makeStore` (L13).

## src/db/ConnectorStore.ts

- Kind: code; coverage: **Inventory**; lines: 159; bytes: 5906.
- Named functions/methods: `constructor` (L52), `read` (L56), `write` (L68), `id` (L73), `now` (L77), `createConnector` (L81), `listConnectors` (L99), `getConnector` (L103), `updateConnector` (L109), `createDestination` (L120), `listDestinations` (L140), `updateDestination` (L148).

## src/db/ContentAutomationRuleStore.test.ts

- Kind: test; coverage: **Inventory**; lines: 30; bytes: 1387.

## src/db/ContentAutomationRuleStore.ts

- Kind: code; coverage: **Inventory**; lines: 82; bytes: 2729.
- Named functions/methods: `constructor` (L25), `readAllSync` (L31), `writeAllSync` (L40), `listForTenant` (L44), `listEnabled` (L49), `create` (L53), `setEnabled` (L72).

## src/db/ContentVersionStore.test.ts

- Kind: test; coverage: **Inventory**; lines: 47; bytes: 1995.
- Named functions/methods: `tempDir` (L7), `input` (L11).

## src/db/ContentVersionStore.ts

- Kind: code; coverage: **Focused**; lines: 92; bytes: 4041.
- Named functions/methods: `constructor` (L29), `read` (L33), `write` (L42), `create` (L49), `getForWorkspace` (L64), `listForWorkspace` (L68), `updateDraft` (L72), `updateRender` (L83).
- Findings: A12.

## src/db/CustomNewsSourceStore.test.ts

- Kind: test; coverage: **Inventory**; lines: 51; bytes: 1703.

## src/db/CustomNewsSourceStore.ts

- Kind: code; coverage: **Inventory**; lines: 99; bytes: 3016.
- Named functions/methods: `constructor` (L19), `readAllSync` (L27), `writeAllSync` (L38), `normalizeComparableUrl` (L42), `listSync` (L55), `list` (L60), `add` (L64).

## src/db/DualWriteReadVerify.test.ts

- Kind: test; coverage: **Inventory**; lines: 29; bytes: 1158.

## src/db/DualWriteReadVerify.ts

- Kind: code; coverage: **Focused**; lines: 61; bytes: 2620.
- Named functions/methods: `stable` (L23), `hash` (L29), `differences` (L33), `compareReadModels` (L42), `shadowWriteAndReadVerify` (L54).

## src/db/JobEventOutboxStore.test.ts

- Kind: test; coverage: **Inventory**; lines: 31; bytes: 1533.

## src/db/JobEventOutboxStore.ts

- Kind: code; coverage: **Focused**; lines: 139; bytes: 4836.
- Named functions/methods: `ownerOf` (L19), `constructor` (L31), `load` (L35), `persist` (L48), `enqueue` (L55), `listPending` (L77), `markDelivered` (L87), `retry` (L91), `requeue` (L107), `listForTenant` (L120), `transition` (L126).

## src/db/JobEventRelease.test.ts

- Kind: test; coverage: **Inventory**; lines: 35; bytes: 2074.

## src/db/JobEventStore.ts

- Kind: code; coverage: **Focused**; lines: 83; bytes: 2468.
- Named functions/methods: `tenant` (L16), `constructor` (L28), `load` (L32), `persist` (L43), `append` (L50), `listForTenant` (L73).
- Findings: A09.

## src/db/MigrationCheckpointStore.test.ts

- Kind: test; coverage: **Inventory**; lines: 27; bytes: 1323.

## src/db/MigrationCheckpointStore.ts

- Kind: code; coverage: **Inventory**; lines: 78; bytes: 2769.
- Named functions/methods: `constructor` (L15), `list` (L20), `get` (L24), `verify` (L29), `recordApplied` (L38), `load` (L51), `persist` (L65), `checksum` (L72).

## src/db/PipelineStore.test.ts

- Kind: test; coverage: **Inventory**; lines: 37; bytes: 2555.

## src/db/PipelineStore.ts

- Kind: code; coverage: **Inventory**; lines: 306; bytes: 11740.
- Named functions/methods: `constructor` (L90), `initFile` (L99), `read` (L106), `write` (L112), `createJob` (L116), `updateJobForTenant` (L136), `updateJob` (L141), `getJobForTenant` (L150), `getJob` (L156), `listJobsForTenant` (L161), `listJobs` (L167), `saveVariation` (L172), `getVariationsForJobForTenant` (L184), `getVariationsForJob` (L190), `getStatsForTenant` (L195), `getStats` (L214), `createComparison` (L231), `getComparisonForTenant` (L247), `updateComparisonEntryForTenant` (L253), `updateComparison` (L258), `updateComparisonEntry` (L267), `getComparison` (L290), `listComparisonsForTenant` (L295), `listComparisons` (L301).

## src/db/ProfileAccountStore.ts

- Kind: code; coverage: **Inventory**; lines: 103; bytes: 3034.
- Named functions/methods: `constructor` (L9), `readAll` (L17), `writeAll` (L28), `list` (L32), `listByProfile` (L36), `get` (L41), `create` (L46), `update` (L78), `remove` (L94).

## src/db/ProfileStore.ts

- Kind: code; coverage: **Inventory**; lines: 135; bytes: 4120.
- Named functions/methods: `constructor` (L9), `readAll` (L17), `writeAll` (L28), `list` (L32), `listForTenant` (L36), `get` (L42), `getForTenant` (L47), `create` (L53), `updateForTenant` (L76), `update` (L85), `addAccountId` (L101), `removeAccountId` (L112), `removeForTenant` (L121), `remove` (L126).

## src/db/PublishJobStore.test.ts

- Kind: test; coverage: **Inventory**; lines: 56; bytes: 2120.

## src/db/PublishJobStore.ts

- Kind: code; coverage: **Inventory**; lines: 210; bytes: 7431.
- Named functions/methods: `constructor` (L10), `readJobs` (L21), `writeJobs` (L27), `readAttempts` (L31), `writeAttempts` (L37), `createJob` (L41), `getJob` (L84), `getJobForTenant` (L88), `listJobs` (L94), `listJobsForTenant` (L100), `listJobsByStatus` (L107), `listJobsByStatusForTenant` (L111), `findDuplicate` (L117), `findDuplicateForTenant` (L123), `updateJobStatus` (L130), `updateJobStatusForTenant` (L143), `incrementAttempt` (L153), `incrementAttemptForTenant` (L163), `addAttempt` (L168), `getAttempts` (L190), `getAttemptsForTenant` (L194), `getStats` (L199).

## src/db/ReleaseControlStore.ts

- Kind: code; coverage: **Focused**; lines: 23; bytes: 2681.
- Named functions/methods: `tenant` (L9), `constructor` (L15), `load` (L16), `persist` (L17), `create` (L18), `getForTenant` (L19), `listForTenant` (L20), `transitionForTenant` (L21).

## src/db/ReleaseStore.test.ts

- Kind: test; coverage: **Inventory**; lines: 131; bytes: 5316.
- Named functions/methods: `makeStore` (L12).

## src/db/ReleaseStore.ts

- Kind: code; coverage: **Focused**; lines: 161; bytes: 5820.
- Named functions/methods: `constructor` (L51), `read` (L55), `write` (L67), `id` (L72), `now` (L76), `createRelease` (L80), `approveRelease` (L96), `getRelease` (L110), `listReleases` (L114), `listTargets` (L120), `getTarget` (L124), `createTarget` (L128), `updateTarget` (L149).

## src/db/RenderJobStore.test.ts

- Kind: test; coverage: **Inventory**; lines: 48; bytes: 1994.
- Named functions/methods: `createParams` (L10).

## src/db/RenderJobStore.ts

- Kind: code; coverage: **Inventory**; lines: 151; bytes: 5181.
- Named functions/methods: `constructor` (L9), `readAll` (L17), `writeAll` (L28), `create` (L32), `get` (L60), `getForTenant` (L64), `list` (L70), `listForTenant` (L76), `listByStatus` (L83), `listByStatusForTenant` (L87), `updateStatus` (L92), `updateStatusForTenant` (L105), `incrementAttempt` (L115), `incrementAttemptForTenant` (L125), `findByNamingKey` (L131), `findByNamingKeyForTenant` (L135), `getStats` (L140).

## src/db/ReportStore.test.ts

- Kind: test; coverage: **Inventory**; lines: 63; bytes: 2330.

## src/db/ReportStore.ts

- Kind: code; coverage: **Inventory**; lines: 95; bytes: 3054.
- Named functions/methods: `constructor` (L25), `readAll` (L30), `writeAll` (L43), `add` (L47), `listForTenant` (L60), `list` (L67), `getForTenant` (L71), `get` (L77), `updateStatusForTenant` (L81), `updateStatus` (L86).

## src/db/ScheduleStore.test.ts

- Kind: test; coverage: **Inventory**; lines: 35; bytes: 2785.

## src/db/ScheduleStore.ts

- Kind: code; coverage: **Partial**; lines: 257; bytes: 9626.
- Named functions/methods: `constructor` (L50), `readAll` (L58), `writeAll` (L69), `createForTenant` (L73), `create` (L78), `getForTenant` (L94), `get` (L99), `listForTenant` (L103), `list` (L110), `listActiveForTenant` (L119), `listActive` (L124), `listByVideo` (L129), `updateForTenant` (L134), `update` (L144), `updateStatusForTenant` (L153), `updateStatus` (L157), `recordRunForTenant` (L161), `recordRun` (L172), `deleteForTenant` (L189), `delete` (L199), `getStatsForTenant` (L208), `getStats` (L223), `getDueSchedules` (L244), `getDueSchedulesForTenant` (L250).
- Findings: A31.

## src/db/ScriptPlanStore.ts

- Kind: code; coverage: **Inventory**; lines: 67; bytes: 2139.
- Named functions/methods: `constructor` (L17), `readAll` (L22), `writeAll` (L35), `add` (L39), `listForTenant` (L46), `list` (L53), `getForTenant` (L57), `get` (L63).

## src/db/TenantStore.test.ts

- Kind: test; coverage: **Inventory**; lines: 38; bytes: 1545.

## src/db/TenantStore.ts

- Kind: code; coverage: **Inventory**; lines: 225; bytes: 7491.
- Named functions/methods: `constructor` (L33), `readAll` (L41), `writeAll` (L52), `create` (L56), `list` (L84), `get` (L88), `getForTenant` (L93), `listForTenant` (L98), `updateWorkspaceForTenant` (L104), `updateKeysForTenant` (L118), `updateKeys` (L123), `updateEngineConfigForTenant` (L136), `updateEngineConfig` (L145), `updateEncryptedKeysForTenant` (L164), `deleteEncryptedKeyForTenant` (L169), `updateEncryptedKeys` (L181), `updateQuotasForTenant` (L197), `updateQuotas` (L206).

## src/db/TenantUsageStore.ts

- Kind: code; coverage: **Inventory**; lines: 50; bytes: 1466.
- Named functions/methods: `constructor` (L16), `readAll` (L24), `writeAll` (L30), `upsert` (L34), `get` (L46).

## src/db/VideoLibraryStore.test.ts

- Kind: test; coverage: **Inventory**; lines: 51; bytes: 2288.
- Named functions/methods: `videoData` (L8).

## src/db/VideoLibraryStore.ts

- Kind: code; coverage: **Inventory**; lines: 262; bytes: 9806.
- Named functions/methods: `constructor` (L34), `readAll` (L42), `writeAll` (L53), `create` (L57), `get` (L72), `getForTenant` (L76), `list` (L82), `listForTenant` (L91), `listByCategory` (L98), `listByStatus` (L103), `listByPlatform` (L108), `searchForTenant` (L113), `search` (L122), `updateForTenant` (L130), `update` (L135), `updateStatusForTenant` (L144), `updateStatus` (L148), `deleteForTenant` (L152), `delete` (L157), `updateMetricsForTenant` (L166), `updateMetrics` (L184), `getStatsForTenant` (L201), `getStats` (L220), `getTrendingTagsForTenant` (L240), `getTrendingTags` (L248).

## src/db/VideoMetadataStore.test.ts

- Kind: test; coverage: **Inventory**; lines: 45; bytes: 2125.

## src/db/VideoMetadataStore.ts

- Kind: code; coverage: **Focused**; lines: 141; bytes: 4466.
- Named functions/methods: `constructor` (L8), `buildRecord` (L16), `readAllSync` (L61), `readAll` (L72), `writeAllSync` (L76), `writeAll` (L80), `upsertFromScenesSync` (L84), `upsertFromScenes` (L106), `findBySignatureSync` (L128), `get` (L132), `listForTenant` (L136).

## src/enhanced-types.ts

- Kind: code; coverage: **Inventory**; lines: 270; bytes: 6254.

## src/feedback/feedback.service.ts

- Kind: code; coverage: **Partial**; lines: 174; bytes: 5252.
- Named functions/methods: `analyzeScript` (L28), `generateImprovementPrompt` (L124), `shouldRetry` (L151), `hasHookKeywords` (L168).

## src/index.ts

- Kind: code; coverage: **Focused**; lines: 163; bytes: 6330.
- Named functions/methods: `main` (L11).
- Findings: A14.

## src/integration/pipeline.e2e.test.ts

- Kind: test; coverage: **Focused**; lines: 12; bytes: 473.
- Findings: A19.

## src/logger.ts

- Kind: code; coverage: **Inventory**; lines: 5; bytes: 78.

## src/memory/memory.service.ts

- Kind: code; coverage: **Partial**; lines: 218; bytes: 5911.
- Named functions/methods: `constructor` (L39), `loadPatterns` (L48), `savePatterns` (L65), `savePattern` (L76), `getTopPatterns` (L119), `getSimilarPatterns` (L140), `pruneOldPatterns` (L162), `updatePatternEngagement` (L177), `getStats` (L192).

## src/metadata/metadata.service.ts

- Kind: code; coverage: **Inventory**; lines: 353; bytes: 9106.
- Named functions/methods: `generateMetadata` (L70), `generateTitle` (L114), `generateDescription` (L174), `generateHashtags` (L229), `extractKeyPhrases` (L287), `isValidPhrase` (L308), `addRelevantEmoji` (L335).

## src/news-fetcher/RssFetcher.test.ts

- Kind: test; coverage: **Inventory**; lines: 75; bytes: 2370.

## src/news-fetcher/RssFetcher.ts

- Kind: code; coverage: **Partial**; lines: 281; bytes: 10889.
- Named functions/methods: `constructor` (L96), `listSourcesSync` (L104), `mapCustomSource` (L110), `findSource` (L121), `validateFeedUrl` (L125), `getSourceTrustScore` (L139), `selectSourcesForAggregation` (L146), `buildStoryFingerprint` (L176), `calculateFreshnessScore` (L186), `fetchStories` (L207), `fetchStoriesFromSources` (L238).
- Findings: A30.

## src/news-fetcher/RssFetcher.validation.test.ts

- Kind: test; coverage: **Inventory**; lines: 52; bytes: 1494.

## src/predict/predict.service.ts

- Kind: code; coverage: **Inventory**; lines: 195; bytes: 5498.
- Named functions/methods: `constructor` (L17), `assessTopic` (L22), `predictEngagement` (L134).

## src/publishers/FacebookPublisher.ts

- Kind: code; coverage: **Partial**; lines: 352; bytes: 13224.
- Named functions/methods: `constructor` (L22), `validateCredentials` (L27), `refreshToken` (L42), `getVideoLimits` (L60), `getCapabilities` (L74), `uploadVideo` (L87), `uploadRegularVideo` (L104), `uploadReel` (L144), `resumableUpload` (L221), `scheduleVideo` (L301), `buildDescription` (L340), `isConfigured` (L348).

## src/publishers/InstagramPublisher.ts

- Kind: code; coverage: **Partial**; lines: 237; bytes: 8980.
- Named functions/methods: `constructor` (L23), `validateCredentials` (L29), `refreshToken` (L44), `getVideoLimits` (L62), `getCapabilities` (L76), `uploadVideo` (L89), `scheduleVideo` (L153), `pollContainerReady` (L189), `postComment` (L209), `buildCaption` (L224), `isConfigured` (L233).

## src/publishers/LinkedInPublisher.ts

- Kind: code; coverage: **Focused**; lines: 106; bytes: 3861.
- Named functions/methods: `constructor` (L12), `headers` (L17), `registerAndUpload` (L25), `uploadVideo` (L48), `scheduleVideo` (L81), `refreshToken` (L86), `validateCredentials` (L90), `getVideoLimits` (L98), `isConfigured` (L102).

## src/publishers/PlatformLimits.test.ts

- Kind: test; coverage: **Inventory**; lines: 52; bytes: 1654.
- Named functions/methods: `createTempVideo` (L11).

## src/publishers/PlatformLimits.ts

- Kind: code; coverage: **Focused**; lines: 135; bytes: 3811.
- Named functions/methods: `getPlatformLimits` (L63), `enforcePlatformMetadataLimits` (L67), `validatePublishPayload` (L91).

## src/publishers/PlatformPublisher.ts

- Kind: code; coverage: **Focused**; lines: 72; bytes: 1963.
- Findings: A24.

## src/publishers/PublisherFactory.ts

- Kind: code; coverage: **Focused**; lines: 116; bytes: 3847.
- Named functions/methods: `createPublisher` (L26), `createPublisherForAccount` (L98).

## src/publishers/TelegramPublisher.test.ts

- Kind: test; coverage: **Inventory**; lines: 77; bytes: 5425.
- Named functions/methods: `publisher` (L15).

## src/publishers/TelegramPublisher.ts

- Kind: code; coverage: **Focused**; lines: 113; bytes: 4110.
- Named functions/methods: `constructor` (L20), `validateCredentials` (L22), `refreshToken` (L38), `getVideoLimits` (L40), `uploadVideo` (L52), `scheduleVideo` (L107).

## src/publishers/XTwitterPublisher.ts

- Kind: code; coverage: **Focused**; lines: 95; bytes: 3418.
- Named functions/methods: `constructor` (L15), `truncateText` (L29), `uploadVideo` (L34), `scheduleVideo` (L67), `refreshToken` (L72), `validateCredentials` (L76), `getVideoLimits` (L87), `isConfigured` (L91).

## src/publishers/YouTubePublisher.test.ts

- Kind: test; coverage: **Inventory**; lines: 79; bytes: 2973.
- Named functions/methods: `setCredentials` (L9), `refreshAccessToken` (L10), `publisher` (L34).

## src/publishers/YouTubePublisher.ts

- Kind: code; coverage: **Focused**; lines: 122; bytes: 4607.
- Named functions/methods: `constructor` (L18), `validateCredentials` (L28), `refreshToken` (L40), `getVideoLimits` (L46), `uploadVideo` (L58), `scheduleVideo` (L118).

## src/publishers/failureClassification.test.ts

- Kind: test; coverage: **Inventory**; lines: 132; bytes: 7677.

## src/publishers/failureClassification.ts

- Kind: code; coverage: **Inventory**; lines: 194; bytes: 7726.
- Named functions/methods: `constructor` (L41), `isPublishFailureCode` (L79), `isRetryableFailureCode` (L83), `sanitizeProviderMessage` (L91), `inferFailureCodeFromText` (L112), `codeFromHttpStatus` (L128), `classifyFailure` (L151), `toPublishFailureError` (L168), `collectSecretValues` (L181).

## src/script-generator/AiLlmGenerator.test.ts

- Kind: test; coverage: **Inventory**; lines: 119; bytes: 4216.

## src/script-generator/AiLlmGenerator.ts

- Kind: code; coverage: **Inventory**; lines: 849; bytes: 30530.
- Named functions/methods: `configureLlmDefaults` (L54), `constructor` (L63), `effectiveOptions` (L73), `useOpenRouter` (L77), `openRouterModelsList` (L83), `complete` (L92), `completeOpenRouter` (L106), `completeOllama` (L162), `targetSceneCount` (L175), `normalizeKeywordList` (L187), `languageDisplay` (L195), `getRelevantPriorityKeywords` (L210), `mergePriorityTerms` (L231), `normalizePromptText` (L239), `storyFingerprint` (L247), `keywordRelevanceScore` (L255), `freshnessScore` (L267), `rankStoriesForPrompt` (L279), `scoreHookOption` (L327), `rankHookOptions` (L404), `translateText` (L414), `transliterateText` (L423), `suggestTopics` (L437), `suggestHooks` (L480), `generateScript` (L522), `formatStories` (L712), `extractJson` (L722), `safe` (L723), `fallbackTopics` (L788), `fallbackHooks` (L818).

## src/scripts/fetchReports.ts

- Kind: code; coverage: **Inventory**; lines: 58; bytes: 1702.
- Named functions/methods: `fetchReports` (L6).

## src/scripts/install.ts

- Kind: code; coverage: **Inventory**; lines: 33; bytes: 1041.
- Named functions/methods: `install` (L10).

## src/scripts/normalizeMusic.ts

- Kind: code; coverage: **Inventory**; lines: 61; bytes: 1838.
- Named functions/methods: `normalize` (L10), `normalizeMusic` (L32).

## src/server/auth.ts

- Kind: code; coverage: **Focused**; lines: 110; bytes: 3475.
- Named functions/methods: `getAuthenticatedTenantId` (L16), `isAdminRequest` (L21), `adminKeyConfigured` (L25), `requireAdminKey` (L34), `requireAuth` (L53), `isValidRenderMediaRequest` (L72), `validateTokenIfPresent` (L81), `logAdminKeyStatus` (L103).

## src/server/rateLimit.test.ts

- Kind: test; coverage: **Inventory**; lines: 9; bytes: 234.

## src/server/rateLimit.ts

- Kind: code; coverage: **Inventory**; lines: 13; bytes: 274.

## src/server/readiness.ts

- Kind: code; coverage: **Inventory**; lines: 9; bytes: 242.

## src/server/routers/abtesting.ts

- Kind: code; coverage: **Focused**; lines: 70; bytes: 2622.
- Named functions/methods: `tenantIdFrom` (L7), `constructor` (L17), `register` (L24).
- Route/middleware registrations: `GET /` (L27), `POST /` (L31), `GET /running` (L37), `GET /:id` (L41), `POST /:id/event` (L47), `GET /:id/analyze` (L54), `POST /:id/pause` (L59), `POST /:id/resume` (L64).

## src/server/routers/account.ts

- Kind: code; coverage: **Inventory**; lines: 84; bytes: 2546.
- Named functions/methods: `constructor` (L12), `registerRoutes` (L18).
- Route/middleware registrations: `POST /metrics` (L21), `POST /guidance` (L39), `GET /load` (L51), `POST /save` (L73).

## src/server/routers/ai.ts

- Kind: code; coverage: **Inventory**; lines: 120; bytes: 5181.
- Named functions/methods: `constructor` (L17), `registerRoutes` (L28), `addEvent` (L37), `listEvents` (L52), `train` (L59), `getModel` (L66), `suggest` (L74), `dashboard` (L86), `jsonMiddleware` (L115).
- Route/middleware registrations: `POST /events` (L29), `GET /events` (L30), `POST /train` (L31), `GET /model` (L32), `POST /suggest` (L33), `GET /dashboard` (L34).

## src/server/routers/approval.ts

- Kind: code; coverage: **Partial**; lines: 121; bytes: 5653.
- Named functions/methods: `tenantIdFrom` (L8), `canHumanReview` (L13), `constructor` (L26), `register` (L35).
- Route/middleware registrations: `GET /queue` (L39), `GET /queue/pending` (L42), `GET /queue/stats` (L45), `POST /queue/submit` (L48), `POST /queue/:id/auto-check` (L56), `POST /queue/:id/review` (L64), `PATCH /queue/:id/checklist` (L74), `POST /moderate` (L86), `POST /moderate/batch` (L91), `GET /moderate/rules` (L96), `POST /validate/video` (L101), `POST /validate/metadata` (L106), `POST /validate/image` (L111), `GET /validate/platforms` (L116).

## src/server/routers/attention.ts

- Kind: code; coverage: **Inventory**; lines: 54; bytes: 1763.
- Named functions/methods: `constructor` (L12), `registerRoutes` (L18).
- Route/middleware registrations: `POST /analyze` (L21), `POST /optimize` (L32), `GET /hook/:platform/:topic` (L43).

## src/server/routers/audio.ts

- Kind: code; coverage: **Inventory**; lines: 68; bytes: 2092.
- Named functions/methods: `constructor` (L12), `registerRoutes` (L18).
- Route/middleware registrations: `POST /process` (L21), `GET /ffmpeg-chain` (L41), `POST /detect-levels` (L52).

## src/server/routers/branding.ts

- Kind: code; coverage: **Focused**; lines: 95; bytes: 3456.
- Named functions/methods: `tenantIdFrom` (L8), `constructor` (L18), `registerRoutes` (L24).
- Route/middleware registrations: `GET /:tenantId` (L28), `GET /:tenantId/css` (L39), `PUT /:tenantId` (L50), `POST /:tenantId/reset` (L73), `GET /` (L84).
- Findings: A05.

## src/server/routers/channelconfigs.ts

- Kind: code; coverage: **Inventory**; lines: 51; bytes: 1927.
- Named functions/methods: `constructor` (L11), `registerRoutes` (L17), `list` (L24), `create` (L30), `remove` (L41).
- Route/middleware registrations: `GET /` (L19), `POST /` (L20), `DELETE /:id` (L21).

## src/server/routers/competitor.ts

- Kind: code; coverage: **Inventory**; lines: 45; bytes: 1941.
- Named functions/methods: `constructor` (L11), `register` (L19).
- Route/middleware registrations: `GET /creators` (L20), `GET /patterns` (L25), `POST /strategy` (L30), `GET /history` (L38).

## src/server/routers/connectors.ts

- Kind: code; coverage: **Focused**; lines: 160; bytes: 8868.
- Named functions/methods: `tenantIdFrom` (L17), `constructor` (L31), `register` (L40).
- Route/middleware registrations: `GET /` (L41), `POST /` (L45), `PATCH /:connectorId` (L69), `PUT /:connectorId/secret` (L85), `DELETE /:connectorId/secret` (L97), `POST /:connectorId/destinations/:destinationId/verify` (L109), `GET /:connectorId/destinations` (L136), `POST /:connectorId/destinations` (L140).

## src/server/routers/content.ts

- Kind: code; coverage: **Inventory**; lines: 74; bytes: 2574.
- Named functions/methods: `constructor` (L11), `register` (L18), `ideation` (L30), `editing` (L39), `personalize` (L44), `interactive` (L48), `moderate` (L53), `trendOptimize` (L58), `accessibility` (L63), `jsonMiddleware` (L69).
- Route/middleware registrations: `POST /ideation` (L21), `POST /editing-primitives` (L22), `POST /personalize` (L23), `POST /interactive` (L24), `POST /moderate` (L25), `POST /trend-optimize` (L26), `POST /accessibility` (L27).

## src/server/routers/contentbuckets.ts

- Kind: code; coverage: **Focused**; lines: 44; bytes: 1584.
- Named functions/methods: `constructor` (L13), `register` (L20).
- Route/middleware registrations: `GET /stats` (L23), `GET /next` (L27), `POST /add` (L31), `POST /detect` (L37).

## src/server/routers/contentversions.ts

- Kind: code; coverage: **Inventory**; lines: 116; bytes: 5631.
- Named functions/methods: `workspaceIdFrom` (L7), `safeAssetPath` (L13), `statusValue` (L22), `constructor` (L32), `list` (L43), `create` (L47), `get` (L73), `updateDraft` (L79), `updateRender` (L101).
- Route/middleware registrations: `GET /` (L36), `POST /` (L37), `GET /:contentVersionId` (L38), `PATCH /:contentVersionId` (L39), `PATCH /:contentVersionId/render` (L40).

## src/server/routers/costs.ts

- Kind: code; coverage: **Partial**; lines: 45; bytes: 1798.
- Named functions/methods: `constructor` (L12), `setupRoutes` (L19).
- Route/middleware registrations: `GET /summary` (L22), `GET /rates` (L29), `POST /record` (L33), `GET /tenant/:tenantId` (L40).

## src/server/routers/editing.ts

- Kind: code; coverage: **Inventory**; lines: 65; bytes: 2076.
- Named functions/methods: `constructor` (L12), `registerRoutes` (L18).
- Route/middleware registrations: `POST /plan` (L21), `GET /effects/:type/:intensity` (L34).

## src/server/routers/emotional.ts

- Kind: code; coverage: **Inventory**; lines: 73; bytes: 2314.
- Named functions/methods: `constructor` (L12), `registerRoutes` (L18), `isEmotionalTone` (L60).
- Route/middleware registrations: `POST /score` (L21), `GET /directives/:emotion` (L32), `POST /validate` (L47).

## src/server/routers/engagement.ts

- Kind: code; coverage: **Inventory**; lines: 51; bytes: 1568.
- Named functions/methods: `constructor` (L12), `registerRoutes` (L18).
- Route/middleware registrations: `POST /predict` (L21), `POST /virality-factor` (L39).

## src/server/routers/engines.ts

- Kind: code; coverage: **Focused**; lines: 140; bytes: 6523.
- Named functions/methods: `constructor` (L22), `register` (L34).
- Route/middleware registrations: `POST /trend-hijack` (L38), `GET /trend-hijack/formats` (L43), `GET /trend-hijack/history` (L46), `POST /trend-hijack/evergreen` (L49), `POST /category/classify` (L55), `GET /category/list` (L60), `POST /content/script` (L65), `POST /content/hook` (L75), `POST /content/caption` (L80), `POST /caption/generate` (L87), `GET /voice/profiles` (L99), `POST /voice/recommend` (L102), `POST /voice/synthesize` (L106), `POST /image/quote-card` (L118), `POST /image/carousel` (L123), `POST /image/poster` (L128), `POST /image/banner` (L133).

## src/server/routers/health.ts

- Kind: code; coverage: **Partial**; lines: 558; bytes: 19775.
- Named functions/methods: `constructor` (L30), `registerRoutes` (L38), `getHealth` (L46), `getQueueStats` (L78), `getQueueStates` (L103), `summarize` (L110), `getDashboard` (L127), `getMetrics` (L180), `buildQueueStats` (L203), `buildQueueStates` (L244), `summarize` (L250), `buildDatabaseHealth` (L262), `buildRedisHealth` (L289), `buildSystemHealth` (L341), `buildErrorSummary` (L359), `buildSlowRequests` (L391), `buildWorkerStatus` (L407), `buildAlerts` (L434), `parseRedisInfo` (L510), `sampleCpuPercent` (L521), `readCpuTotals` (L535), `getDirectorySize` (L547).
- Route/middleware registrations: `GET /` (L39), `GET /queue` (L40), `GET /queue/states` (L41), `GET /dashboard` (L42), `GET /metrics` (L43).
- Findings: A21.

## src/server/routers/hooks.ts

- Kind: code; coverage: **Focused**; lines: 91; bytes: 3859.
- Named functions/methods: `constructor` (L13), `setupRoutes` (L20), `parseHookEmotion` (L84).
- Route/middleware registrations: `GET /` (L23), `GET /best` (L36), `POST /generate` (L50), `POST /` (L61), `PATCH /:hookId/track` (L71), `DELETE /:hookId` (L77).

## src/server/routers/humanized.ts

- Kind: code; coverage: **Inventory**; lines: 66; bytes: 2173.
- Named functions/methods: `constructor` (L13), `registerRoutes` (L19).
- Route/middleware registrations: `POST /humanize` (L22), `GET /avatar-directives/:emotion` (L34), `GET /config` (L45), `PUT /config` (L55).

## src/server/routers/image.ts

- Kind: code; coverage: **Partial**; lines: 315; bytes: 15183.
- Named functions/methods: `safePathInDir` (L13), `constructor` (L29), `initEngine` (L39), `setupRoutes` (L48), `tenantPrefix` (L51), `ownerFileName` (L55).
- Route/middleware registrations: `POST /generate` (L61), `POST /quote-card` (L75), `POST /thumbnail` (L90), `POST /announcement` (L105), `GET /file/:fileName` (L120), `GET /filters` (L135), `GET /filters/:filterId` (L151), `POST /filters/css` (L163), `POST /filters/preview` (L180), `GET /filters/preview/file/:fileName` (L208), `POST /filters/apply` (L222), `POST /filters/batch` (L260), `GET /filtered/:fileName` (L305).

## src/server/routers/jobevents.ts

- Kind: code; coverage: **Focused**; lines: 71; bytes: 2968.
- Named functions/methods: `constructor` (L13), `registerRoutes` (L21), `tenant` (L30), `listEvents` (L36), `listOutbox` (L44), `metrics` (L52), `requeue` (L59).
- Route/middleware registrations: `GET /events` (L24), `GET /outbox` (L25), `GET /outbox/metrics` (L26), `POST /outbox/:id/requeue` (L27).

## src/server/routers/marketing.ts

- Kind: code; coverage: **Inventory**; lines: 138; bytes: 5681.
- Named functions/methods: `constructor` (L19), `registerRoutes` (L30), `createAudienceTarget` (L48), `listAudienceTargets` (L59), `optimizeSeo` (L63), `createVariant` (L68), `listVariants` (L78), `assignVariant` (L82), `upsertAnalytics` (L91), `getAnalyticsByVideo` (L98), `getDashboard` (L113), `expressJsonMiddleware` (L133).
- Route/middleware registrations: `POST /audience` (L33), `GET /audience` (L34), `POST /seo/optimize` (L36), `POST /ab/variants` (L38), `GET /ab/variants/:videoId` (L39), `POST /ab/assign/:videoId` (L40), `POST /analytics` (L42), `GET /analytics/:videoId` (L43), `GET /dashboard` (L45).

## src/server/routers/mcp.ts

- Kind: code; coverage: **Focused**; lines: 95; bytes: 2635.
- Named functions/methods: `constructor` (L15), `setupMCPServer` (L28), `setupRoutes` (L70).
- Route/middleware registrations: `GET /sse` (L71), `POST /messages` (L82).

## src/server/routers/pipeline.ts

- Kind: code; coverage: **Inventory**; lines: 231; bytes: 9562.
- Named functions/methods: `constructor` (L17), `registerRoutes` (L25), `run` (L37), `compare` (L80), `runPlatform` (L115), `listComparisons` (L170), `getComparison` (L181), `listJobs` (L195), `getJob` (L206), `getStats` (L221).
- Route/middleware registrations: `POST /run` (L28), `POST /compare` (L29), `GET /comparisons` (L30), `GET /comparisons/:id` (L31), `GET /jobs` (L32), `GET /jobs/:id` (L33), `GET /stats` (L34).

## src/server/routers/profiles.ts

- Kind: code; coverage: **Partial**; lines: 361; bytes: 13718.
- Named functions/methods: `getKeysSecret` (L21), `constructor` (L29), `getService` (L34), `registerRoutes` (L41), `constructor` (L244), `getService` (L249), `pruneExpired` (L256), `registerRoutes` (L263), `fail` (L314).
- Route/middleware registrations: `GET /` (L44), `POST /` (L54), `POST /resolve` (L77), `GET /:id` (L92), `PATCH /:id` (L106), `DELETE /:id` (L129), `GET /:id/accounts` (L144), `POST /:id/accounts` (L158), `DELETE /:id/accounts/:accountId` (L200), `POST /:id/accounts/:accountId/refresh` (L214), `POST /:provider/connect` (L264), `GET /:provider/callback` (L310).

## src/server/routers/publish.ts

- Kind: code; coverage: **Focused**; lines: 224; bytes: 7999.
- Named functions/methods: `constructor` (L31), `registerRoutes` (L39), `getMetadataSuggestions` (L48), `createPublishJob` (L97), `listPublishJobs` (L196), `getPublishJob` (L205), `express_json_middleware` (L219).
- Route/middleware registrations: `POST /` (L42), `POST /metadata-suggestions` (L43), `GET /` (L44), `GET /:id` (L45).

## src/server/routers/quality.ts

- Kind: code; coverage: **Inventory**; lines: 47; bytes: 1167.
- Named functions/methods: `constructor` (L12), `registerRoutes` (L18).
- Route/middleware registrations: `POST /score` (L21).

## src/server/routers/queue.ts

- Kind: code; coverage: **Inventory**; lines: 77; bytes: 3088.
- Named functions/methods: `constructor` (L16), `registerRoutes` (L23), `bulkEnqueue` (L29), `expressJsonMiddleware` (L72).
- Route/middleware registrations: `POST /bulk` (L26).

## src/server/routers/recycle.ts

- Kind: code; coverage: **Focused**; lines: 81; bytes: 3538.
- Named functions/methods: `constructor` (L17), `setupRoutes` (L26).
- Route/middleware registrations: `GET /candidates` (L29), `GET /stats` (L33), `POST /register` (L37), `PATCH /:videoId/metrics` (L44), `POST /:videoId/recycle` (L50), `POST /freshness/check` (L55), `POST /freshness/record` (L62), `POST /dedupe/check` (L69), `GET /dedupe/stats` (L76).
- Findings: A06.

## src/server/routers/releases.ts

- Kind: code; coverage: **Focused**; lines: 144; bytes: 8831.
- Named functions/methods: `tenantIdFrom` (L16), `canApprove` (L22), `constructor` (L36), `register` (L49).
- Route/middleware registrations: `GET /` (L52), `POST /` (L56), `GET /:releaseId` (L71), `POST /:releaseId/approve` (L78), `POST /:releaseId/queue` (L89), `POST /:releaseId/targets` (L127).
- Findings: A03.

## src/server/routers/repurpose.ts

- Kind: code; coverage: **Focused**; lines: 148; bytes: 5242.
- Named functions/methods: `constructor` (L27), `getEngine` (L35), `resolveVideoPath` (L51), `setupRoutes` (L63).
- Route/middleware registrations: `POST /` (L66), `GET /` (L116).

## src/server/routers/rest.ts

- Kind: code; coverage: **Focused**; lines: 755; bytes: 27096.
- Named functions/methods: `safePathInDir` (L25), `constructor` (L45), `setupRoutes` (L68).
- Route/middleware registrations: `POST /short-video` (L69), `GET /short-video/:videoId/status` (L118), `GET /music-tags` (L136), `GET /voices` (L143), `GET /short-video/:videoId/metadata` (L147), `GET /short-video/:videoId/render-path` (L167), `GET /short-videos` (L184), `DELETE /short-video/:videoId` (L194), `GET /tmp/:tmpFile` (L211), `GET /music/:fileName` (L257), `GET /short-video/:videoId` (L286), `GET /news-sources` (L313), `GET /automation/rules` (L320), `POST /automation/rules` (L323), `PATCH /automation/rules/:id` (L349), `GET /automation/status` (L362), `POST /news-sources/custom` (L374), `GET /reports` (L422), `GET /reports/:reportId` (L435), `POST /reports/fetch` (L452), `POST /reports/merge` (L498), `GET /script-plans` (L528), `POST /auto-script/translate` (L541), `POST /auto-script/topics` (L579), `POST /auto-script/hooks` (L626), `POST /auto-script` (L678).
- Findings: A02.

## src/server/routers/schedule.ts

- Kind: code; coverage: **Partial**; lines: 502; bytes: 21442.
- Named functions/methods: `constructor` (L38), `setShortCreator` (L50), `registerRoutes` (L55), `startRunner` (L72), `deterministicRandom` (L86), `executeSchedule` (L91), `listSchedules` (L216), `createSchedule` (L235), `getSchedule` (L339), `updateSchedule` (L353), `updateStatus` (L369), `triggerRun` (L389), `deleteSchedule` (L404), `getStats` (L418), `getDue` (L428), `getUpcoming` (L439), `getBestTimes` (L472).
- Route/middleware registrations: `GET /stats` (L58), `GET /due` (L59), `GET /upcoming` (L60), `GET /best-times` (L61), `GET /` (L62), `POST /` (L63), `GET /:id` (L64), `PATCH /:id/status` (L65), `POST /:id/run` (L66), `PATCH /:id` (L67), `DELETE /:id` (L68).
- Findings: A22.

## src/server/routers/shadowban.ts

- Kind: code; coverage: **Focused**; lines: 102; bytes: 4916.
- Named functions/methods: `constructor` (L19), `setupRoutes` (L30).
- Route/middleware registrations: `GET /` (L34), `POST /metrics` (L38), `GET /analyze/:platform/:accountId` (L44), `GET /best-time/:platform` (L50), `POST /best-time/record` (L56), `GET /hashtags/:platform` (L63), `GET /hashtags/:platform/trending` (L68), `POST /hashtags/record` (L72), `GET /skip/:platform/:category` (L79), `POST /skip/record` (L85), `POST /humanize-schedule` (L95).

## src/server/routers/strategy.ts

- Kind: code; coverage: **Inventory**; lines: 142; bytes: 6718.
- Named functions/methods: `constructor` (L19), `setupRoutes` (L29).
- Route/middleware registrations: `GET /platform/:platform` (L33), `GET /platforms` (L40), `POST /platform/optimal` (L44), `GET /buckets` (L50), `GET /buckets/next` (L54), `POST /buckets/add` (L58), `GET /series` (L66), `POST /series` (L72), `GET /series/:id` (L83), `GET /series/:id/next-episode` (L91), `GET /series/:id/cliffhanger/:episode` (L98), `PATCH /series/:id/episode/:ep` (L105), `DELETE /series/:id` (L113), `GET /cta` (L122), `POST /cta/generate` (L134).

## src/server/routers/systemengines.ts

- Kind: code; coverage: **Focused**; lines: 331; bytes: 17758.
- Named functions/methods: `constructor` (L31), `register` (L48).
- Route/middleware registrations: `GET /resource/snapshot` (L50), `GET /resource/optimize` (L54), `POST /resource/predict` (L57), `GET /resource/history` (L61), `USE /throttle` (L66), `POST /throttle/check` (L67), `GET /throttle/quotas` (L78), `GET /throttle/quotas/:tenantId` (L87), `POST /throttle/plan` (L95), `POST /throttle/reset` (L100), `GET /assets` (L108), `GET /assets/stats` (L112), `POST /assets` (L115), `PATCH /assets/:id/tags` (L126), `DELETE /assets/:id` (L130), `POST /export` (L137), `POST /export/backup` (L144), `POST /export/restore` (L150), `GET /export/list` (L156), `POST /compliance/log` (L161), `GET /compliance/logs` (L166), `POST /compliance/report` (L170), `GET /compliance/critical` (L176), `POST /auth/register` (L181), `POST /auth/authenticate` (L189), `POST /auth/verify` (L196), `GET /auth/tenants` (L203), `POST /auth/rotate/:tenantId` (L206), `GET /errorrecovery` (L217), `GET /errorrecovery/stats` (L220), `GET /errorrecovery/deadletter` (L223), `POST /errorrecovery/record` (L226), `POST /errorrecovery/process` (L231), `POST /errorrecovery/:id/recover` (L235), `POST /errorrecovery/:id/dead` (L241), `POST /errorrecovery/clear` (L247), `GET /credentials` (L253), `POST /credentials` (L256), `POST /credentials/schedule` (L263), `POST /credentials/:id/rotate` (L267), `GET /credentials/expiring` (L272), `GET /knowledgebase` (L278), `GET /knowledgebase/top` (L288), `GET /knowledgebase/categories` (L291), `POST /knowledgebase` (L294), `PATCH /knowledgebase/:id` (L301), `DELETE /knowledgebase/:id` (L306), `POST /marketing-engine/banners` (L313), `POST /marketing-engine/campaign` (L319), `POST /marketing-engine/scrape` (L324).
- Findings: A01.

## src/server/routers/tenants.ts

- Kind: code; coverage: **Partial**; lines: 317; bytes: 13708.
- Named functions/methods: `sanitizeTenant` (L14), `constructor` (L31), `registerRoutes` (L48), `create` (L66), `bootstrap` (L81), `list` (L106), `get` (L118), `updateWorkspace` (L134), `listManagedKeys` (L156), `manageManagedKey` (L176), `deleteManagedKey` (L207), `updateKeys` (L222), `updateEngines` (L243), `updateQuotas` (L259), `getBilling` (L275), `writeEngineLog` (L301).
- Route/middleware registrations: `GET /` (L51), `POST /` (L52), `POST /bootstrap` (L53), `GET /:tenantId` (L54), `PUT /:tenantId` (L55), `GET /:tenantId/keys` (L56), `POST /:tenantId/keys` (L57), `DELETE /:tenantId/keys/:keyId` (L58), `POST /:tenantId/engines` (L60), `POST /:tenantId/quotas` (L61), `GET /:tenantId/billing` (L62), `POST /:tenantId/logs/:engine` (L63).

## src/server/routers/thumbnail.ts

- Kind: code; coverage: **Inventory**; lines: 68; bytes: 2396.
- Named functions/methods: `constructor` (L12), `registerRoutes` (L18).
- Route/middleware registrations: `POST /generate` (L21), `GET /curiosity-gap/:topic` (L45), `POST /validate-contrast` (L55).

## src/server/routers/translate.ts

- Kind: code; coverage: **Inventory**; lines: 51; bytes: 1887.
- Named functions/methods: `constructor` (L13), `setupRoutes` (L19).
- Route/middleware registrations: `GET /languages` (L22), `POST /` (L26), `POST /batch` (L38).

## src/server/routers/trends.ts

- Kind: code; coverage: **Inventory**; lines: 67; bytes: 2342.
- Named functions/methods: `constructor` (L15), `setupRoutes` (L21).
- Route/middleware registrations: `GET /` (L24), `GET /category/:category` (L35), `GET /viral-radar` (L45), `POST /refresh` (L55).

## src/server/routers/videolibrary.ts

- Kind: code; coverage: **Inventory**; lines: 250; bytes: 9941.
- Named functions/methods: `constructor` (L29), `registerRoutes` (L36), `listVideos` (L51), `createVideo` (L88), `getVideo` (L135), `updateVideo` (L149), `updateStatus` (L163), `updateMetrics` (L183), `deleteVideo` (L198), `searchVideos` (L212), `getStats` (L229), `getTrendingTags` (L239).
- Route/middleware registrations: `GET /search` (L39), `GET /stats` (L40), `GET /tags` (L41), `GET /` (L42), `POST /` (L43), `GET /:id` (L44), `PATCH /:id/status` (L45), `PATCH /:id/metrics` (L46), `PATCH /:id` (L47), `DELETE /:id` (L48).

## src/server/routers/visual.ts

- Kind: code; coverage: **Inventory**; lines: 65; bytes: 1996.
- Named functions/methods: `constructor` (L12), `registerRoutes` (L18).
- Route/middleware registrations: `POST /enhance` (L21), `GET /ffmpeg-filters` (L43).

## src/server/routers/watermark.ts

- Kind: code; coverage: **Inventory**; lines: 47; bytes: 1468.
- Named functions/methods: `constructor` (L13), `setupRoutes` (L19).
- Route/middleware registrations: `POST /filter` (L22), `GET /default` (L32), `PUT /default` (L36).

## src/server/routers/webhooks.ts

- Kind: code; coverage: **Inventory**; lines: 149; bytes: 5468.
- Named functions/methods: `tenantIdFrom` (L8), `constructor` (L18), `registerRoutes` (L24).
- Route/middleware registrations: `GET /` (L28), `GET /stats` (L38), `GET /logs` (L48), `POST /` (L59), `PUT /:id` (L87), `DELETE /:id` (L99), `PATCH /:id/toggle` (L111), `POST /:id/test` (L123), `POST /notify` (L134).

## src/server/server.ts

- Kind: code; coverage: **Focused**; lines: 373; bytes: 17371.
- Named functions/methods: `constructor` (L72), `initializingResponse` (L125), `applySecurityHeaders` (L316), `applyCors` (L327), `start` (L351), `getApp` (L369).
- Route/middleware registrations: `USE /api` (L108), `USE /mcp` (L109), `USE /api/health` (L179), `USE /api/publish` (L180), `USE /api/tenants` (L181), `USE /api/marketing` (L182), `USE /api/ai` (L183), `USE /api/content` (L184), `USE /api/trends` (L185), `USE /api/hooks` (L186), `USE /api/translate` (L187), `USE /api/image` (L188), `USE /api/recycle` (L189), `USE /api/costs` (L190), `USE /api/shadowban` (L191), `USE /api/strategy` (L192), `USE /api/webhooks` (L193), `USE /api/branding` (L194), `USE /api/humanized` (L195), `USE /api/thumbnail` (L196), `USE /api/editing` (L197), `USE /api/visual` (L198), `USE /api/audio` (L199), `USE /api/emotional` (L200), `USE /api/attention` (L201), `USE /api/quality` (L202), `USE /api/engagement` (L203), `USE /api/account` (L204), `USE /api/watermark` (L205), `USE /api/videolibrary` (L206), `USE /api/schedule` (L207), `USE /api/pipeline` (L208), `USE /api/competitor` (L209), `USE /api/engines` (L210), `USE /api/abtesting` (L211), `USE /api/approval` (L212), `USE /api/system-engines` (L213), `USE /api/job-events` (L214), `USE /api/system-engines/content-buckets` (L215), `USE /api/channel-configs` (L216), `USE /api/profiles` (L217), `USE /api/oauth` (L218), `USE /api/repurpose` (L219), `USE /api/connectors` (L220), `USE /api/releases` (L221), `USE /api/content-versions` (L222), `USE /api/docs` (L225), `GET /api/docs.json` (L229), `GET /api/voices` (L237), `GET /api/music-tags` (L240), `GET /api/news-sources` (L244), `USE /api` (L263), `USE /mcp` (L264), `USE /api/queue` (L265), `USE /api` (L268), `USE /mcp` (L271), `USE /static` (L292), `GET *` (L298).

## src/server/swagger.ts

- Kind: code; coverage: **Inventory**; lines: 452; bytes: 20418.

## src/server/validator.ts

- Kind: code; coverage: **Inventory**; lines: 92; bytes: 2505.
- Named functions/methods: `validateCreateShortInput` (L11), `validateVideoId` (L31), `validateStatusRequest` (L47), `formatZodError` (L63).

## src/services/ABTestingEngine.ts

- Kind: code; coverage: **Inventory**; lines: 173; bytes: 6353.
- Named functions/methods: `chiSquarePValue` (L49), `constructor` (L66), `load` (L71), `save` (L77), `createTest` (L81), `recordEvent` (L98), `analyze` (L114), `getTest` (L159), `getAllTests` (L160), `getRunningTests` (L161), `pauseTest` (L163), `resumeTest` (L168).

## src/services/AccountManagerEngine.ts

- Kind: code; coverage: **Inventory**; lines: 132; bytes: 3611.
- Named functions/methods: `constructor` (L26), `calculateAccountMetrics` (L30), `setGoal` (L58), `updateGoalProgress` (L70), `getAccountGuidance` (L78), `saveMetrics` (L104), `loadMetrics` (L113).

## src/services/AiMonitoringService.test.ts

- Kind: test; coverage: **Inventory**; lines: 20; bytes: 685.

## src/services/AiMonitoringService.ts

- Kind: code; coverage: **Inventory**; lines: 41; bytes: 1128.
- Named functions/methods: `evaluateModelHealth` (L11), `fallbackSuggestion` (L31).

## src/services/AiPredictionService.test.ts

- Kind: test; coverage: **Inventory**; lines: 54; bytes: 1889.

## src/services/AiPredictionService.ts

- Kind: code; coverage: **Focused**; lines: 106; bytes: 3459.
- Named functions/methods: `predict` (L20), `retrain` (L51).

## src/services/AiTrainingService.ts

- Kind: code; coverage: **Focused**; lines: 30; bytes: 943.
- Named functions/methods: `constructor` (L11), `runTrainingNow` (L16), `start` (L23).

## src/services/AlertingService.test.ts

- Kind: test; coverage: **Inventory**; lines: 16; bytes: 436.

## src/services/AlertingService.ts

- Kind: code; coverage: **Inventory**; lines: 63; bytes: 1726.
- Named functions/methods: `constructor` (L12), `notify` (L14), `notifySlack` (L22), `notifyPagerDuty` (L35), `notifyEmail` (L52).

## src/services/AntiDuplicationEngine.test.ts

- Kind: test; coverage: **Inventory**; lines: 20; bytes: 879.

## src/services/AntiDuplicationEngine.ts

- Kind: code; coverage: **Inventory**; lines: 42; bytes: 3120.
- Named functions/methods: `constructor` (L10), `load` (L11), `save` (L12), `hashText` (L13), `cosineSimilarity` (L14), `normalizeTitle` (L15), `check` (L16), `register` (L27), `getStats` (L35).

## src/services/ApprovalEngine.test.ts

- Kind: test; coverage: **Inventory**; lines: 43; bytes: 2029.

## src/services/ApprovalEngine.ts

- Kind: code; coverage: **Inventory**; lines: 153; bytes: 6726.
- Named functions/methods: `constructor` (L49), `load` (L54), `save` (L60), `submit` (L64), `autoCheck` (L81), `review` (L111), `updateChecklist` (L128), `getPending` (L138), `getAll` (L139), `getById` (L140), `getStats` (L142).

## src/services/AssetLibraryEngine.ts

- Kind: code; coverage: **Focused**; lines: 169; bytes: 5404.
- Named functions/methods: `constructor` (L44), `load` (L49), `save` (L55), `generateId` (L59), `importAsset` (L63), `addVirtual` (L110), `search` (L118), `recordUsage` (L133), `updateTags` (L142), `delete` (L148), `getById` (L154), `getAll` (L155), `getByType` (L156), `getMostUsed` (L157), `getStats` (L159).

## src/services/AttentionOptimizerEngine.ts

- Kind: code; coverage: **Inventory**; lines: 91; bytes: 2874.
- Named functions/methods: `analyzeAttentionSpan` (L27), `optimizeForAttention` (L42), `generateHookScript` (L64).

## src/services/AudioQualityEngine.ts

- Kind: code; coverage: **Inventory**; lines: 90; bytes: 2568.
- Named functions/methods: `processAudio` (L34), `generateFfmpegAudioChain` (L60), `detectAudioLevels` (L72), `isAudioOptimal` (L86).

## src/services/AuthEngine.ts

- Kind: code; coverage: **Focused**; lines: 220; bytes: 7308.
- Named functions/methods: `getJwtSecret` (L41), `verifyJwtToken` (L63), `generateApiKey` (L67), `hashApiKey` (L71), `base64url` (L75), `signJwt` (L79), `verifyJwt` (L86), `constructor` (L101), `load` (L106), `save` (L112), `registerTenant` (L116), `authenticate` (L138), `verifyToken` (L168), `rotateCredentials` (L172), `suspendTenant` (L185), `activateTenant` (L190), `getDefaultPermissions` (L195), `getTenants` (L202), `getTenant` (L211).
- Findings: A15.

## src/services/BestTimeLearningEngine.ts

- Kind: code; coverage: **Inventory**; lines: 117; bytes: 3792.
- Named functions/methods: `constructor` (L40), `load` (L45), `save` (L51), `recordPerformance` (L55), `getBestTimes` (L77), `getNextBestTime` (L105).

## src/services/BrandingEngine.ts

- Kind: code; coverage: **Inventory**; lines: 178; bytes: 4986.
- Named functions/methods: `constructor` (L65), `load` (L70), `save` (L87), `getBranding` (L100), `updateBranding` (L104), `resetBranding` (L118), `getAllBranding` (L126), `generateThemeCss` (L134), `validateDomain` (L168), `validateColors` (L173).

## src/services/CaptionEngine.ts

- Kind: code; coverage: **Inventory**; lines: 118; bytes: 5035.
- Named functions/methods: `pickRandom` (L61), `generate` (L67), `generateRuleBased` (L90), `getPlatformLimit` (L114).

## src/services/CategoryEngine.ts

- Kind: code; coverage: **Inventory**; lines: 122; bytes: 6586.
- Named functions/methods: `classify` (L67), `getAllCategories` (L110), `getPlatformAffinity` (L114), `getTone` (L118).

## src/services/CommentCtaEngine.ts

- Kind: code; coverage: **Inventory**; lines: 70; bytes: 5442.
- Named functions/methods: `getBest` (L34), `generate` (L48), `getForCaption` (L53), `getForVideo` (L58), `getForPinnedComment` (L63), `getAll` (L68).

## src/services/CompetitorAnalysisEngine.test.ts

- Kind: test; coverage: **Inventory**; lines: 30; bytes: 1390.

## src/services/CompetitorAnalysisEngine.ts

- Kind: code; coverage: **Inventory**; lines: 159; bytes: 8887.
- Named functions/methods: `constructor` (L71), `load` (L76), `save` (L82), `analyzeCompetitor` (L86), `detectViralPatterns` (L95), `generateStrategyForTenant` (L101), `getHistoryForTenant` (L152), `getAllCreators` (L156), `getAllPatterns` (L157).

## src/services/ComplianceEngine.ts

- Kind: code; coverage: **Focused**; lines: 147; bytes: 4933.
- Named functions/methods: `severityFor` (L39), `constructor` (L52), `load` (L57), `save` (L63), `log` (L70), `query` (L101), `generateReport` (L114), `getRecentCritical` (L139), `getAll` (L143).

## src/services/ContentBucketEngine.ts

- Kind: code; coverage: **Inventory**; lines: 121; bytes: 4291.
- Named functions/methods: `constructor` (L42), `load` (L48), `save` (L56), `detectBucket` (L60), `addContent` (L74), `getStats` (L83), `getNextRecommendedBucket` (L109), `updateTargets` (L115).

## src/services/ContentEngine.ts

- Kind: code; coverage: **Inventory**; lines: 133; bytes: 5475.
- Named functions/methods: `buildPrompt` (L40), `buildRuleBasedScript` (L44), `generateScript` (L64), `generateHook` (L103), `generateCaption` (L118).

## src/services/ContentEnhancementService.test.ts

- Kind: test; coverage: **Inventory**; lines: 34; bytes: 1221.

## src/services/ContentEnhancementService.ts

- Kind: code; coverage: **Inventory**; lines: 142; bytes: 4054.
- Named functions/methods: `ideate` (L33), `editingPrimitives` (L51), `personalize` (L78), `addInteractiveOverlay` (L94), `moderate` (L107), `optimizeByTrends` (L123), `accessibility` (L128).

## src/services/ContentFreshnessEngine.ts

- Kind: code; coverage: **Inventory**; lines: 102; bytes: 3415.
- Named functions/methods: `constructor` (L27), `load` (L32), `save` (L38), `extractKeywords` (L42), `check` (L46), `record` (L84), `getRecentByCategory` (L97).

## src/services/ContentIntelligenceEngine.test.ts

- Kind: test; coverage: **Inventory**; lines: 23; bytes: 1007.

## src/services/ContentIntelligenceEngine.ts

- Kind: code; coverage: **Inventory**; lines: 66; bytes: 4524.
- Named functions/methods: `constructor` (L16), `buildBrief` (L23), `selectTopic` (L58), `sameTopic` (L64).

## src/services/ContentRecycleEngine.ts

- Kind: code; coverage: **Inventory**; lines: 119; bytes: 3591.
- Named functions/methods: `constructor` (L43), `load` (L48), `save` (L54), `register` (L58), `updateMetrics` (L68), `getCandidates` (L76), `markRecycled` (L101), `getStats` (L110).

## src/services/CostTrackingEngine.ts

- Kind: code; coverage: **Inventory**; lines: 107; bytes: 3291.
- Named functions/methods: `constructor` (L43), `load` (L48), `save` (L54), `record` (L58), `getSummary` (L74), `getByTenant` (L101), `getRates` (L105).

## src/services/CreatorKnowledgeBase.ts

- Kind: code; coverage: **Focused**; lines: 179; bytes: 9306.
- Named functions/methods: `constructor` (L105), `load` (L110), `save` (L121), `search` (L125), `getByCategory` (L143), `getByPlatform` (L147), `addRule` (L151), `updateRule` (L163), `deleteRule` (L169), `getAll` (L175), `getTopRated` (L176), `getCategories` (L177).

## src/services/CredentialRotationEngine.ts

- Kind: code; coverage: **Inventory**; lines: 182; bytes: 5991.
- Named functions/methods: `maskValue` (L46), `hashValue` (L51), `constructor` (L59), `load` (L64), `save` (L70), `register` (L74), `scheduleRotation` (L108), `rotateNow` (L147), `detectExpiring` (L168), `getAll` (L177), `getById` (L178), `getByPlatform` (L179), `getExpired` (L180).

## src/services/CryptoService.test.ts

- Kind: test; coverage: **Inventory**; lines: 12; bytes: 357.

## src/services/CryptoService.ts

- Kind: code; coverage: **Inventory**; lines: 29; bytes: 966.
- Named functions/methods: `constructor` (L6), `encrypt` (L10), `decrypt` (L18).

## src/services/EmotionalResonanceEngine.ts

- Kind: code; coverage: **Inventory**; lines: 91; bytes: 4170.
- Named functions/methods: `deterministicRandom` (L33), `scoreEmotionalContent` (L38), `generateEmotionalDirectives` (L63), `validateEmotionalAlignment` (L87).

## src/services/EngagementPredictionEngine.ts

- Kind: code; coverage: **Inventory**; lines: 71; bytes: 2591.
- Named functions/methods: `predictEngagement` (L22), `calculateViralityFactor` (L67).

## src/services/ErrorRecoveryEngine.ts

- Kind: code; coverage: **Inventory**; lines: 161; bytes: 5819.
- Named functions/methods: `constructor` (L49), `load` (L54), `save` (L60), `recordError` (L67), `markRetrying` (L91), `markRecovered` (L104), `markDead` (L115), `processDeadLetter` (L125), `getDeadLetterQueue` (L140), `getQueuedRetries` (L141), `getAll` (L142), `getStats` (L144), `clearResolved` (L154).

## src/services/ExpertEditingEngine.ts

- Kind: code; coverage: **Inventory**; lines: 95; bytes: 3603.
- Named functions/methods: `deterministicRandom` (L27), `generateEditingPlan` (L32), `zoomCutEffect` (L67), `speedRampEffect` (L72), `glitchEffect` (L77), `textAnimationEffect` (L87).

## src/services/ExportEngine.ts

- Kind: code; coverage: **Inventory**; lines: 177; bytes: 6172.
- Named functions/methods: `constructor` (L44), `load` (L51), `save` (L57), `buildFileList` (L61), `exportContent` (L88), `backupAll` (L137), `restore` (L141), `getExports` (L174), `getExportById` (L175).

## src/services/HashtagLearningEngine.ts

- Kind: code; coverage: **Inventory**; lines: 118; bytes: 4464.
- Named functions/methods: `constructor` (L49), `load` (L54), `save` (L60), `recordPerformance` (L64), `calcScore` (L87), `recommend` (L94), `getTrending` (L109), `getAll` (L114).

## src/services/HookLibraryEngine.ts

- Kind: code; coverage: **Inventory**; lines: 125; bytes: 7438.
- Named functions/methods: `constructor` (L45), `load` (L50), `save` (L68), `getAll` (L72), `getByType` (L74), `getByCategory` (L76), `getByPlatform` (L80), `getBest` (L84), `fill` (L92), `addHook` (L96), `trackUsage` (L103), `deleteHook` (L113), `generateWithTopic` (L120).

## src/services/HumanEditorialEngine.test.ts

- Kind: test; coverage: **Inventory**; lines: 56; bytes: 2323.
- Named functions/methods: `makeEngine` (L9).

## src/services/HumanEditorialEngine.ts

- Kind: code; coverage: **Inventory**; lines: 77; bytes: 6197.
- Named functions/methods: `normalizeCategory` (L23), `tokenize` (L24), `repeatedLineRatio` (L25), `constructor` (L35), `review` (L36).

## src/services/HumanMimicryEngine.ts

- Kind: code; coverage: **Inventory**; lines: 82; bytes: 2648.
- Named functions/methods: `deterministicRandom` (L15), `humanizeSchedule` (L20), `shuffleHashtags` (L40), `addTypingVariation` (L49), `isWithinActiveHours` (L59), `getHumanizedDelay` (L66), `shouldTakeBreak` (L71), `simulateEngagementDelay` (L77).

## src/services/HumanizedContentEngine.ts

- Kind: code; coverage: **Inventory**; lines: 142; bytes: 4318.
- Named functions/methods: `constructor` (L39), `humanizeContent` (L43), `getConfig` (L92), `saveConfig` (L103), `generateAvatarDirectives` (L112).

## src/services/ImageEngine.ts

- Kind: code; coverage: **Inventory**; lines: 196; bytes: 9168.
- Named functions/methods: `svgEscape` (L71), `wrapText` (L75), `generateQuoteCard` (L88), `generateCarousel` (L123), `generatePoster` (L148), `generateBanner` (L174), `slide` (L195).

## src/services/ImageFiltersEngine.ts

- Kind: code; coverage: **Inventory**; lines: 586; bytes: 22315.
- Named functions/methods: `constructor` (L237), `tryLoadCanvas` (L243), `getPresets` (L254), `getPresetsForPlatform` (L259), `getPreset` (L266), `buildCssFilter` (L271), `buildSvgFilter` (L318), `applyFilterToSvg` (L399), `applyFilterToCanvas` (L425), `generateFilterPreview` (L477), `batchApplyFilter` (L515), `deterministicRandom` (L535), `applyGrain` (L540), `applyVignette` (L553), `lerp` (L561), `getFilterBgColor` (L565).

## src/services/ImageGenerationEngine.ts

- Kind: code; coverage: **Inventory**; lines: 195; bytes: 8885.
- Named functions/methods: `constructor` (L68), `tryLoadCanvas` (L74), `wrapText` (L83), `generateSvgFallback` (L102), `generate` (L121), `generateQuoteCard` (L183), `generateThumbnail` (L187), `generateAnnouncement` (L191).

## src/services/JobLifecycleEventService.ts

- Kind: code; coverage: **Focused**; lines: 33; bytes: 970.
- Named functions/methods: `constructor` (L5), `emit` (L10).

## src/services/LlmGenerator.ts

- Kind: code; coverage: **Focused**; lines: 86; bytes: 2968.
- Named functions/methods: `configure` (L16), `isAvailable` (L20), `generateOpenRouter` (L29), `generate` (L57).

## src/services/MarketingEngine.ts

- Kind: code; coverage: **Inventory**; lines: 150; bytes: 6223.
- Named functions/methods: `svgBanner` (L55), `safe` (L56), `generateBanners` (L70), `generateCampaignPlan` (L107), `scrapeWebsiteMock` (L130).

## src/services/MetadataGenerator.test.ts

- Kind: test; coverage: **Inventory**; lines: 73; bytes: 2222.

## src/services/MetadataGenerator.ts

- Kind: code; coverage: **Inventory**; lines: 173; bytes: 5674.
- Named functions/methods: `constructor` (L22), `normalizeKeywordList` (L24), `normalizeHashtags` (L32), `getPlatformStrategy` (L40), `generate` (L56), `buildPrompt` (L85), `parseResponse` (L123), `templateFallback` (L148).

## src/services/ModerationEngine.ts

- Kind: code; coverage: **Inventory**; lines: 131; bytes: 5030.
- Named functions/methods: `scan` (L84), `batchScan` (L123), `getRules` (L127).

## src/services/OAuthProvider.ts

- Kind: code; coverage: **Inventory**; lines: 143; bytes: 5001.
- Named functions/methods: `oauthProviderInfo` (L51), `buildAuthorizationUrl` (L60), `exchangeOAuthCode` (L88), `defaultCallbackUrl` (L136).

## src/services/PipelineOrchestrator.ts

- Kind: code; coverage: **Focused**; lines: 245; bytes: 10505.
- Named functions/methods: `constructor` (L57), `run` (L70), `buildCaption` (L200), `buildHashtags` (L222), `detectCategory` (L230), `getStore` (L241).
- Findings: A23.

## src/services/PlatformPsychologyEngine.ts

- Kind: code; coverage: **Inventory**; lines: 171; bytes: 8186.
- Named functions/methods: `getProfile` (L125), `getAllProfiles` (L129), `getOptimalPlatformsForContent` (L133), `adaptScriptForPlatform` (L158).

## src/services/ProfileService.ts

- Kind: code; coverage: **Inventory**; lines: 213; bytes: 8054.
- Named functions/methods: `constructor` (L28), `encryptCredentials` (L40), `decryptCredentials` (L46), `toAccountSummary` (L52), `listProfiles` (L68), `getProfile` (L86), `getProfileRecord` (L101), `createProfile` (L105), `updateProfile` (L120), `removeProfile` (L135), `addAccount` (L144), `getAccount` (L169), `getAccountCredentials` (L175), `updateAccount` (L181), `removeAccount` (L190), `resolveAccountsFor` (L199).

## src/services/QualityScoringEngine.ts

- Kind: code; coverage: **Inventory**; lines: 91; bytes: 3122.
- Named functions/methods: `scoreContent` (L13), `scoreAudio` (L43), `scoreVisual` (L50), `scoreScript` (L58), `scoreEngagement` (L66), `identifyIssues` (L74), `generateRecommendations` (L82).

## src/services/RenderMediaToken.ts

- Kind: code; coverage: **Inventory**; lines: 54; bytes: 1690.
- Named functions/methods: `encode` (L13), `sign` (L17), `createRenderMediaToken` (L21), `verifyRenderMediaToken` (L35), `renderMediaTokenTtlSeconds` (L51).

## src/services/RepurposeEngine.ts

- Kind: code; coverage: **Inventory**; lines: 160; bytes: 4611.
- Named functions/methods: `constructor` (L36), `create` (L42), `extractAudio` (L49), `repurpose` (L69), `cutClip` (L124).

## src/services/ResourceEngine.ts

- Kind: code; coverage: **Inventory**; lines: 181; bytes: 5934.
- Named functions/methods: `constructor` (L55), `load` (L60), `save` (L66), `getSnapshot` (L70), `optimize` (L125), `predictNeeds` (L158), `getHistory` (L177).

## src/services/RuleBasedGenerator.ts

- Kind: code; coverage: **Inventory**; lines: 101; bytes: 4581.
- Named functions/methods: `pickRandom` (L68), `fillTemplate` (L72), `detectBucket` (L76), `generate` (L85).

## src/services/SchedulerService.test.ts

- Kind: test; coverage: **Inventory**; lines: 44; bytes: 1708.

## src/services/SchedulerService.ts

- Kind: code; coverage: **Focused**; lines: 210; bytes: 7962.
- Named functions/methods: `constructor` (L42), `start` (L54), `stop` (L73), `runOnce` (L78), `tick` (L97), `processRule` (L101), `enqueueRenderJob` (L152).

## src/services/SeoOptimizerService.test.ts

- Kind: test; coverage: **Inventory**; lines: 18; bytes: 592.

## src/services/SeoOptimizerService.ts

- Kind: code; coverage: **Inventory**; lines: 16; bytes: 561.
- Named functions/methods: `optimize` (L2).

## src/services/SeriesBuilderEngine.test.ts

- Kind: test; coverage: **Inventory**; lines: 42; bytes: 2075.

## src/services/SeriesBuilderEngine.ts

- Kind: code; coverage: **Inventory**; lines: 131; bytes: 4640.
- Named functions/methods: `constructor` (L47), `load` (L52), `save` (L58), `createSeriesForTenant` (L62), `generateCliffhangerForTenant` (L91), `updateEpisodeForTenant` (L99), `getNextEpisodeForTenant` (L110), `getAllSeriesForTenant` (L116), `getSeriesForTenant` (L120), `deleteSeriesForTenant` (L124).

## src/services/ShadowbanDetectionEngine.ts

- Kind: code; coverage: **Inventory**; lines: 243; bytes: 9507.
- Named functions/methods: `constructor` (L39), `load` (L45), `save` (L52), `recordMetrics` (L59), `analyze` (L65), `getAllStatuses` (L128), `getStatus` (L130), `generateRecoveryPlan` (L134).

## src/services/SkipAnalysisEngine.test.ts

- Kind: test; coverage: **Inventory**; lines: 32; bytes: 1559.

## src/services/SkipAnalysisEngine.ts

- Kind: code; coverage: **Inventory**; lines: 94; bytes: 3632.
- Named functions/methods: `constructor` (L31), `load` (L36), `save` (L42), `recordForTenant` (L46), `analyzeForTenant` (L53), `avg` (L63), `getAllForTenant` (L89).

## src/services/TenantLoggerService.ts

- Kind: code; coverage: **Inventory**; lines: 15; bytes: 618.
- Named functions/methods: `constructor` (L5), `log` (L7).

## src/services/TenantQuotaService.test.ts

- Kind: test; coverage: **Inventory**; lines: 24; bytes: 626.

## src/services/TenantQuotaService.ts

- Kind: code; coverage: **Inventory**; lines: 19; bytes: 958.
- Named functions/methods: `checkQuota` (L10).

## src/services/ThrottlingEngine.test.ts

- Kind: test; coverage: **Inventory**; lines: 28; bytes: 1149.

## src/services/ThrottlingEngine.ts

- Kind: code; coverage: **Inventory**; lines: 178; bytes: 6765.
- Named functions/methods: `constructor` (L53), `load` (L58), `save` (L67), `getOrCreate` (L71), `resetIfNeeded` (L85), `check` (L106), `getQuota` (L157), `getAllQuotas` (L158), `setPlan` (L160), `resetUsage` (L168), `getPlanLimits` (L176).

## src/services/ThumbnailEngine.ts

- Kind: code; coverage: **Inventory**; lines: 108; bytes: 3492.
- Named functions/methods: `generateThumbnailDirectives` (L32), `validateContrast` (L51), `getLuminance` (L52), `generateCuriosityGap` (L66), `scoreThumbailEffectiveness` (L98).

## src/services/TranslationEngine.ts

- Kind: code; coverage: **Focused**; lines: 95; bytes: 3880.
- Named functions/methods: `constructor` (L35), `cacheKey` (L39), `getCache` (L43), `setCache` (L50), `fallbackTranslate` (L54), `translate` (L65), `translateBatch` (L89), `getSupportedLanguages` (L93).
- Findings: A29.

## src/services/TrendEngine.ts

- Kind: code; coverage: **Inventory**; lines: 140; bytes: 5978.
- Named functions/methods: `constructor` (L46), `scoreViralPotential` (L50), `extractKeywords` (L63), `detectCategory` (L73), `fetchTrends` (L85), `getTopByCategory` (L131), `clearCache` (L136).

## src/services/TrendHijackingEngine.ts

- Kind: code; coverage: **Inventory**; lines: 135; bytes: 5250.
- Named functions/methods: `constructor` (L58), `load` (L63), `save` (L69), `isEvergreen` (L73), `pickBestFormat` (L78), `hijackTrend` (L87), `getEvergreenFallback` (L123), `getAllFormats` (L132), `getHistory` (L133).

## src/services/ValidationEngine.ts

- Kind: code; coverage: **Inventory**; lines: 150; bytes: 7435.
- Named functions/methods: `validateVideo` (L62), `validateMetadata` (L98), `validateImage` (L122), `buildResult` (L137), `getSupportedPlatforms` (L148).

## src/services/ViralRadarEngine.ts

- Kind: code; coverage: **Inventory**; lines: 113; bytes: 3888.
- Named functions/methods: `constructor` (L33), `computeRisingScore` (L37), `computeSaturation` (L51), `prioritize` (L61), `action` (L68), `scan` (L75).

## src/services/ViralStrategyService.ts

- Kind: code; coverage: **Inventory**; lines: 14; bytes: 570.
- Named functions/methods: `score` (L2).

## src/services/VisualEnhancementEngine.ts

- Kind: code; coverage: **Inventory**; lines: 97; bytes: 2932.
- Named functions/methods: `enhanceVideo` (L22), `generateFfmpegFilters` (L71), `validateFraming` (L91).

## src/services/VoiceEngine.ts

- Kind: code; coverage: **Inventory**; lines: 139; bytes: 5933.
- Named functions/methods: `constructor` (L55), `getAllVoices` (L60), `getVoice` (L62), `getVoicesByLanguage` (L66), `getVoicesByGender` (L70), `synthesize` (L74), `mockSynthesize` (L96), `recommendVoice` (L108), `synthesize` (L119), `synthesize` (L130).

## src/services/WatermarkEngine.ts

- Kind: code; coverage: **Inventory**; lines: 48; bytes: 1351.
- Named functions/methods: `buildFfmpegFilter` (L19), `getDefaultConfig` (L42), `updateDefault` (L44).

## src/services/WebhookNotificationEngine.ts

- Kind: code; coverage: **Focused**; lines: 372; bytes: 13984.
- Named functions/methods: `constructor` (L102), `load` (L108), `save` (L121), `generateId` (L130), `sendTelegram` (L136), `escapeMarkdown` (L159), `sendSlack` (L165), `sendDiscord` (L191), `sendCustom` (L219), `notify` (L231), `addWebhook` (L286), `toSafeWebhook` (L298), `updateWebhook` (L309), `deleteWebhook` (L317), `toggleWebhook` (L324), `getWebhooks` (L332), `getLogs` (L334), `getStats` (L336), `testWebhook` (L355).
- Findings: A07, A08.

## src/services/webhookSecurity.ts

- Kind: code; coverage: **Focused**; lines: 242; bytes: 10409.
- Named functions/methods: `constructor` (L32), `defaultDnsResolver` (L50), `parseIpv4` (L55), `isBlockedIpv4` (L63), `ipv6ToBytes` (L78), `isBlockedIpv6` (L109), `allZeroThrough` (L110), `isBlockedIp` (L129), `bareHostname` (L142), `withTimeout` (L147), `prepareWebhookUrl` (L161), `assertProviderWebhookUrl` (L212), `sanitizeWebhookError` (L229).

## src/short-creator/ShortCreator.test.ts

- Kind: test; coverage: **Inventory**; lines: 701; bytes: 21516.
- Named functions/methods: `normalizePath` (L34), `push` (L142), `close` (L143), `resolveRenderPromise` (L225).

## src/short-creator/ShortCreator.ts

- Kind: code; coverage: **Focused**; lines: 903; bytes: 32799.
- Named functions/methods: `constructor` (L62), `normalizeSearchPhrase` (L76), `normalizeSignatureValue` (L83), `extractCapitalizedPhrases` (L90), `inferVisualAnchors` (L99), `addAnchors` (L112), `buildMediaSearchTerms` (L139), `specificityScore` (L161), `buildVideoSignature` (L175), `translateCaptions` (L203), `translateOverlayText` (L232), `buildSyntheticCaptions` (L262), `resolveCaptionTrack` (L292), `status` (L326), `addToQueue` (L337), `processQueue` (L377), `renderMediaUrl` (L400), `createShort` (L405), `estimateSceneDurationSeconds` (L753), `splitScenesByDuration` (L758), `getVideoPath` (L785), `downloadFile` (L789), `deleteVideo` (L820), `getVideo` (L826), `findMusic` (L834), `ListAvailableMusicTags` (L854), `listAllVideos` (L862), `ListAvailableVoices` (L899).
- Findings: A04.

## src/short-creator/libraries/Chatterbox.ts

- Kind: code; coverage: **Inventory**; lines: 185; bytes: 5513.
- Named functions/methods: `resolvePython` (L28), `waitForPort` (L51), `ensureReferenceClip` (L83), `getServer` (L96), `shutdownChatterbox` (L125), `isChatterboxVoice` (L143), `generate` (L147).

## src/short-creator/libraries/EdgeTts.test.ts

- Kind: test; coverage: **Inventory**; lines: 60; bytes: 2882.

## src/short-creator/libraries/EdgeTts.ts

- Kind: code; coverage: **Inventory**; lines: 197; bytes: 6320.
- Named functions/methods: `splitClauses` (L41), `isQuestion` (L74), `hasDramaticWord` (L78), `isHookClause` (L83), `classifyClause` (L88), `buildProsodyChunks` (L120), `isEdgeVoice` (L135), `generate` (L139).

## src/short-creator/libraries/FFmpeg.test.ts

- Kind: test; coverage: **Inventory**; lines: 66; bytes: 2615.
- Named functions/methods: `instantiate` (L22), `makeFfmpegStderr` (L28).

## src/short-creator/libraries/FFmpeg.ts

- Kind: code; coverage: **Inventory**; lines: 230; bytes: 6807.
- Named functions/methods: `init` (L7), `constructor` (L15), `saveNormalizedAudio` (L17), `createMp3DataUri` (L45), `saveToMp3` (L75), `concatVideos` (L97), `assessVideoFlatness` (L116), `getAudioDuration` (L166), `probeDurationWithFfprobe` (L178), `probeDurationWithFfmpeg` (L197).

## src/short-creator/libraries/Kokoro.ts

- Kind: code; coverage: **Inventory**; lines: 79; bytes: 2125.
- Named functions/methods: `constructor` (L10), `generate` (L12), `concatWavBuffers` (L47), `init` (L65), `listAvailableVoices` (L74).

## src/short-creator/libraries/Pexels.test.ts

- Kind: test; coverage: **Inventory**; lines: 113; bytes: 3207.

## src/short-creator/libraries/Pexels.ts

- Kind: code; coverage: **Inventory**; lines: 276; bytes: 8667.
- Named functions/methods: `constructor` (L48), `normalizeTerm` (L50), `buildDomainQueryVariants` (L57), `buildQueryCandidates` (L66), `selectBestVideo` (L97), `_findVideo` (L151), `findVideo` (L218).

## src/short-creator/libraries/Pixabay.ts

- Kind: code; coverage: **Inventory**; lines: 73; bytes: 2534.
- Named functions/methods: `constructor` (L24), `findVideo` (L28), `findImage` (L53), `isConfigured` (L71).

## src/short-creator/libraries/Remotion.ts

- Kind: code; coverage: **Focused**; lines: 110; bytes: 3080.
- Named functions/methods: `constructor` (L15), `init` (L20), `render` (L36), `testRender` (L86).

## src/short-creator/libraries/SubtitleBuilder.ts

- Kind: code; coverage: **Inventory**; lines: 185; bytes: 6549.
- Named functions/methods: `build` (L40), `buildAndSave` (L98), `toSRT` (L117), `toVTT` (L129), `applyHinglishMix` (L143), `msToSRTTime` (L159), `msToVTTTime` (L168), `pad` (L178), `padMs` (L182).

## src/short-creator/libraries/TtsAdapter.test.ts

- Kind: test; coverage: **Inventory**; lines: 193; bytes: 6128.

## src/short-creator/libraries/TtsAdapter.ts

- Kind: code; coverage: **Focused**; lines: 115; bytes: 4358.
- Named functions/methods: `constructor` (L14), `languageNeedsTransliteration` (L24), `translateIfNeeded` (L28), `prepareTextForSpeech` (L77), `synthesize` (L85).

## src/short-creator/libraries/VideoSegmenter.test.ts

- Kind: test; coverage: **Inventory**; lines: 78; bytes: 3220.
- Named functions/methods: `words` (L5), `sentences` (L14).

## src/short-creator/libraries/VideoSegmenter.ts

- Kind: code; coverage: **Inventory**; lines: 297; bytes: 7364.
- Named functions/methods: `normalizeWord` (L94), `countWords` (L97), `endsSentence` (L105), `buildRawWindows` (L107), `flush` (L117), `scoreWindow` (L181), `addContext` (L237), `selectTopClips` (L253).

## src/short-creator/libraries/Whisper.test.ts

- Kind: test; coverage: **Inventory**; lines: 39; bytes: 1145.

## src/short-creator/libraries/Whisper.ts

- Kind: code; coverage: **Inventory**; lines: 130; bytes: 4523.
- Named functions/methods: `constructor` (L16), `getWhisperBinPath` (L18), `ensureInstalled` (L31), `init` (L72), `CreateCaption` (L79).

## src/short-creator/libraries/chatterbox_server.py

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 163; bytes: 5371.
- Python/shell/SQL declarations: `_patch_torch_load` (L40), `load_model` (L49), `synthesize` (L66), `_wav_bytes` (L75), `main` (L144), `patched` (L42), `log_message` (L85), `_send` (L88), `do_GET` (L98), `_shutdown_soon` (L106), `do_POST` (L113).

## src/short-creator/libraries/edge_tts_prosody.py

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 127; bytes: 4889.
- Python/shell/SQL declarations: `extract_silence` (L32), `run` (L39), `synthesize_chunk` (L43), `main` (L48).

## src/short-creator/music.ts

- Kind: code; coverage: **Inventory**; lines: 215; bytes: 4796.
- Named functions/methods: `constructor` (L197), `musicList` (L198), `musicFileExist` (L204), `ensureMusicFilesExist` (L207).

## src/types/ownership.test.ts

- Kind: test; coverage: **Inventory**; lines: 20; bytes: 576.

## src/types/ownership.ts

- Kind: code; coverage: **Inventory**; lines: 81; bytes: 2060.
- Named functions/methods: `requireNonEmptyOwnershipId` (L72).

## src/types/profiles.ts

- Kind: code; coverage: **Inventory**; lines: 58; bytes: 1347.

## src/types/shorts.ts

- Kind: code; coverage: **Inventory**; lines: 494; bytes: 14962.

## src/ui/App.tsx

- Kind: code; coverage: **Focused**; lines: 116; bytes: 7194.
- Named functions/methods: `App` (L54).

## src/ui/components/AuthBootstrap.tsx

- Kind: code; coverage: **Focused**; lines: 120; bytes: 4466.
- Named functions/methods: `AuthBootstrap` (L25), `establishSession` (L35), `submit` (L52).

## src/ui/components/ErrorBoundary.tsx

- Kind: code; coverage: **Inventory**; lines: 102; bytes: 2578.
- Named functions/methods: `constructor` (L24), `getDerivedStateFromError` (L29), `componentDidCatch` (L33), `render` (L42).

## src/ui/components/Layout.tsx

- Kind: code; coverage: **Focused**; lines: 259; bytes: 12793.
- Named functions/methods: `Layout` (L147), `handleAuthExpired` (L153), `isActive` (L160).

## src/ui/components/ab-testing/ActiveTestsList.tsx

- Kind: code; coverage: **Inventory**; lines: 215; bytes: 7198.
- Named functions/methods: `formatDate` (L38), `ActiveTestsList` (L46), `handleAssign` (L56).

## src/ui/components/ab-testing/HistoricalTests.tsx

- Kind: code; coverage: **Inventory**; lines: 289; bytes: 9719.
- Named functions/methods: `formatDate` (L35), `timeAgo` (L43), `ctrClass` (L57), `HistoricalTests` (L66), `handleSort` (L95), `SortHeader` (L100).

## src/ui/components/ab-testing/ResultsView.tsx

- Kind: code; coverage: **Inventory**; lines: 282; bytes: 8730.
- Named functions/methods: `BarChart` (L33), `KPICard` (L86), `ResultsView` (L108).

## src/ui/components/ab-testing/VariantCreationForm.tsx

- Kind: code; coverage: **Inventory**; lines: 197; bytes: 5653.
- Named functions/methods: `VariantCreationForm` (L45), `handleChange` (L54), `handleSubmit` (L59).

## src/ui/components/ai/ModelComparison.tsx

- Kind: code; coverage: **Inventory**; lines: 59; bytes: 2240.
- Named functions/methods: `formatValue` (L9), `normalize` (L19), `ModelComparison` (L29).

## src/ui/components/ai/ModelHealthCard.tsx

- Kind: code; coverage: **Inventory**; lines: 75; bytes: 3002.
- Named functions/methods: `formatPercent` (L10), `ModelHealthCard` (L14).

## src/ui/components/ai/PredictionsList.tsx

- Kind: code; coverage: **Inventory**; lines: 79; bytes: 2757.
- Named functions/methods: `pct` (L19), `PredictionsList` (L23).

## src/ui/components/ai/RecommendationsPanel.tsx

- Kind: code; coverage: **Inventory**; lines: 39; bytes: 1547.
- Named functions/methods: `RecommendationsPanel` (L10).

## src/ui/components/ai/TrainingHistory.tsx

- Kind: code; coverage: **Inventory**; lines: 79; bytes: 3267.
- Named functions/methods: `buildPath` (L10), `TrainingHistory` (L25).

## src/ui/components/ai/TrainingJobsList.tsx

- Kind: code; coverage: **Inventory**; lines: 111; bytes: 3743.
- Named functions/methods: `percent` (L26), `TrainingJobsList` (L30).

## src/ui/components/analytics/ContentHeatmap.tsx

- Kind: code; coverage: **Inventory**; lines: 151; bytes: 4960.
- Named functions/methods: `getColor` (L22), `formatHour` (L33), `ContentHeatmap` (L39).

## src/ui/components/analytics/DateRangePicker.tsx

- Kind: code; coverage: **Inventory**; lines: 100; bytes: 2757.
- Named functions/methods: `DateRangePicker` (L33).

## src/ui/components/analytics/EngagementBreakdown.tsx

- Kind: code; coverage: **Inventory**; lines: 157; bytes: 5100.
- Named functions/methods: `formatNumber` (L36), `EngagementBreakdown` (L42).

## src/ui/components/analytics/KPICards.tsx

- Kind: code; coverage: **Inventory**; lines: 155; bytes: 4603.
- Named functions/methods: `formatNumber` (L29), `formatChange` (L35), `TrendChip` (L40), `KPICards` (L58).

## src/ui/components/analytics/PlatformComparison.tsx

- Kind: code; coverage: **Inventory**; lines: 150; bytes: 4824.
- Named functions/methods: `formatValue` (L40), `PlatformComparison` (L47).

## src/ui/components/analytics/TimeSeriesChart.tsx

- Kind: code; coverage: **Inventory**; lines: 181; bytes: 5749.
- Named functions/methods: `formatDateLabel` (L19), `formatYLabel` (L24), `TimeSeriesChart` (L30), `xScale` (L47), `yScale` (L48), `toPath` (L50).

## src/ui/components/analytics/TopVideosTable.tsx

- Kind: code; coverage: **Inventory**; lines: 234; bytes: 7926.
- Named functions/methods: `formatNumber` (L41), `InlineBar` (L47), `TopVideosTable` (L69), `handleSort` (L74).

## src/ui/components/analytics/TrendAnalysis.tsx

- Kind: code; coverage: **Inventory**; lines: 178; bytes: 5294.
- Named functions/methods: `splitHalves` (L25), `sum` (L30), `calcChange` (L34), `Sparkline` (L46), `TrendRow` (L81), `TrendAnalysis` (L109).

## src/ui/components/content/AccessibilityChecker.tsx

- Kind: code; coverage: **Inventory**; lines: 168; bytes: 5663.
- Named functions/methods: `AccessibilityChecker` (L30), `handleCheck` (L34).

## src/ui/components/content/EditingRecommendations.tsx

- Kind: code; coverage: **Inventory**; lines: 138; bytes: 4750.
- Named functions/methods: `intensityColor` (L29), `EditingRecommendations` (L31), `handleGet` (L38).

## src/ui/components/content/IdeationPanel.tsx

- Kind: code; coverage: **Inventory**; lines: 157; bytes: 5652.
- Named functions/methods: `IdeationPanel` (L29), `handleGenerate` (L37).

## src/ui/components/content/ModerationChecker.tsx

- Kind: code; coverage: **Inventory**; lines: 126; bytes: 4090.
- Named functions/methods: `ModerationChecker` (L24), `handleCheck` (L28).

## src/ui/components/content/ScriptImprover.tsx

- Kind: code; coverage: **Inventory**; lines: 148; bytes: 4772.
- Named functions/methods: `ScriptImprover` (L29), `handleImprove` (L37), `handleCopy` (L45).

## src/ui/components/content/ThumbnailGenerator.tsx

- Kind: code; coverage: **Inventory**; lines: 158; bytes: 5368.
- Named functions/methods: `ThumbnailGenerator` (L30), `handleGenerate` (L39), `handleCopyTag` (L43).

## src/ui/components/publish/MetadataEditor.tsx

- Kind: code; coverage: **Inventory**; lines: 272; bytes: 9878.
- Named functions/methods: `TabPanel` (L25), `MetadataEditor` (L40), `handleMetadataUpdate` (L47), `parseTagsInput` (L60), `tagsInputValue` (L67).

## src/ui/components/publish/PlatformSelector.tsx

- Kind: code; coverage: **Inventory**; lines: 139; bytes: 3945.
- Named functions/methods: `PlatformSelector` (L56), `handleToggle` (L60).

## src/ui/components/publish/PublishStatusTracker.tsx

- Kind: code; coverage: **Inventory**; lines: 333; bytes: 10694.
- Named functions/methods: `getStatusIcon` (L47), `getStatusColor` (L67), `PublishStatusTracker` (L84).

## src/ui/components/publish/SchedulePicker.tsx

- Kind: code; coverage: **Inventory**; lines: 216; bytes: 6708.
- Named functions/methods: `SchedulePicker` (L44), `handleScheduleTypeChange` (L48), `handleDateChange` (L55), `handleTimeChange` (L62), `handleTimezoneChange` (L69), `getMinDate` (L76).

## src/ui/components/publish/VideoSelector.tsx

- Kind: code; coverage: **Inventory**; lines: 168; bytes: 4680.
- Named functions/methods: `VideoSelector` (L28), `handleToggle` (L43).

## src/ui/components/scheduler/CronBuilder.tsx

- Kind: code; coverage: **Inventory**; lines: 184; bytes: 5753.
- Named functions/methods: `validateCron` (L43), `describeCron` (L51), `CronBuilder` (L80).

## src/ui/components/scheduler/ScheduleCalendar.tsx

- Kind: code; coverage: **Inventory**; lines: 621; bytes: 23586.
- Named functions/methods: `getMondayOf` (L69), `getWeekDays` (L79), `isSameDay` (L87), `formatHour` (L93), `getColorFor` (L99), `ScheduleBlock` (L113), `DetailDialog` (L175), `ScheduleCalendar` (L263), `handleDragStart` (L310), `handleDragOver` (L315), `handleDragLeave` (L321), `handleDrop` (L323), `handleDragEnd` (L354).

## src/ui/components/scheduler/ScheduleForm.tsx

- Kind: code; coverage: **Inventory**; lines: 434; bytes: 17294.
- Named functions/methods: `ScheduleForm` (L140), `handleChange` (L151), `handlePlatformsChange` (L156), `handleEngineToggle` (L161), `handleSubmit` (L165).

## src/ui/components/scheduler/ScheduleHistory.tsx

- Kind: code; coverage: **Inventory**; lines: 245; bytes: 8241.
- Named functions/methods: `formatDate` (L62), `timeAgo` (L70), `ScheduleHistory` (L84).

## src/ui/components/scheduler/ScheduledJobsList.tsx

- Kind: code; coverage: **Inventory**; lines: 202; bytes: 6659.
- Named functions/methods: `formatDate` (L46), `ScheduledJobsList` (L54), `handleTab` (L62).

## src/ui/components/shared/Button.tsx

- Kind: code; coverage: **Inventory**; lines: 41; bytes: 900.

## src/ui/components/shared/EmptyState.tsx

- Kind: code; coverage: **Inventory**; lines: 38; bytes: 1090.
- Named functions/methods: `EmptyState` (L13).

## src/ui/components/shared/LoadingSpinner.tsx

- Kind: code; coverage: **Inventory**; lines: 92; bytes: 1748.
- Named functions/methods: `LoadingSpinner` (L22).

## src/ui/components/shared/Modal.tsx

- Kind: code; coverage: **Inventory**; lines: 61; bytes: 1384.

## src/ui/components/shared/Table.tsx

- Kind: code; coverage: **Inventory**; lines: 151; bytes: 4398.
- Named functions/methods: `handleChangePage` (L58), `handleChangeRowsPerPage` (L62).

## src/ui/components/shared/Toast.tsx

- Kind: code; coverage: **Inventory**; lines: 61; bytes: 1455.
- Named functions/methods: `Toast` (L22), `handleClose` (L28).

## src/ui/components/tenant/APIKeys.tsx

- Kind: code; coverage: **Inventory**; lines: 146; bytes: 4352.
- Named functions/methods: `APIKeys` (L34).

## src/ui/components/tenant/AuditLog.tsx

- Kind: code; coverage: **Inventory**; lines: 51; bytes: 1445.
- Named functions/methods: `AuditLog` (L16).

## src/ui/components/tenant/AutomationRules.tsx

- Kind: code; coverage: **Inventory**; lines: 107; bytes: 6070.
- Named functions/methods: `AutomationRules` (L21), `createRule` (L50), `toggleRule` (L64).

## src/ui/components/tenant/BillingPage.tsx

- Kind: code; coverage: **Inventory**; lines: 76; bytes: 2914.
- Named functions/methods: `BillingPage` (L25).

## src/ui/components/tenant/Integrations.tsx

- Kind: code; coverage: **Inventory**; lines: 42; bytes: 1403.
- Named functions/methods: `Integrations` (L15).

## src/ui/components/tenant/QuotaUsage.tsx

- Kind: code; coverage: **Inventory**; lines: 48; bytes: 1484.
- Named functions/methods: `QuotaUsage` (L15).

## src/ui/components/tenant/SubscriptionManagement.tsx

- Kind: code; coverage: **Inventory**; lines: 33; bytes: 1089.
- Named functions/methods: `SubscriptionManagement` (L10).

## src/ui/components/tenant/TeamMembers.tsx

- Kind: code; coverage: **Inventory**; lines: 104; bytes: 3169.
- Named functions/methods: `TeamMembers` (L29).

## src/ui/components/tenant/WorkspaceSettings.tsx

- Kind: code; coverage: **Inventory**; lines: 62; bytes: 2020.
- Named functions/methods: `WorkspaceSettings` (L11).

## src/ui/components/tenant/WorkspaceSwitcher.tsx

- Kind: code; coverage: **Inventory**; lines: 39; bytes: 1196.
- Named functions/methods: `WorkspaceSwitcher` (L11).

## src/ui/components/video-creator/AutoScriptPanel.tsx

- Kind: code; coverage: **Inventory**; lines: 329; bytes: 11069.
- Named functions/methods: `AutoScriptPanel` (L69), `handleSourceSelection` (L113), `submitCustomSource` (L123).

## src/ui/components/video-creator/SceneEditorList.tsx

- Kind: code; coverage: **Inventory**; lines: 198; bytes: 6939.
- Named functions/methods: `SceneEditorList` (L64).

## src/ui/components/video-creator/ScenePreviewPanel.tsx

- Kind: code; coverage: **Inventory**; lines: 330; bytes: 10266.
- Named functions/methods: `splitIntoPreviewLines` (L40), `buildMediaHints` (L59), `ScenePreviewPanel` (L72), `translatePreview` (L110), `handlePlayPreview` (L166), `handleStopPreview` (L194).

## src/ui/components/video-creator/VideoConfigPanel.tsx

- Kind: code; coverage: **Inventory**; lines: 369; bytes: 13895.
- Named functions/methods: `VideoConfigPanel` (L38).

## src/ui/hooks/useABTestMutation.ts

- Kind: code; coverage: **Inventory**; lines: 76; bytes: 2717.
- Named functions/methods: `useCreateVariant` (L23), `useAssignVariant` (L50).

## src/ui/hooks/useABTestResults.ts

- Kind: code; coverage: **Inventory**; lines: 143; bytes: 4007.
- Named functions/methods: `normalizeVideos` (L36), `normalizeVariants` (L44), `computeCTR` (L60), `findWinner` (L66), `useABTestResults` (L76).

## src/ui/hooks/useAIMetrics.test.ts

- Kind: test; coverage: **Inventory**; lines: 127; bytes: 3493.

## src/ui/hooks/useAIMetrics.ts

- Kind: code; coverage: **Inventory**; lines: 417; bytes: 12349.
- Named functions/methods: `clamp` (L166), `average` (L170), `engagementRate` (L175), `syntheticSuggestion` (L181), `buildTrainingHistory` (L203), `buildRecommendations` (L223), `buildAlerts` (L269), `normalizeAIMetricsData` (L311), `useAIMetrics` (L371).

## src/ui/hooks/useAITraining.test.ts

- Kind: test; coverage: **Inventory**; lines: 67; bytes: 2012.

## src/ui/hooks/useAITraining.ts

- Kind: code; coverage: **Inventory**; lines: 119; bytes: 3360.
- Named functions/methods: `executeAITraining` (L15), `executeAISuggestion` (L40), `useAITraining` (L56).

## src/ui/hooks/useAnalytics.ts

- Kind: code; coverage: **Inventory**; lines: 209; bytes: 6384.
- Named functions/methods: `getDateRangeDates` (L76), `normalizeAnalyticsData` (L94), `useAnalytics` (L129).

## src/ui/hooks/useAutoRefresh.ts

- Kind: code; coverage: **Inventory**; lines: 59; bytes: 1338.
- Named functions/methods: `useAutoRefresh` (L15).

## src/ui/hooks/useContentSuggestions.ts

- Kind: code; coverage: **Inventory**; lines: 126; bytes: 3451.
- Named functions/methods: `useIdeationMutation` (L85), `useEditingSuggestionsMutation` (L91), `useModerationMutation` (L97), `useAccessibilityMutation` (L103), `useTrendOptimizeMutation` (L109), `usePersonalizeMutation` (L115), `useInteractiveMutation` (L121).

## src/ui/hooks/useHealthDashboard.test.ts

- Kind: test; coverage: **Inventory**; lines: 97; bytes: 2766.

## src/ui/hooks/useHealthDashboard.ts

- Kind: code; coverage: **Inventory**; lines: 168; bytes: 3825.
- Named functions/methods: `executeHealthDashboardFetch` (L109), `useHealthDashboard` (L123).

## src/ui/hooks/useMutation.ts

- Kind: code; coverage: **Inventory**; lines: 103; bytes: 2320.
- Named functions/methods: `useMutation` (L23).

## src/ui/hooks/usePublish.ts

- Kind: code; coverage: **Inventory**; lines: 262; bytes: 7421.
- Named functions/methods: `buildJobPayload` (L44), `usePublish` (L101), `channelFor` (L176).

## src/ui/hooks/useQuery.ts

- Kind: code; coverage: **Inventory**; lines: 104; bytes: 3025.
- Named functions/methods: `useQuery` (L24).

## src/ui/hooks/useScheduledJobs.ts

- Kind: code; coverage: **Inventory**; lines: 144; bytes: 4384.
- Named functions/methods: `normalizeQueueStats` (L55), `normalizeRenderJobs` (L65), `normalizePublishJobs` (L80), `useScheduledJobs` (L102).

## src/ui/hooks/useSchedulerMutation.ts

- Kind: code; coverage: **Inventory**; lines: 79; bytes: 2366.
- Named functions/methods: `useEnqueueJob` (L30).

## src/ui/hooks/useTenantInfo.ts

- Kind: code; coverage: **Inventory**; lines: 125; bytes: 3317.
- Named functions/methods: `useTenants` (L45), `useTenantDetails` (L54), `useTenantKeys` (L66), `useTenantMembers` (L78), `useTenantQuota` (L82), `useTenantBilling` (L104).

## src/ui/hooks/useTenantMutation.ts

- Kind: code; coverage: **Focused**; lines: 119; bytes: 3934.
- Named functions/methods: `useCreateTenantMutation` (L25), `useUpdateWorkspaceMutation` (L32), `useInviteMemberMutation` (L39), `useRemoveMemberMutation` (L50), `useCreateApiKeyMutation` (L61), `useRegenerateApiKeyMutation` (L68), `useRevokeApiKeyMutation` (L79), `usePlanChangeMutation` (L86), `useCancelSubscriptionMutation` (L97), `useIntegrationToggleMutation` (L107).
- Findings: A28.

## src/ui/index.html

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 18; bytes: 528.

## src/ui/index.tsx

- Kind: code; coverage: **Inventory**; lines: 14; bytes: 281.

## src/ui/pages/ABTestingDashboard.tsx

- Kind: code; coverage: **Inventory**; lines: 242; bytes: 8002.
- Named functions/methods: `TabPanel` (L44), `ABTestingDashboard` (L52), `handleVideoChange` (L66).

## src/ui/pages/AIDashboard.test.tsx

- Kind: test; coverage: **Inventory**; lines: 102; bytes: 3078.

## src/ui/pages/AIDashboard.tsx

- Kind: code; coverage: **Inventory**; lines: 276; bytes: 11212.
- Named functions/methods: `AIDashboard` (L43), `handleContextChange` (L51).

## src/ui/pages/AccountManagerPage.tsx

- Kind: code; coverage: **Inventory**; lines: 187; bytes: 6858.
- Named functions/methods: `AccountManagerPage` (L25), `handleCalculate` (L35).

## src/ui/pages/AnalyticsDashboard.tsx

- Kind: code; coverage: **Inventory**; lines: 174; bytes: 5512.
- Named functions/methods: `AnalyticsDashboard` (L32).

## src/ui/pages/AttentionOptimizerPage.tsx

- Kind: code; coverage: **Inventory**; lines: 133; bytes: 4611.
- Named functions/methods: `AttentionOptimizerPage` (L27), `handleOptimize` (L34).

## src/ui/pages/AudioQualityPage.tsx

- Kind: code; coverage: **Inventory**; lines: 170; bytes: 5098.
- Named functions/methods: `AudioQualityPage` (L25), `handleProcess` (L35).

## src/ui/pages/AutoModePage.tsx

- Kind: code; coverage: **Inventory**; lines: 607; bytes: 25695.
- Named functions/methods: `ScoreBar` (L135), `VariationCard` (L151), `copy` (L154), `JobHistoryTable` (L267), `AutoModePage` (L311), `handleGenerate` (L352).

## src/ui/pages/BrandingDashboard.tsx

- Kind: code; coverage: **Inventory**; lines: 360; bytes: 13473.
- Named functions/methods: `BrandingDashboard` (L24), `showToast` (L33), `handleSave` (L53), `handleReset` (L85).

## src/ui/pages/BulkQueue.test.tsx

- Kind: test; coverage: **Inventory**; lines: 26; bytes: 699.

## src/ui/pages/BulkQueue.tsx

- Kind: code; coverage: **Inventory**; lines: 142; bytes: 4170.
- Named functions/methods: `BulkQueue` (L18), `loadStates` (L29), `enqueue` (L46).

## src/ui/pages/CategoryMapping.test.tsx

- Kind: test; coverage: **Inventory**; lines: 26; bytes: 691.

## src/ui/pages/CategoryMapping.tsx

- Kind: code; coverage: **Inventory**; lines: 93; bytes: 2635.
- Named functions/methods: `CategoryMapping` (L20), `fetchMappings` (L27), `saveMapping` (L40).

## src/ui/pages/CommentCtaPage.tsx

- Kind: code; coverage: **Inventory**; lines: 246; bytes: 9568.
- Named functions/methods: `CommentCtaPage` (L59), `handleGenerate` (L69), `handleFetch` (L88), `copyToClipboard` (L104).

## src/ui/pages/ConnectorsPage.test.tsx

- Kind: test; coverage: **Inventory**; lines: 31; bytes: 1091.

## src/ui/pages/ConnectorsPage.tsx

- Kind: code; coverage: **Inventory**; lines: 423; bytes: 18154.
- Named functions/methods: `statusColor` (L53), `ConnectorsPage` (L60), `selectConnector` (L110), `createConnector` (L117), `updateStatus` (L143), `storeSecret` (L162), `revokeSecret` (L181), `createDestination` (L203), `verifyDestination` (L227).

## src/ui/pages/ContentTools.tsx

- Kind: code; coverage: **Inventory**; lines: 383; bytes: 12709.
- Named functions/methods: `ContentTools` (L118), `handleSelectIdea` (L124), `handleNavigateEngine` (L129).

## src/ui/pages/CostTracker.tsx

- Kind: code; coverage: **Inventory**; lines: 220; bytes: 10609.
- Named functions/methods: `CostTracker` (L27), `addRecord` (L46).

## src/ui/pages/EditingPage.tsx

- Kind: code; coverage: **Inventory**; lines: 163; bytes: 5167.
- Named functions/methods: `EditingPage` (L35), `handleGeneratePlan` (L42).

## src/ui/pages/EmotionalResonancePage.tsx

- Kind: code; coverage: **Inventory**; lines: 186; bytes: 5726.
- Named functions/methods: `EmotionalResonancePage` (L28), `handleScore` (L36).

## src/ui/pages/EngagementPredictionPage.tsx

- Kind: code; coverage: **Inventory**; lines: 160; bytes: 5799.
- Named functions/methods: `EngagementPredictionPage` (L29), `handlePredict` (L38).

## src/ui/pages/EnginesDashboard.tsx

- Kind: code; coverage: **Inventory**; lines: 1228; bytes: 55505.
- Named functions/methods: `TabPanel` (L16), `SectionCard` (L20), `CompetitorTab` (L33), `analyze` (L41), `ContentBucketsTab` (L104), `generate` (L109), `ResourceMonitorTab` (L152), `refresh` (L157), `ExportTab` (L219), `doExport` (L224), `loadExports` (L233), `AuthTab` (L281), `loadTenants` (L290), `register` (L304), `CredentialsTab` (L358), `load` (L367), `add` (L379), `rotate` (L386), `schedule` (L393), `TrendHijackTab` (L447), `hijack` (L455), `loadFormats` (L464), `ABTestTab` (L520), `loadTests` (L526), `createTest` (L531), `analyze` (L541), `ApprovalTab` (L587), `load` (L594), `submit` (L599), `autoCheck` (L613), `review` (L618), `ModerationTab` (L674), `scan` (L679), `ValidationTab` (L721), `validate` (L728), `KnowledgeBaseTab` (L776), `search` (L782), `ThrottlingTab` (L854), `load` (L859), `check` (L864), `AssetLibraryTab` (L908), `load` (L915), `add` (L924), `MarketingEngineTab` (L980), `genBanners` (L988), `genCampaign` (L996), `SystemHealthTab` (L1052), `load` (L1060), `recordError` (L1074), `processQueue` (L1081), `clearResolved` (L1087), `EnginesDashboard` (L1191).

## src/ui/pages/HealthDashboard.test.tsx

- Kind: test; coverage: **Inventory**; lines: 131; bytes: 3707.

## src/ui/pages/HealthDashboard.tsx

- Kind: code; coverage: **Inventory**; lines: 476; bytes: 22349.
- Named functions/methods: `formatPercent` (L33), `formatBytes` (L38), `formatDuration` (L46), `SeverityChip` (L52), `MetricBlock` (L57), `HealthDashboard` (L71).

## src/ui/pages/HookLibrary.tsx

- Kind: code; coverage: **Inventory**; lines: 227; bytes: 11587.
- Named functions/methods: `HookCard` (L37), `HookLibrary` (L68), `generateHooks` (L101), `addHook` (L108), `deleteHook` (L114), `copyText` (L119).

## src/ui/pages/HumanizedContentPage.tsx

- Kind: code; coverage: **Inventory**; lines: 140; bytes: 4755.
- Named functions/methods: `HumanizedContentPage` (L26), `handleHumanize` (L33).

## src/ui/pages/ImageFilterPage.tsx

- Kind: code; coverage: **Inventory**; lines: 386; bytes: 19213.
- Named functions/methods: `ImageFilterPage` (L36), `fetchPresets` (L55), `selectFilter` (L69), `buildCss` (L79), `updateParam` (L90), `generatePreview` (L103), `copyCss` (L117).

## src/ui/pages/ImageGenerator.tsx

- Kind: code; coverage: **Inventory**; lines: 190; bytes: 9957.
- Named functions/methods: `ImageGenerator` (L30), `generate` (L43), `downloadImage` (L56).

## src/ui/pages/OAuthSuccessPage.tsx

- Kind: code; coverage: **Inventory**; lines: 54; bytes: 1930.
- Named functions/methods: `OAuthSuccessPage` (L8).

## src/ui/pages/PipelineComparePage.tsx

- Kind: code; coverage: **Inventory**; lines: 690; bytes: 30496.
- Named functions/methods: `getMeta` (L96), `ScoreBar` (L100), `PlatformCard` (L129), `copy` (L133), `ScoreRadar` (L301), `PipelineComparePage` (L353), `togglePlatform` (L372), `startPolling` (L378), `handleCompare` (L403).

## src/ui/pages/ProfilesPage.tsx

- Kind: code; coverage: **Inventory**; lines: 432; bytes: 17606.
- Named functions/methods: `ProfilesPage` (L76), `createProfile` (L114), `deleteProfile` (L131), `openAddAccount` (L142), `addAccount` (L149), `deleteAccount` (L168), `startOAuth` (L178), `runResolve` (L190).

## src/ui/pages/PublishDashboard.tsx

- Kind: code; coverage: **Inventory**; lines: 432; bytes: 13139.
- Named functions/methods: `PublishDashboard` (L87), `handleKeyPress` (L113), `autofillMetadata` (L127), `validateMetadata` (L200), `handleNext` (L226), `handleBack` (L246), `handlePublish` (L250), `renderStepContent` (L269).

## src/ui/pages/QualityScoringPage.tsx

- Kind: code; coverage: **Inventory**; lines: 155; bytes: 5416.
- Named functions/methods: `QualityScoringPage` (L27), `handleScore` (L37).

## src/ui/pages/RecycleDashboard.tsx

- Kind: code; coverage: **Inventory**; lines: 187; bytes: 9831.
- Named functions/methods: `RecycleDashboard` (L36), `markRecycled` (L61), `checkFreshness` (L68), `checkDedupe` (L74).

## src/ui/pages/ReleasesPage.test.tsx

- Kind: test; coverage: **Inventory**; lines: 33; bytes: 1124.

## src/ui/pages/ReleasesPage.tsx

- Kind: code; coverage: **Partial**; lines: 472; bytes: 20461.
- Named functions/methods: `statusColor` (L74), `ReleasesPage` (L82), `openRelease` (L128), `createRelease` (L144), `approveRelease` (L163), `loadDestinations` (L183), `addTarget` (L196), `queueTarget` (L217).

## src/ui/pages/SchedulePersistPage.tsx

- Kind: code; coverage: **Inventory**; lines: 747; bytes: 33651.
- Named functions/methods: `fmtDate` (L123), `SchedulePersistPage` (L125), `handleSmartSchedule` (L158), `createSchedule` (L180), `updateStatus` (L204), `triggerRun` (L217), `deleteSchedule` (L229), `toggleEngine` (L238), `toggleAlsoGenerate` (L242), `openPreview` (L246).

## src/ui/pages/SchedulerDashboard.test.tsx

- Kind: test; coverage: **Inventory**; lines: 70; bytes: 2133.

## src/ui/pages/SchedulerDashboard.tsx

- Kind: code; coverage: **Inventory**; lines: 453; bytes: 16960.
- Named functions/methods: `QueueCard` (L69), `TabPanel` (L106), `UpcomingTab` (L125), `SchedulerDashboard` (L260).

## src/ui/pages/SeriesBuilderPage.tsx

- Kind: code; coverage: **Inventory**; lines: 343; bytes: 13693.
- Named functions/methods: `SeriesBuilderPage` (L53), `loadSeries` (L67), `handleCreate` (L84), `handleDelete` (L106), `getProgress` (L117).

## src/ui/pages/ShadowbanPage.tsx

- Kind: code; coverage: **Inventory**; lines: 450; bytes: 18025.
- Named functions/methods: `ShadowbanPage` (L75), `loadData` (L82), `getHealthColor` (L104).

## src/ui/pages/StrategyDashboard.tsx

- Kind: code; coverage: **Inventory**; lines: 255; bytes: 12771.
- Named functions/methods: `StrategyDashboard` (L51), `impBadge` (L87).

## src/ui/pages/TenantConsole.tsx

- Kind: code; coverage: **Partial**; lines: 246; bytes: 9675.
- Named functions/methods: `TenantConsole` (L30), `appendAudit` (L71), `refreshAll` (L84).
- Findings: A18.

## src/ui/pages/ThumbnailPage.tsx

- Kind: code; coverage: **Inventory**; lines: 175; bytes: 6077.
- Named functions/methods: `ThumbnailPage` (L27), `handleGenerate` (L39).

## src/ui/pages/TranslatePage.tsx

- Kind: code; coverage: **Inventory**; lines: 293; bytes: 11253.
- Named functions/methods: `TranslatePage` (L38), `handleTranslate` (L66), `handleBatchTranslate` (L88), `swapLanguages` (L111), `copyToClipboard` (L117).

## src/ui/pages/TrendDashboard.tsx

- Kind: code; coverage: **Inventory**; lines: 229; bytes: 9807.
- Named functions/methods: `ScoreBar` (L44), `TrendDashboard` (L54), `priorityColor` (L106).

## src/ui/pages/VideoCreator.tsx

- Kind: code; coverage: **Inventory**; lines: 653; bytes: 26716.
- Named functions/methods: `VideoCreator` (L47), `toggleAccordion` (L116), `fetchOptions` (L120), `reloadSources` (L140), `handleAddScene` (L225), `handleCreateCustomSource` (L229), `handleRemoveScene` (L254), `handleAutoScript` (L259), `handleSceneChange` (L296), `handleConfigChange` (L302), `handleSubmit` (L315).

## src/ui/pages/VideoDetails.test.tsx

- Kind: test; coverage: **Inventory**; lines: 31; bytes: 828.

## src/ui/pages/VideoDetails.tsx

- Kind: code; coverage: **Focused**; lines: 219; bytes: 5937.
- Named functions/methods: `VideoDetails` (L19), `checkVideoStatus` (L28), `handleBack` (L75), `renderContent` (L79), `capitalizeFirstLetter` (L165).
- Findings: A17.

## src/ui/pages/VideoLibraryPage.tsx

- Kind: code; coverage: **Inventory**; lines: 576; bytes: 31695.
- Named functions/methods: `VideoLibraryPage` (L64), `openAdd` (L118), `openEdit` (L119), `saveVideo` (L124), `deleteVideo` (L138), `updateStatus` (L147), `fmtDuration` (L156), `fmtDate` (L157).

## src/ui/pages/VideoList.test.tsx

- Kind: test; coverage: **Inventory**; lines: 28; bytes: 644.

## src/ui/pages/VideoList.tsx

- Kind: code; coverage: **Inventory**; lines: 210; bytes: 8643.
- Named functions/methods: `VideoList` (L42), `handleDeleteVideo` (L99), `titleFor` (L113), `statusFor` (L114).

## src/ui/pages/VisualEnhancementPage.tsx

- Kind: code; coverage: **Inventory**; lines: 161; bytes: 5452.
- Named functions/methods: `VisualEnhancementPage` (L24), `handleEnhance` (L35).

## src/ui/pages/WatermarkPage.tsx

- Kind: code; coverage: **Inventory**; lines: 312; bytes: 12178.
- Named functions/methods: `WatermarkPage` (L21), `handleGenerate` (L36), `handleSaveDefault` (L58), `copyFilter` (L76), `previewStyle` (L82).

## src/ui/pages/WebhookDashboard.tsx

- Kind: code; coverage: **Inventory**; lines: 520; bytes: 23371.
- Named functions/methods: `CHANNEL_ICON` (L88), `WebhookDashboard` (L107), `showToast` (L120), `openAdd` (L144), `openEdit` (L145), `closeDialog` (L159), `handleSave` (L161), `handleDelete` (L180), `handleToggle` (L188), `handleTest` (L195), `toggleEvent` (L208).

## src/ui/public/index.html

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 17; bytes: 474.

## src/ui/services/apiClient.ts

- Kind: code; coverage: **Focused**; lines: 484; bytes: 13971.
- Named functions/methods: `constructor` (L23), `unwrap` (L41), `constructor` (L73), `clearCache` (L144), `clearCacheKey` (L152), `getCachedData` (L160), `setCachedData` (L176), `get` (L187), `post` (L226), `put` (L240), `patch` (L254), `delete` (L268), `getAxiosInstance` (L281).
- Findings: A16.

## src/ui/services/authenticatedFetch.ts

- Kind: code; coverage: **Focused**; lines: 28; bytes: 930.
- Named functions/methods: `authenticatedFetch` (L11).

## src/ui/services/authenticatedJson.test.ts

- Kind: test; coverage: **Inventory**; lines: 49; bytes: 1660.

## src/ui/services/authenticatedJson.ts

- Kind: code; coverage: **Inventory**; lines: 47; bytes: 1449.
- Named functions/methods: `authenticatedJson` (L10), `jsonPost` (L30), `jsonPatch` (L36), `jsonPut` (L42).

## src/ui/store/authStore.ts

- Kind: code; coverage: **Focused**; lines: 82; bytes: 1658.
- Named functions/methods: `isAuthenticated` (L41).

## src/ui/store/uiStore.ts

- Kind: code; coverage: **Inventory**; lines: 147; bytes: 3508.
- Named functions/methods: `useNotification` (L111).

## src/ui/styles/index.css

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 60; bytes: 860.

## src/ui/tsconfig.json

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 19; bytes: 448.

## src/ui/vite-env.d.ts

- Kind: code; coverage: **Inventory**; lines: 8; bytes: 160.

## src/video/beat-sync.service.ts

- Kind: code; coverage: **Inventory**; lines: 166; bytes: 5227.
- Named functions/methods: `syncScenesToBeats` (L26), `applySyncToScenes` (L65), `calculateBeatLength` (L75), `findOptimalDuration` (L84), `calculateAlignment` (L117), `suggestBPM` (L127), `getSyncStats` (L143).

## src/workers/DeadLetterWorker.ts

- Kind: code; coverage: **Focused**; lines: 99; bytes: 3668.
- Named functions/methods: `constructor` (L36), `processJob` (L62), `close` (L95).

## src/workers/IngestWorker.test.ts

- Kind: test; coverage: **Inventory**; lines: 9; bytes: 217.

## src/workers/IngestWorker.ts

- Kind: code; coverage: **Focused**; lines: 79; bytes: 2370.
- Named functions/methods: `constructor` (L28), `processJob` (L49), `close` (L75).

## src/workers/PlanningWorker.test.ts

- Kind: test; coverage: **Inventory**; lines: 9; bytes: 225.

## src/workers/PlanningWorker.ts

- Kind: code; coverage: **Focused**; lines: 85; bytes: 3044.
- Named functions/methods: `constructor` (L24), `processJob` (L46), `close` (L81).

## src/workers/PublishWorker.ts

- Kind: code; coverage: **Focused**; lines: 355; bytes: 16605.
- Named functions/methods: `constructor` (L74), `processJob` (L168), `close` (L351).
- Findings: A10, A11.

## src/workers/QueueManager.ts

- Kind: code; coverage: **Focused**; lines: 99; bytes: 2852.
- Named functions/methods: `getRedisConnection` (L24), `testRedisConnection` (L42), `createQueue` (L57), `createRenderQueue` (L69), `createPublishQueue` (L81), `closeRedis` (L93).

## src/workers/RenderWorker.ts

- Kind: code; coverage: **Focused**; lines: 176; bytes: 6076.
- Named functions/methods: `constructor` (L38), `processJob` (L108), `close` (L172).

## src/workers/attemptBudget.test.ts

- Kind: test; coverage: **Inventory**; lines: 19; bytes: 704.

## src/workers/attemptBudget.ts

- Kind: code; coverage: **Inventory**; lines: 13; bytes: 595.
- Named functions/methods: `isTerminalAttempt` (L10).

## static/music/Aurora on the Boulevard - National Sweetheart.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1672716.

## static/music/Baby Animals Playing - Joel Cummins.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1535417.

## static/music/Banjo Doops - Joel Cummins.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1204079.

## static/music/Buckle Up - Jeremy Korpas.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1586826.

## static/music/Cafecito por la Manana - Cumbia Deli.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 2388680.

## static/music/Champion - Telecasted.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1751397.

## static/music/Crystaline - Quincas Moreira.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1736977.

## static/music/Curse of the Witches - Jimena Contreras.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1226336.

## static/music/Delayed Baggage - Ryan Stasik.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1370218.

## static/music/Final Soliloquy - Asher Fulero.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 2204360.

## static/music/Heartbeat Of The Wind - Asher Fulero.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1540119.

## static/music/Honey, I Dismembered The Kids - Ezra Lipp.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1885562.

## static/music/Hopeful - Nat Keefe.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 2166430.

## static/music/Hopeful Freedom - Asher Fulero.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 2118156.

## static/music/Hopeless - Jimena Contreras.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 3028471.

## static/music/Jetski - Telecasted.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1802806.

## static/music/Like It Loud - Dyalla.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1988380.

## static/music/Name The Time And Place - Telecasted.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1791208.

## static/music/Night Hunt - Jimena Contreras.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1086842.

## static/music/No.2 Remembering Her - Esther Abrami.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1727573.

## static/music/Oh Please - Telecasted.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1947002.

## static/music/On The Hunt - Andrew Langdon.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1152670.

## static/music/Organic Guitar House - Dyalla.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1988380.

## static/music/Phantom - Density & Time.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 2167684.

## static/music/README.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 45; bytes: 1375.

## static/music/Restless Heart - Jimena Contreras.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1152670.

## static/music/Seagull - Telecasted.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1516922.

## static/music/Sinister - Anno Domini Beats.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 2634754.

## static/music/Sly Sky - Telecasted.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1915968.

## static/music/Touch - Anno Domini Beats.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 2042924.

## static/music/Traversing - Godmode.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1177748.

## static/music/Twin Engines - Jeremy Korpas.mp3

- Kind: binary asset; coverage: **Fingerprint only**; lines: n/a; bytes: 1505637.

## tailwind.config.js

- Kind: code; coverage: **Inventory**; lines: 10; bytes: 167.

## todo.md

- Kind: documentation; coverage: **Document inventory + claim scan**; lines: 627; bytes: 53817.

## tsconfig.build.json

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 9; bytes: 154.

## tsconfig.json

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 24; bytes: 472.

## tsconfig.scripts.json

- Kind: configuration/data/asset; coverage: **Inventory**; lines: 13; bytes: 265.

## vite.config.ts

- Kind: code; coverage: **Inventory**; lines: 49; bytes: 930.

## vitest.config.ts

- Kind: code; coverage: **Inventory**; lines: 24; bytes: 438.
