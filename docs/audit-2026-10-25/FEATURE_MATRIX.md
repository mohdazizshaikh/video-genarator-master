# Current routed feature matrix

This is an extracted page/dependency/endpoint inventory, not a browser acceptance result. Dynamic URLs retain expressions; indirect requests live in the named hooks/components. Findings and workflow classifications in MASTER_AUDIT.md take precedence over page names.

| UI route | Page | Direct API literals | Local dependencies |
|---|---|---|---|
| / | [VideoList](../../src/ui/pages/VideoList.tsx) | Indirect / none literal | ../services/apiClient |
| /create | [VideoCreator](../../src/ui/pages/VideoCreator.tsx) | `/api/auto-script`; `/api/auto-script/hooks`; `/api/auto-script/topics`; `/api/music-tags`; `/api/news-sources`; `/api/news-sources/custom`; `/api/short-video`; `/api/voices` | ../components/video-creator/AutoScriptPanel, ../components/video-creator/SceneEditorList, ../components/shared/LoadingSpinner, ../services/apiClient |
| /video/:videoId | [VideoDetails](../../src/ui/pages/VideoDetails.tsx) | `/api/short-video/${videoId}`; `/api/short-video/${videoId}/status` | ../services/apiClient |
| /queue | [BulkQueue](../../src/ui/pages/BulkQueue.tsx) | `/api/health/queue/states`; `/api/queue/bulk` | ../services/apiClient |
| /mappings | [CategoryMapping](../../src/ui/pages/CategoryMapping.tsx) | Indirect / none literal | ../services/apiClient |
| /publish | [PublishDashboard](../../src/ui/pages/PublishDashboard.tsx) | Indirect / none literal | ../components/publish/VideoSelector, ../components/publish/PlatformSelector, ../components/publish/MetadataEditor, ../components/publish/SchedulePicker, ../components/publish/PublishStatusTracker, ../hooks/usePublish, ../services/apiClient, ../hooks/useQuery |
| /analytics | [AnalyticsDashboard](../../src/ui/pages/AnalyticsDashboard.tsx) | Indirect / none literal | ../hooks/useAnalytics, ../components/analytics/KPICards, ../components/analytics/DateRangePicker, ../components/analytics/TimeSeriesChart, ../components/analytics/EngagementBreakdown, ../components/analytics/TopVideosTable, ../components/analytics/PlatformComparison, ../components/analytics/TrendAnalysis, ../components/analytics/ContentHeatmap |
| /scheduler | [SchedulerDashboard](../../src/ui/pages/SchedulerDashboard.tsx) | `/api/schedule/upcoming?hours=24` | ../services/authenticatedFetch, ../hooks/useScheduledJobs, ../hooks/useAutoRefresh, ../components/scheduler/ScheduleForm, ../components/scheduler/ScheduledJobsList, ../components/scheduler/ScheduleHistory, ../components/scheduler/ScheduleCalendar, ../components/shared/EmptyState |
| /ab-testing | [ABTestingDashboard](../../src/ui/pages/ABTestingDashboard.tsx) | Indirect / none literal | ../hooks/useABTestResults, ../components/ab-testing/VariantCreationForm, ../components/ab-testing/ActiveTestsList, ../components/ab-testing/ResultsView, ../components/ab-testing/HistoricalTests |
| /ai | [AIDashboard](../../src/ui/pages/AIDashboard.tsx) | Indirect / none literal | ../hooks/useAIMetrics, ../hooks/useAITraining, ../hooks/useAutoRefresh, ../components/ai/ModelHealthCard, ../components/ai/TrainingJobsList, ../components/ai/TrainingHistory, ../components/ai/PredictionsList, ../components/ai/RecommendationsPanel, ../components/ai/ModelComparison, ../components/shared/EmptyState |
| /health | [HealthDashboard](../../src/ui/pages/HealthDashboard.tsx) | Indirect / none literal | ../hooks/useHealthDashboard, ../hooks/useAutoRefresh, ../components/shared/EmptyState |
| /tenants | [TenantConsole](../../src/ui/pages/TenantConsole.tsx) | `/api/tenants/bootstrap` | ../components/tenant/WorkspaceSwitcher, ../components/AuthBootstrap, ../services/apiClient, ../components/tenant/WorkspaceSettings, ../components/tenant/TeamMembers, ../components/tenant/APIKeys, ../components/tenant/QuotaUsage, ../components/tenant/BillingPage, ../components/tenant/AuditLog, ../components/tenant/SubscriptionManagement, ../components/tenant/Integrations, ../components/tenant/AutomationRules, ../hooks/useTenantInfo, ../hooks/useTenantMutation |
| /content-tools | [ContentTools](../../src/ui/pages/ContentTools.tsx) | Indirect / none literal | ../components/content/IdeationPanel, ../components/content/EditingRecommendations, ../components/content/ModerationChecker, ../components/content/AccessibilityChecker, ../components/content/ThumbnailGenerator, ../components/content/ScriptImprover, ../hooks/useContentSuggestions |
| /trends | [TrendDashboard](../../src/ui/pages/TrendDashboard.tsx) | `/api/trends`; `/api/trends/refresh`; `/api/trends/viral-radar` | ../services/authenticatedFetch |
| /hooks | [HookLibrary](../../src/ui/pages/HookLibrary.tsx) | `/api/hooks`; `/api/hooks/${id}`; `/api/hooks/generate` | ../services/authenticatedFetch |
| /image-generator | [ImageGenerator](../../src/ui/pages/ImageGenerator.tsx) | `/api/image/${endpoint}`; `/api/image/file/${result.fileName}` | ../services/authenticatedFetch |
| /recycle | [RecycleDashboard](../../src/ui/pages/RecycleDashboard.tsx) | `/api/recycle/${videoId}/recycle`; `/api/recycle/candidates`; `/api/recycle/dedupe/check`; `/api/recycle/freshness/check`; `/api/recycle/stats` | ../services/authenticatedFetch |
| /costs | [CostTracker](../../src/ui/pages/CostTracker.tsx) | `/api/costs/record`; `/api/costs/summary` | ../services/authenticatedFetch |
| /strategy | [StrategyDashboard](../../src/ui/pages/StrategyDashboard.tsx) | `/api/strategy/buckets`; `/api/strategy/buckets/next`; `/api/strategy/cta?platform=${ctaPlatform}&category=${ctaCategory}&limit=5`; `/api/strategy/platforms` | ../services/authenticatedFetch |
| /webhooks | [WebhookDashboard](../../src/ui/pages/WebhookDashboard.tsx) | `/api/webhooks`; `/api/webhooks/${editingId}`; `/api/webhooks/${id}`; `/api/webhooks/${id}/test`; `/api/webhooks/${id}/toggle`; `/api/webhooks/logs?limit=50`; `/api/webhooks/stats` | ../services/authenticatedFetch |
| /branding | [BrandingDashboard](../../src/ui/pages/BrandingDashboard.tsx) | `/api/branding/${tenantId}`; `/api/branding/${tenantId}/reset` | ../services/authenticatedFetch |
| /humanized | [HumanizedContentPage](../../src/ui/pages/HumanizedContentPage.tsx) | `/api/humanized/humanize` | ../services/authenticatedFetch |
| /thumbnail | [ThumbnailPage](../../src/ui/pages/ThumbnailPage.tsx) | `/api/thumbnail/generate` | ../services/authenticatedFetch |
| /editing | [EditingPage](../../src/ui/pages/EditingPage.tsx) | `/api/editing/plan` | ../services/authenticatedFetch |
| /visual | [VisualEnhancementPage](../../src/ui/pages/VisualEnhancementPage.tsx) | `/api/visual/enhance` | ../services/authenticatedFetch |
| /audio | [AudioQualityPage](../../src/ui/pages/AudioQualityPage.tsx) | `/api/audio/process` | ../services/authenticatedFetch |
| /emotional | [EmotionalResonancePage](../../src/ui/pages/EmotionalResonancePage.tsx) | `/api/emotional/score` | ../services/authenticatedFetch |
| /attention | [AttentionOptimizerPage](../../src/ui/pages/AttentionOptimizerPage.tsx) | `/api/attention/optimize` | ../services/authenticatedFetch |
| /quality | [QualityScoringPage](../../src/ui/pages/QualityScoringPage.tsx) | `/api/quality/score` | ../services/authenticatedFetch |
| /engagement | [EngagementPredictionPage](../../src/ui/pages/EngagementPredictionPage.tsx) | `/api/engagement/predict` | ../services/authenticatedFetch |
| /account | [AccountManagerPage](../../src/ui/pages/AccountManagerPage.tsx) | `/api/account/guidance`; `/api/account/metrics` | ../services/authenticatedFetch |
| /translate | [TranslatePage](../../src/ui/pages/TranslatePage.tsx) | `/api/translate/`; `/api/translate/batch`; `/api/translate/languages` | ../services/authenticatedFetch |
| /comment-cta | [CommentCtaPage](../../src/ui/pages/CommentCtaPage.tsx) | `/api/strategy/cta/generate`; `/api/strategy/cta?${params}` | ../services/authenticatedFetch |
| /series | [SeriesBuilderPage](../../src/ui/pages/SeriesBuilderPage.tsx) | `/api/strategy/series`; `/api/strategy/series/${id}` | ../services/authenticatedFetch |
| /watermark | [WatermarkPage](../../src/ui/pages/WatermarkPage.tsx) | `/api/watermark/default`; `/api/watermark/filter` | ../services/authenticatedFetch |
| /shadowban | [ShadowbanPage](../../src/ui/pages/ShadowbanPage.tsx) | `/api/shadowban/` | ../services/authenticatedFetch |
| /video-library | [VideoLibraryPage](../../src/ui/pages/VideoLibraryPage.tsx) | `/api/videolibrary`; `/api/videolibrary/${editRecord.id}`; `/api/videolibrary/${id}`; `/api/videolibrary/${id}/status`; `/api/videolibrary/search?q=${encodeURIComponent(searchQ)}&limit=100`; `/api/videolibrary/stats`; `/api/videolibrary/tags`; `/api/videolibrary?category=${filterCategory}&limit=100`; `/api/videolibrary?limit=100`; `/api/videolibrary?platform=${filterPlatform}&limit=100`; `/api/videolibrary?status=${filterStatus}&limit=100` | ../services/apiClient |
| /schedule-manager | [SchedulePersistPage](../../src/ui/pages/SchedulePersistPage.tsx) | `/api/schedule`; `/api/schedule/${id}`; `/api/schedule/${id}/run`; `/api/schedule/${id}/status`; `/api/schedule/best-times?platform=${form.platforms[0]}&category=${form.categories[0] \|\| `; `/api/schedule/stats`; `/api/schedule?limit=100` | ../services/authenticatedFetch |
| /image-filters | [ImageFilterPage](../../src/ui/pages/ImageFilterPage.tsx) | `/api/image/filters`; `/api/image/filters/css`; `/api/image/filters/preview`; `/api/image/filters/preview/file/${previewFileName}`; `/api/image/filters?platform=${filterPlatform}` | ../services/authenticatedFetch |
| /auto-mode | [AutoModePage](../../src/ui/pages/AutoModePage.tsx) | `/api/pipeline/jobs?limit=10`; `/api/pipeline/run`; `/api/pipeline/stats` | ../services/authenticatedFetch |
| /compare | [PipelineComparePage](../../src/ui/pages/PipelineComparePage.tsx) | `/api/pipeline/compare`; `/api/pipeline/comparisons/${runId}`; `/api/pipeline/comparisons?limit=5` | ../services/authenticatedFetch |
| /engines-dashboard | [EnginesDashboard](../../src/ui/pages/EnginesDashboard.tsx) | `/api/system-engines/auth/register`; `/api/system-engines/auth/tenants` |  |
| /profiles | [ProfilesPage](../../src/ui/pages/ProfilesPage.tsx) | `/api/oauth/${provider}/connect`; `/api/profiles`; `/api/profiles/${accountProfile}/accounts`; `/api/profiles/${id}`; `/api/profiles/${profileId}/accounts/${accountId}`; `/api/profiles/resolve` | ../services/apiClient |
| /connectors | [ConnectorsPage](../../src/ui/pages/ConnectorsPage.tsx) | `/api/connectors`; `/api/connectors/${connector.id}`; `/api/connectors/${connectorId}/destinations`; `/api/connectors/${selected.id}/destinations`; `/api/connectors/${selected.id}/destinations/${destination.id}/verify`; `/api/connectors/${selected.id}/secret` | ../services/authenticatedJson |
| /releases | [ReleasesPage](../../src/ui/pages/ReleasesPage.tsx) | `/api/connectors`; `/api/connectors/${selectedConnectorId}/destinations`; `/api/content-versions`; `/api/releases`; `/api/releases/${release.id}`; `/api/releases/${selected.id}/approve`; `/api/releases/${selected.id}/queue`; `/api/releases/${selected.id}/targets` | ../services/authenticatedJson |
| /oauth/success | [OAuthSuccessPage](../../src/ui/pages/OAuthSuccessPage.tsx) | Indirect / none literal |  |

## Runtime feature classifications

| Family | Current classification | Main limitation |
|---|---|---|
| REST/MCP creation, TTS, captions, Remotion short/long render | Implemented; unit tested in parts | Ownership propagation and media delivery failures; no full render performed here |
| RSS/topics/hooks/script translation | Implemented, external-service dependent | Feed SSRF boundary and prompt/data trust need focused acceptance; no live source proof in this audit |
| BullMQ rendering/publishing | Connected to runtime | Cached store conflicts, crash windows, shutdown and polling limits |
| Ingest/planning workers | Source exists | Not instantiated by index.ts |
| Content versions/releases/connectors | Connected file-backed workflow | Artifact binding, immutability, parent status, provider breadth |
| Telegram | Strongest tested adapter in current suite | No native scheduling, ambiguous provider completion window |
| YouTube | Adapter with refresh/provider scheduling | No current owner-token/live acceptance |
| Instagram/Facebook/LinkedIn/X | Adapter code exists | Inconsistent results, scheduling, refresh and media-success semantics |
| AI scoring/training/quality/emotion/attention | Heuristics/directives | No measured model-quality or rendered-output guarantee |
| Image cards/carousels/filters | SVG and optional canvas implementation | Canvas absent; artifact serving and UI/auth need browser acceptance |
| Approval queue and scheduler source automation | Review-oriented drafts | Separate approval instances/cache; no universal release gate |
| Persistent schedule runner | Partial generation | Outputs discarded/early success; ownership omission |
| Analytics/A-B/quota/cost/strategy | UI and service implementations | Scope, measurement source, concurrency and entitlement completeness vary |
| Teams/billing/integration toggles | Log-backed UI actions | Not full invitations/billing/provider lifecycle |
| Branding/hooks/knowledge/recycle/shadowban | Functional service surfaces | Residual tenant isolation defects |
| Webhooks | Outbound notification implementation | SSRF/owner mutation/plaintext credentials/test fan-out |
| Enhanced memory/feedback/agent/beat-sync/fallback | Implemented source, disconnected runtime seams | Integration guide is not active wiring |
| PostgreSQL/MinIO | SQL and gated tooling foundations | Missing packages/adapters/services; no durable cutover |
| Backup/restore | Local file-backed archive tooling | Queue/host-loss recovery not proven here |
