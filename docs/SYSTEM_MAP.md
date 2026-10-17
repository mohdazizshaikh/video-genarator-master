# System Map — AI Viral Content Empire v12.0

Generated: 2026-08-08

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      React Frontend (Vite)                       │
│  VideoCreator · AutoMode · Scheduler · Analytics · BulkQueue    │
└───────────────────────┬─────────────────────────────────────────┘
                        │ HTTP (port 5000)
┌───────────────────────▼─────────────────────────────────────────┐
│                   Express API Server                             │
│              42 routers · Rate limiting · Swagger                │
└───────────────────────┬─────────────────────────────────────────┘
                        │
      ┌─────────────────┼──────────────────┐
      ▼                 ▼                  ▼
┌──────────┐    ┌──────────────┐   ┌──────────────────┐
│ AI Engine│    │ Content Tools│   │  Pipeline Engine  │
│  Layer   │    │    Layer     │   │  (Orchestrator)   │
└──────────┘    └──────────────┘   └──────────────────┘
      │                 │                  │
      └─────────────────┴──────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│                    Data Layer (JSON stores)                       │
│  pipeline-jobs · schedules · renderJobs · hookLibrary · reports  │
└─────────────────────────────────────────────────────────────────┘
```

---

## AI Engines (Phase 7–8)

| Engine | Service File | API Route | Purpose |
|--------|-------------|-----------|---------|
| Humanized Content | `HumanizedContentEngine.ts` | `POST /api/humanized/humanize` | Makes content feel natural with pauses, gestures, eye movement |
| Thumbnail Generator | `ThumbnailEngine.ts` | `POST /api/thumbnail/generate` | Creates scroll-stopping thumbnail directives with curiosity gaps |
| Emotional Resonance | `EmotionalResonanceEngine.ts` | `POST /api/emotional/score` | Scores and aligns emotional tone across audio/visual/script |
| Engagement Prediction | `EngagementPredictionEngine.ts` | `POST /api/engagement/predict` | Predicts views, likes, shares, viral score |
| Quality Scoring | `QualityScoringEngine.ts` | `POST /api/quality/score` | Scores audio, visual, script, technical quality |
| Attention Optimizer | `AttentionOptimizerEngine.ts` | `POST /api/attention/optimize` | Optimizes hook length and pacing for platform-specific audiences |
| Expert Editing | `ExpertEditingEngine.ts` | `POST /api/editing/enhance` | Frame-level editing directives |
| Visual Enhancement | `VisualEnhancementEngine.ts` | `POST /api/visual/enhance` | Color grading, LUT, visual effects |
| Audio Quality | `AudioQualityEngine.ts` | `POST /api/audio/analyze` | LUFS, frequency, audio mastering |
| Account Manager | `AccountManagerEngine.ts` | `GET /api/account/insights` | Multi-account performance tracking |

---

## Content Tools

| Tool | Service File | API Route | Purpose |
|------|-------------|-----------|---------|
| Translation Engine | `TranslationEngine.ts` | `POST /api/translate/` | Multilingual content via LibreTranslate |
| Comment CTA | `CommentCtaEngine.ts` | `POST /api/content/comment-cta` | Comment call-to-action strategies |
| Series Builder | `SeriesBuilderEngine.ts` | `POST /api/series/build` | Multi-part content series planning |
| Watermark Engine | `WatermarkEngine.ts` | `POST /api/watermark/filter` | FFmpeg watermark filter builder |
| Hook Library | `HookLibraryEngine.ts` | `GET /api/hooks/best` · `POST /api/hooks/generate` | 20+ viral hook templates with performance scores |
| Image Generator | `ImageGenerationEngine.ts` | `POST /api/image/generate` | Quote cards, thumbnails, announcements |
| Image Filters | `ImageFiltersEngine.ts` | `POST /api/image/filters/apply` | Cinematic, vintage, moody filters |
| Content Enhancement | `ContentEnhancementService.ts` | `POST /api/content/ideation` | Ideation, personalization, trend optimization |

---

## Core Infrastructure Modules

| Module | Location | Purpose |
|--------|----------|---------|
| Scheduler (Queue) | `SchedulerService.ts` | Enqueues Remotion render jobs |
| Schedule Manager | `ScheduleStore.ts` + `ScheduleRouter.ts` | Cron-like persistent scheduling with auto-runner |
| Trend Engine | `TrendEngine.ts` + `ViralRadarEngine.ts` | Real-time trend detection |
| Bulk Queue | `QueueRouter.ts` | Batch render job submission |
| AI Learning | `AiLearningStore.ts` + `AiTrainingService.ts` | Feedback loops for model improvement |
| Analytics | `AnalyticsStore.ts` + `AnalyticsDashboard.tsx` | Performance tracking dashboard |
| Tenant System | `TenantStore.ts` + `TenantQuotaService.ts` | Multi-tenant / white-label support |
| Branding | `BrandingEngine.ts` | White-label brand config |
| Webhooks | `WebhookNotificationEngine.ts` | External notification triggers |
| Content Recycle | `ContentRecycleEngine.ts` | Repurpose existing content |
| Strategy Center | `ViralStrategyService.ts` | Platform-specific growth strategies |
| Shadowban Detection | `ShadowbanDetectionEngine.ts` | Risk assessment for accounts |
| Cost Tracker | `CostTrackingEngine.ts` | API/render cost tracking |
| A/B Testing | `ABVariantStore.ts` | Split testing for content variants |
| Script Generator | `AiLlmGenerator.ts` | AI-powered script generation |
| Video Creator | `ShortCreator.ts` + Remotion | Core video rendering engine |
| TTS (Kokoro) | `@huggingface/transformers` | Local text-to-speech (82M ONNX model) |
| STT (Whisper.cpp) | Binary at `~/.ai-agents-az-video-generator/libs/whisper/` | Speech-to-text transcription |
| Client Profiles | `ProfileService.ts` + `ProfileStore.ts` + `ProfileAccountStore.ts` | Multi-client accounts; encrypted credentials (AES-256-GCM via TENANT_KEYS_SECRET); OAuth connect |

---

## Pipeline System (NEW — Phase 9)

| Component | Location | Purpose |
|-----------|----------|---------|
| Pipeline Orchestrator | `src/services/PipelineOrchestrator.ts` | Central controller connecting all engines |
| Pipeline Store | `src/db/PipelineStore.ts` | Stores pipeline_jobs, generated_variations, ai_scores, comparison_runs |
| Pipeline Router | `src/server/routers/pipeline.ts` | REST API: run, compare, jobs, comparisons, stats |
| Auto Mode UI | `src/ui/pages/AutoModePage.tsx` | One-click full content generation |
| Platform Comparison UI | `src/ui/pages/PipelineComparePage.tsx` | Real-time multi-platform side-by-side comparison |

### Pipeline Flow
```
Topic + Platform + Tone
        │
        ▼
1. Generate Hooks (HookLibraryEngine)
        │
        ▼
2. Humanize Content (HumanizedContentEngine)
        │
        ▼
3. Apply Emotional Resonance (EmotionalResonanceEngine)
        │
        ▼
4. Score Quality (QualityScoringEngine)
        │
        ▼
5. Optimize Attention (AttentionOptimizerEngine)
        │
        ▼
6. Predict Engagement (EngagementPredictionEngine)
        │
        ▼
7. Generate Thumbnail Directives (ThumbnailEngine)
        │
        ▼
8. Apply Watermark (WatermarkEngine)
        │
        ▼
9. Generate Caption + Hashtags
        │
        ▼
10. Rank & Select Top 3 Variations
        │
        ▼
11. Send to Scheduler / Bulk Queue (optional, bulk mode)
        │
        ▼
Ready-to-post content package
```

---

## Data Stores (JSON-based)

| Store | File | Contents |
|-------|------|---------|
| PipelineStore | `pipeline-jobs.json` + `pipeline-variations.json` + `pipeline-comparisons.json` | Pipeline job tracking + AI-scored variations + comparison runs |
| RenderJobStore | `renderJobs.json` | Video render queue |
| ScriptPlanStore | `scriptPlans.json` | Generated script plans |
| ScheduleStore | `schedules.json` | Persistent cron schedules |
| HookLibraryEngine | `hook-library.json` | Custom + built-in hooks |
| AiLearningStore | `ai-learning.json` | ML training events |
| AnalyticsStore | `analytics.json` | Performance metrics |
| TenantStore | `tenants.json` | Multi-tenant configs |
| VideoLibraryStore | `video-library.json` | Video metadata catalogue |
| ReportStore | `reports.json` | News/trend reports |
| ProfileStore | `profiles.json` | Client profiles (per client / niche) with routing categories |
| ProfileAccountStore | `profileAccounts.json` | Per-profile platform accounts (credentials encrypted AES-256-GCM) |

---

## API Endpoints Summary (40+ routes)

```
Core Video:
  POST   /api/short-video              – Create render job
  GET    /api/short-video/:id/status   – Check render status
  GET    /api/voices                   – List TTS voices (28)
  GET    /api/music-tags               – List music categories (12)

Client Profiles (multi-account):
  GET    /api/profiles                 – List profiles + account summaries
  POST   /api/profiles                 – Create profile (name, genres)
  GET    /api/profiles/:id             – Get profile
  PATCH  /api/profiles/:id             – Update profile
  DELETE /api/profiles/:id             – Delete profile + accounts
  POST   /api/profiles/resolve         – Auto-route: { category, platform } → accounts
  GET    /api/profiles/:id/accounts    – List profile accounts
  POST   /api/profiles/:id/accounts    – Add account (encrypted credentials)
  DELETE /api/profiles/:id/accounts/:accountId – Remove account
  POST   /api/oauth/:provider/connect  – Start OAuth flow (YouTube supported)
  GET    /api/oauth/:provider/callback – OAuth redirect target

Pipeline (NEW):
  POST   /api/pipeline/run             – Run full AI pipeline (single platform)
  POST   /api/pipeline/compare         – Compare topic across multiple platforms (parallel)
  GET    /api/pipeline/comparisons     – List comparison runs
  GET    /api/pipeline/comparisons/:id – Poll live comparison status
  GET    /api/pipeline/jobs            – List pipeline jobs
  GET    /api/pipeline/jobs/:id        – Get job + variations
  GET    /api/pipeline/stats           – Aggregate statistics

AI Engines:
  POST   /api/humanized/humanize
  POST   /api/emotional/score
  POST   /api/quality/score
  POST   /api/attention/optimize
  POST   /api/engagement/predict
  POST   /api/thumbnail/generate

Content Tools:
  POST   /api/translate/
  POST   /api/watermark/filter
  POST   /api/hooks/generate
  POST   /api/image/quote-card
  POST   /api/content/ideation

Scheduler:
  POST   /api/schedule                 – Create schedule
  GET    /api/schedule                 – List schedules
  POST   /api/schedule/:id/run         – Trigger now
  POST   /api/queue/bulk               – Bulk enqueue

System:
  GET    /api/health
  GET    /api/docs                     – Swagger UI
```


<!-- AUTO-GENERATED:router-inventory:BEGIN -->
**47 routers** registered in `src/server/server.ts`.

| Method | Path | Router |
|--------|------|--------|
| `GET` | `/api/abtesting` | abTestingRouter |
| `POST` | `/api/abtesting` | abTestingRouter |
| `GET` | `/api/abtesting/:id` | abTestingRouter |
| `GET` | `/api/abtesting/:id/analyze` | abTestingRouter |
| `POST` | `/api/abtesting/:id/event` | abTestingRouter |
| `POST` | `/api/abtesting/:id/pause` | abTestingRouter |
| `POST` | `/api/abtesting/:id/resume` | abTestingRouter |
| `GET` | `/api/abtesting/running` | abTestingRouter |
| `POST` | `/api/account/guidance` | accountRouter |
| `GET` | `/api/account/load` | accountRouter |
| `POST` | `/api/account/metrics` | accountRouter |
| `POST` | `/api/account/save` | accountRouter |
| `GET` | `/api/ai/dashboard` | aiRouter |
| `GET` | `/api/ai/events` | aiRouter |
| `POST` | `/api/ai/events` | aiRouter |
| `GET` | `/api/ai/model` | aiRouter |
| `POST` | `/api/ai/suggest` | aiRouter |
| `POST` | `/api/ai/train` | aiRouter |
| `POST` | `/api/approval/moderate` | approvalRouter |
| `POST` | `/api/approval/moderate/batch` | approvalRouter |
| `GET` | `/api/approval/moderate/rules` | approvalRouter |
| `GET` | `/api/approval/queue` | approvalRouter |
| `POST` | `/api/approval/queue/:id/auto-check` | approvalRouter |
| `PATCH` | `/api/approval/queue/:id/checklist` | approvalRouter |
| `POST` | `/api/approval/queue/:id/review` | approvalRouter |
| `GET` | `/api/approval/queue/pending` | approvalRouter |
| `GET` | `/api/approval/queue/stats` | approvalRouter |
| `POST` | `/api/approval/queue/submit` | approvalRouter |
| `POST` | `/api/approval/validate/image` | approvalRouter |
| `POST` | `/api/approval/validate/metadata` | approvalRouter |
| `GET` | `/api/approval/validate/platforms` | approvalRouter |
| `POST` | `/api/approval/validate/video` | approvalRouter |
| `POST` | `/api/attention/analyze` | attentionRouter |
| `GET` | `/api/attention/hook/:platform/:topic` | attentionRouter |
| `POST` | `/api/attention/optimize` | attentionRouter |
| `POST` | `/api/audio/detect-levels` | audioRouter |
| `GET` | `/api/audio/ffmpeg-chain` | audioRouter |
| `POST` | `/api/audio/process` | audioRouter |
| `GET` | `/api/branding` | brandingRouter |
| `GET` | `/api/branding/:tenantId` | brandingRouter |
| `PUT` | `/api/branding/:tenantId` | brandingRouter |
| `GET` | `/api/branding/:tenantId/css` | brandingRouter |
| `POST` | `/api/branding/:tenantId/reset` | brandingRouter |
| `GET` | `/api/channel-configs` | channelConfigRouter |
| `POST` | `/api/channel-configs` | channelConfigRouter |
| `DELETE` | `/api/channel-configs/:id` | channelConfigRouter |
| `GET` | `/api/competitor/creators` | competitorRouter |
| `GET` | `/api/competitor/history` | competitorRouter |
| `GET` | `/api/competitor/patterns` | competitorRouter |
| `POST` | `/api/competitor/strategy` | competitorRouter |
| `GET` | `/api/connectors` | connectorsRouter |
| `POST` | `/api/connectors` | connectorsRouter |
| `PATCH` | `/api/connectors/:connectorId` | connectorsRouter |
| `GET` | `/api/connectors/:connectorId/destinations` | connectorsRouter |
| `POST` | `/api/connectors/:connectorId/destinations` | connectorsRouter |
| `POST` | `/api/connectors/:connectorId/destinations/:destinationId/verify` | connectorsRouter |
| `PUT` | `/api/connectors/:connectorId/secret` | connectorsRouter |
| `GET` | `/api/content-versions` | contentVersionsRouter |
| `POST` | `/api/content-versions` | contentVersionsRouter |
| `GET` | `/api/content-versions/:contentVersionId` | contentVersionsRouter |
| `PATCH` | `/api/content-versions/:contentVersionId` | contentVersionsRouter |
| `PATCH` | `/api/content-versions/:contentVersionId/render` | contentVersionsRouter |
| `POST` | `/api/content/accessibility` | contentRouter |
| `POST` | `/api/content/editing-primitives` | contentRouter |
| `POST` | `/api/content/ideation` | contentRouter |
| `POST` | `/api/content/interactive` | contentRouter |
| `POST` | `/api/content/moderate` | contentRouter |
| `POST` | `/api/content/personalize` | contentRouter |
| `POST` | `/api/content/trend-optimize` | contentRouter |
| `GET` | `/api/costs/rates` | costsRouter |
| `POST` | `/api/costs/record` | costsRouter |
| `GET` | `/api/costs/summary` | costsRouter |
| `GET` | `/api/costs/tenant/:tenantId` | costsRouter |
| `GET` | `/api/editing/effects/:type/:intensity` | editingRouter |
| `POST` | `/api/editing/plan` | editingRouter |
| `GET` | `/api/emotional/directives/:emotion` | emotionalRouter |
| `POST` | `/api/emotional/score` | emotionalRouter |
| `POST` | `/api/emotional/validate` | emotionalRouter |
| `POST` | `/api/engagement/predict` | engagementRouter |
| `POST` | `/api/engagement/virality-factor` | engagementRouter |
| `POST` | `/api/engines/caption/generate` | enginesRouter |
| `POST` | `/api/engines/category/classify` | enginesRouter |
| `GET` | `/api/engines/category/list` | enginesRouter |
| `POST` | `/api/engines/content/caption` | enginesRouter |
| `POST` | `/api/engines/content/hook` | enginesRouter |
| `POST` | `/api/engines/content/script` | enginesRouter |
| `POST` | `/api/engines/image/banner` | enginesRouter |
| `POST` | `/api/engines/image/carousel` | enginesRouter |
| `POST` | `/api/engines/image/poster` | enginesRouter |
| `POST` | `/api/engines/image/quote-card` | enginesRouter |
| `POST` | `/api/engines/trend-hijack` | enginesRouter |
| `POST` | `/api/engines/trend-hijack/evergreen` | enginesRouter |
| `GET` | `/api/engines/trend-hijack/formats` | enginesRouter |
| `GET` | `/api/engines/trend-hijack/history` | enginesRouter |
| `GET` | `/api/engines/voice/profiles` | enginesRouter |
| `POST` | `/api/engines/voice/recommend` | enginesRouter |
| `POST` | `/api/engines/voice/synthesize` | enginesRouter |
| `GET` | `/api/health` | healthRouter |
| `GET` | `/api/health/dashboard` | healthRouter |
| `GET` | `/api/health/metrics` | healthRouter |
| `GET` | `/api/health/queue` | healthRouter |
| `GET` | `/api/health/queue/states` | healthRouter |
| `GET` | `/api/hooks` | hooksRouter |
| `POST` | `/api/hooks` | hooksRouter |
| `DELETE` | `/api/hooks/:hookId` | hooksRouter |
| `PATCH` | `/api/hooks/:hookId/track` | hooksRouter |
| `GET` | `/api/hooks/best` | hooksRouter |
| `POST` | `/api/hooks/generate` | hooksRouter |
| `GET` | `/api/humanized/avatar-directives/:emotion` | humanizedRouter |
| `GET` | `/api/humanized/config` | humanizedRouter |
| `PUT` | `/api/humanized/config` | humanizedRouter |
| `POST` | `/api/humanized/humanize` | humanizedRouter |
| `POST` | `/api/image/announcement` | imageRouter |
| `GET` | `/api/image/file/:fileName` | imageRouter |
| `GET` | `/api/image/filtered/:fileName` | imageRouter |
| `GET` | `/api/image/filters` | imageRouter |
| `GET` | `/api/image/filters/:filterId` | imageRouter |
| `POST` | `/api/image/filters/apply` | imageRouter |
| `POST` | `/api/image/filters/batch` | imageRouter |
| `POST` | `/api/image/filters/css` | imageRouter |
| `POST` | `/api/image/filters/preview` | imageRouter |
| `GET` | `/api/image/filters/preview/file/:fileName` | imageRouter |
| `POST` | `/api/image/generate` | imageRouter |
| `POST` | `/api/image/quote-card` | imageRouter |
| `POST` | `/api/image/thumbnail` | imageRouter |
| `GET` | `/api/job-events/events` | jobEventsRouter |
| `GET` | `/api/job-events/outbox` | jobEventsRouter |
| `POST` | `/api/job-events/outbox/:id/requeue` | jobEventsRouter |
| `GET` | `/api/job-events/outbox/metrics` | jobEventsRouter |
| `POST` | `/api/marketing/ab/assign/:videoId` | marketingRouter |
| `POST` | `/api/marketing/ab/variants` | marketingRouter |
| `GET` | `/api/marketing/ab/variants/:videoId` | marketingRouter |
| `POST` | `/api/marketing/analytics` | marketingRouter |
| `GET` | `/api/marketing/analytics/:videoId` | marketingRouter |
| `GET` | `/api/marketing/audience` | marketingRouter |
| `POST` | `/api/marketing/audience` | marketingRouter |
| `GET` | `/api/marketing/dashboard` | marketingRouter |
| `POST` | `/api/marketing/seo/optimize` | marketingRouter |
| `GET` | `/api/oauth/:provider/callback` | oauthRouter |
| `POST` | `/api/oauth/:provider/connect` | oauthRouter |
| `POST` | `/api/pipeline/compare` | pipelineRouter |
| `GET` | `/api/pipeline/comparisons` | pipelineRouter |
| `GET` | `/api/pipeline/comparisons/:id` | pipelineRouter |
| `GET` | `/api/pipeline/jobs` | pipelineRouter |
| `GET` | `/api/pipeline/jobs/:id` | pipelineRouter |
| `POST` | `/api/pipeline/run` | pipelineRouter |
| `GET` | `/api/pipeline/stats` | pipelineRouter |
| `GET` | `/api/profiles` | profilesRouter |
| `POST` | `/api/profiles` | profilesRouter |
| `DELETE` | `/api/profiles/:id` | profilesRouter |
| `GET` | `/api/profiles/:id` | profilesRouter |
| `PATCH` | `/api/profiles/:id` | profilesRouter |
| `GET` | `/api/profiles/:id/accounts` | profilesRouter |
| `POST` | `/api/profiles/:id/accounts` | profilesRouter |
| `DELETE` | `/api/profiles/:id/accounts/:accountId` | profilesRouter |
| `POST` | `/api/profiles/:id/accounts/:accountId/refresh` | profilesRouter |
| `POST` | `/api/profiles/resolve` | profilesRouter |
| `GET` | `/api/publish` | publishRouter |
| `POST` | `/api/publish` | publishRouter |
| `GET` | `/api/publish/:id` | publishRouter |
| `POST` | `/api/publish/metadata-suggestions` | publishRouter |
| `POST` | `/api/quality/score` | qualityRouter |
| `PATCH` | `/api/recycle/:videoId/metrics` | recycleRouter |
| `POST` | `/api/recycle/:videoId/recycle` | recycleRouter |
| `GET` | `/api/recycle/candidates` | recycleRouter |
| `POST` | `/api/recycle/dedupe/check` | recycleRouter |
| `GET` | `/api/recycle/dedupe/stats` | recycleRouter |
| `POST` | `/api/recycle/freshness/check` | recycleRouter |
| `POST` | `/api/recycle/freshness/record` | recycleRouter |
| `POST` | `/api/recycle/register` | recycleRouter |
| `GET` | `/api/recycle/stats` | recycleRouter |
| `GET` | `/api/releases` | releasesRouter |
| `POST` | `/api/releases` | releasesRouter |
| `GET` | `/api/releases/:releaseId` | releasesRouter |
| `POST` | `/api/releases/:releaseId/approve` | releasesRouter |
| `POST` | `/api/releases/:releaseId/queue` | releasesRouter |
| `POST` | `/api/releases/:releaseId/targets` | releasesRouter |
| `GET` | `/api/repurpose` | repurposeRouter |
| `POST` | `/api/repurpose` | repurposeRouter |
| `GET` | `/api/schedule` | scheduleRouter |
| `POST` | `/api/schedule` | scheduleRouter |
| `DELETE` | `/api/schedule/:id` | scheduleRouter |
| `GET` | `/api/schedule/:id` | scheduleRouter |
| `PATCH` | `/api/schedule/:id` | scheduleRouter |
| `POST` | `/api/schedule/:id/run` | scheduleRouter |
| `PATCH` | `/api/schedule/:id/status` | scheduleRouter |
| `GET` | `/api/schedule/best-times` | scheduleRouter |
| `GET` | `/api/schedule/due` | scheduleRouter |
| `GET` | `/api/schedule/stats` | scheduleRouter |
| `GET` | `/api/schedule/upcoming` | scheduleRouter |
| `GET` | `/api/shadowban` | shadowbanRouter |
| `GET` | `/api/shadowban/analyze/:platform/:accountId` | shadowbanRouter |
| `GET` | `/api/shadowban/best-time/:platform` | shadowbanRouter |
| `POST` | `/api/shadowban/best-time/record` | shadowbanRouter |
| `GET` | `/api/shadowban/hashtags/:platform` | shadowbanRouter |
| `GET` | `/api/shadowban/hashtags/:platform/trending` | shadowbanRouter |
| `POST` | `/api/shadowban/hashtags/record` | shadowbanRouter |
| `POST` | `/api/shadowban/humanize-schedule` | shadowbanRouter |
| `POST` | `/api/shadowban/metrics` | shadowbanRouter |
| `GET` | `/api/shadowban/skip/:platform/:category` | shadowbanRouter |
| `POST` | `/api/shadowban/skip/record` | shadowbanRouter |
| `GET` | `/api/strategy/buckets` | strategyRouter |
| `POST` | `/api/strategy/buckets/add` | strategyRouter |
| `GET` | `/api/strategy/buckets/next` | strategyRouter |
| `GET` | `/api/strategy/cta` | strategyRouter |
| `POST` | `/api/strategy/cta/generate` | strategyRouter |
| `GET` | `/api/strategy/platform/:platform` | strategyRouter |
| `POST` | `/api/strategy/platform/optimal` | strategyRouter |
| `GET` | `/api/strategy/platforms` | strategyRouter |
| `GET` | `/api/strategy/series` | strategyRouter |
| `POST` | `/api/strategy/series` | strategyRouter |
| `DELETE` | `/api/strategy/series/:id` | strategyRouter |
| `GET` | `/api/strategy/series/:id` | strategyRouter |
| `GET` | `/api/strategy/series/:id/cliffhanger/:episode` | strategyRouter |
| `PATCH` | `/api/strategy/series/:id/episode/:ep` | strategyRouter |
| `GET` | `/api/strategy/series/:id/next-episode` | strategyRouter |
| `GET` | `/api/system-engines/assets` | systemEnginesRouter |
| `POST` | `/api/system-engines/assets` | systemEnginesRouter |
| `DELETE` | `/api/system-engines/assets/:id` | systemEnginesRouter |
| `PATCH` | `/api/system-engines/assets/:id/tags` | systemEnginesRouter |
| `GET` | `/api/system-engines/assets/stats` | systemEnginesRouter |
| `POST` | `/api/system-engines/auth/authenticate` | systemEnginesRouter |
| `POST` | `/api/system-engines/auth/register` | systemEnginesRouter |
| `POST` | `/api/system-engines/auth/rotate/:tenantId` | systemEnginesRouter |
| `GET` | `/api/system-engines/auth/tenants` | systemEnginesRouter |
| `POST` | `/api/system-engines/auth/verify` | systemEnginesRouter |
| `GET` | `/api/system-engines/compliance/critical` | systemEnginesRouter |
| `POST` | `/api/system-engines/compliance/log` | systemEnginesRouter |
| `GET` | `/api/system-engines/compliance/logs` | systemEnginesRouter |
| `POST` | `/api/system-engines/compliance/report` | systemEnginesRouter |
| `POST` | `/api/system-engines/content-buckets/add` | contentBucketsRouter |
| `POST` | `/api/system-engines/content-buckets/detect` | contentBucketsRouter |
| `GET` | `/api/system-engines/content-buckets/next` | contentBucketsRouter |
| `GET` | `/api/system-engines/content-buckets/stats` | contentBucketsRouter |
| `GET` | `/api/system-engines/credentials` | systemEnginesRouter |
| `POST` | `/api/system-engines/credentials` | systemEnginesRouter |
| `POST` | `/api/system-engines/credentials/:id/rotate` | systemEnginesRouter |
| `GET` | `/api/system-engines/credentials/expiring` | systemEnginesRouter |
| `POST` | `/api/system-engines/credentials/schedule` | systemEnginesRouter |
| `GET` | `/api/system-engines/errorrecovery` | systemEnginesRouter |
| `POST` | `/api/system-engines/errorrecovery/:id/dead` | systemEnginesRouter |
| `POST` | `/api/system-engines/errorrecovery/:id/recover` | systemEnginesRouter |
| `POST` | `/api/system-engines/errorrecovery/clear` | systemEnginesRouter |
| `GET` | `/api/system-engines/errorrecovery/deadletter` | systemEnginesRouter |
| `POST` | `/api/system-engines/errorrecovery/process` | systemEnginesRouter |
| `POST` | `/api/system-engines/errorrecovery/record` | systemEnginesRouter |
| `GET` | `/api/system-engines/errorrecovery/stats` | systemEnginesRouter |
| `POST` | `/api/system-engines/export` | systemEnginesRouter |
| `POST` | `/api/system-engines/export/backup` | systemEnginesRouter |
| `GET` | `/api/system-engines/export/list` | systemEnginesRouter |
| `POST` | `/api/system-engines/export/restore` | systemEnginesRouter |
| `GET` | `/api/system-engines/knowledgebase` | systemEnginesRouter |
| `POST` | `/api/system-engines/knowledgebase` | systemEnginesRouter |
| `DELETE` | `/api/system-engines/knowledgebase/:id` | systemEnginesRouter |
| `PATCH` | `/api/system-engines/knowledgebase/:id` | systemEnginesRouter |
| `GET` | `/api/system-engines/knowledgebase/categories` | systemEnginesRouter |
| `GET` | `/api/system-engines/knowledgebase/top` | systemEnginesRouter |
| `POST` | `/api/system-engines/marketing-engine/banners` | systemEnginesRouter |
| `POST` | `/api/system-engines/marketing-engine/campaign` | systemEnginesRouter |
| `POST` | `/api/system-engines/marketing-engine/scrape` | systemEnginesRouter |
| `GET` | `/api/system-engines/resource/history` | systemEnginesRouter |
| `GET` | `/api/system-engines/resource/optimize` | systemEnginesRouter |
| `POST` | `/api/system-engines/resource/predict` | systemEnginesRouter |
| `GET` | `/api/system-engines/resource/snapshot` | systemEnginesRouter |
| `POST` | `/api/system-engines/throttle/check` | systemEnginesRouter |
| `POST` | `/api/system-engines/throttle/plan` | systemEnginesRouter |
| `GET` | `/api/system-engines/throttle/quotas` | systemEnginesRouter |
| `GET` | `/api/system-engines/throttle/quotas/:tenantId` | systemEnginesRouter |
| `POST` | `/api/system-engines/throttle/reset` | systemEnginesRouter |
| `GET` | `/api/tenants` | tenantRouter |
| `POST` | `/api/tenants` | tenantRouter |
| `GET` | `/api/tenants/:tenantId` | tenantRouter |
| `PUT` | `/api/tenants/:tenantId` | tenantRouter |
| `GET` | `/api/tenants/:tenantId/billing` | tenantRouter |
| `POST` | `/api/tenants/:tenantId/engines` | tenantRouter |
| `GET` | `/api/tenants/:tenantId/keys` | tenantRouter |
| `POST` | `/api/tenants/:tenantId/keys` | tenantRouter |
| `DELETE` | `/api/tenants/:tenantId/keys/:keyId` | tenantRouter |
| `POST` | `/api/tenants/:tenantId/logs/:engine` | tenantRouter |
| `POST` | `/api/tenants/:tenantId/quotas` | tenantRouter |
| `POST` | `/api/tenants/bootstrap` | tenantRouter |
| `GET` | `/api/thumbnail/curiosity-gap/:topic` | thumbnailRouter |
| `POST` | `/api/thumbnail/generate` | thumbnailRouter |
| `POST` | `/api/thumbnail/validate-contrast` | thumbnailRouter |
| `POST` | `/api/translate` | translateRouter |
| `POST` | `/api/translate/batch` | translateRouter |
| `GET` | `/api/translate/languages` | translateRouter |
| `GET` | `/api/trends` | trendsRouter |
| `GET` | `/api/trends/category/:category` | trendsRouter |
| `POST` | `/api/trends/refresh` | trendsRouter |
| `GET` | `/api/trends/viral-radar` | trendsRouter |
| `GET` | `/api/videolibrary` | videoLibraryRouter |
| `POST` | `/api/videolibrary` | videoLibraryRouter |
| `DELETE` | `/api/videolibrary/:id` | videoLibraryRouter |
| `GET` | `/api/videolibrary/:id` | videoLibraryRouter |
| `PATCH` | `/api/videolibrary/:id` | videoLibraryRouter |
| `PATCH` | `/api/videolibrary/:id/metrics` | videoLibraryRouter |
| `PATCH` | `/api/videolibrary/:id/status` | videoLibraryRouter |
| `GET` | `/api/videolibrary/search` | videoLibraryRouter |
| `GET` | `/api/videolibrary/stats` | videoLibraryRouter |
| `GET` | `/api/videolibrary/tags` | videoLibraryRouter |
| `POST` | `/api/visual/enhance` | visualRouter |
| `GET` | `/api/visual/ffmpeg-filters` | visualRouter |
| `GET` | `/api/watermark/default` | watermarkRouter |
| `PUT` | `/api/watermark/default` | watermarkRouter |
| `POST` | `/api/watermark/filter` | watermarkRouter |
| `GET` | `/api/webhooks` | webhooksRouter |
| `POST` | `/api/webhooks` | webhooksRouter |
| `DELETE` | `/api/webhooks/:id` | webhooksRouter |
| `PUT` | `/api/webhooks/:id` | webhooksRouter |
| `POST` | `/api/webhooks/:id/test` | webhooksRouter |
| `PATCH` | `/api/webhooks/:id/toggle` | webhooksRouter |
| `GET` | `/api/webhooks/logs` | webhooksRouter |
| `POST` | `/api/webhooks/notify` | webhooksRouter |
| `GET` | `/api/webhooks/stats` | webhooksRouter |
<!-- AUTO-GENERATED:router-inventory:END -->
