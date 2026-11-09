# Codebase Index (auto-generated)

> For commit: `720a119` · 353 source files · 315 API endpoints · 46 pages · 29 stores

## Files

| File | Type | Responsibility | Exports |
|------|------|----------------|---------|
| `src/agents/agent-loop.service.ts` | module | Agent Loop Service - Lightweight orchestration for self-improving pipeline Coordinates feedback, retries, and memory wit | AgentLoopConfig, AgentLoopService, AgentResult, GenerationAttempt |
| `src/aggregator/ReportMerger.ts` | module | - | ReportMerger, ScriptPlan, ScriptScene |
| `src/assets/asset.service.ts` | module | Asset Service - Multi-source fallback for video assets Gracefully falls back when primary source (Pexels) fails | AssetService, AssetSource, FallbackAsset |
| `src/components/root/Root.tsx` | module | - | RemotionRoot, calculateMetadata |
| `src/components/root/index.ts` | module | - | - |
| `src/components/types.ts` | module | - | AvailableComponentsEnum, OrientationConfig |
| `src/components/utils.ts` | module | Check if we need to start a new page due to time gap | calculateVolume, createCaptionPages, getOrientationConfig, shortVideoSchema |
| `src/components/videos/AdvancedKnowledgeOverlay.tsx` | module | Advanced knowledge overlay for trends, technology, gyan, quotes, and motivation. Flexible enough for facts, explainers,  | AdvancedKnowledgeOverlay |
| `src/components/videos/CategoryOverlay.tsx` | module | Generic category-aware overlay for non-news, non-marketing content. It intentionally avoids ticker bars, breaking labels | CategoryOverlay |
| `src/components/videos/CategoryPipelineProfiles.ts` | module | Canonical category pipeline profiles. This is the contract between classification, media search, rendering, and QA. News | CATEGORY_PIPELINE_PROFILES, CanonicalCategory, CaptionCase, CategoryOverlayMode, CategoryPipelineProfile, normalizePipelineCategory, resolveCategoryPipeline |
| `src/components/videos/ContentTemplateEngine.ts` | engine | ContentTemplateEngine – content-driven layout/structure templates. Pairs with ThemeEngine (which picks the "look": palet | ChromeAnchor, ContentStructure, ContentTemplate, TemplateChromeKind, TemplateScene, listContentTemplates, pickTemplateChrome, resolveContentTemplate |
| `src/components/videos/ITProductShowcaseOverlay.tsx` | module | IT Product & Services Showcase overlay. Product-led composition for software, SaaS, websites, automation, AI, cloud, cyb | ITProductShowcaseOverlay |
| `src/components/videos/LandscapeVideo.tsx` | module | - | LandscapeVideo |
| `src/components/videos/LongFormVideo.tsx` | module | LongFormVideo – Phase 3.2 Remotion component for 16:9 landscape long-form video (YouTube standard). Supports chapters de | LongFormVideo |
| `src/components/videos/MarketingOverlay.tsx` | module | Marketing treatment: calm brand storytelling, not a newsroom overlay. Use warm accent rules, restrained metadata, and a  | MarketingOverlay |
| `src/components/videos/NewsOverlay.tsx` | module | - | NewsOverlay |
| `src/components/videos/PortraitVideo.tsx` | module | - | PortraitVideo |
| `src/components/videos/SportsOverlay.tsx` | module | Advanced sports overlay for cricket, football, basketball, and other sports. It presents event context and scores only w | SportsOverlay |
| `src/components/videos/TemplateChrome.tsx` | module | Intro flash: full-frame accent flash for ~16 frames on scene 0. | TemplateChrome |
| `src/components/videos/Test.tsx` | module | - | TestVideo |
| `src/components/videos/ThemeEngine.ts` | engine | ThemeEngine – genre-aware visual + audio theming for rendered videos. Maps a content category (plus optional per-scene s | TemplateVariantName, VideoTheme, pickTemplateVariant, resolveTheme, stableHash |
| `src/components/videos/fontStacks.ts` | module | - | videoUiFontFamily |
| `src/config.ts` | config | Legacy compatibility only; production connector publishing must keep this false. | Config, KOKORO_MODEL, isDevMode, logger |
| `src/config/categories.ts` | config | - | CONTENT_CATEGORIES, ContentCategory, SOURCE_CATEGORIES, isContentCategory, normalizeCategory |
| `src/config/channelRules.ts` | config | - | defaultCategoryRules, getCategoryRule |
| `src/config/featureFlags.ts` | config | Feature Flags - Control experimental features safely All new features are behind flags to maintain backward compatibilit | DEFAULT_FEATURE_FLAGS, FeatureFlags, SAFE_PRODUCTION_FLAGS, getFeatureFlags |
| `src/config/languageSupport.ts` | config | - | SupportedLanguageOption, defaultVoiceForLanguage, labelForLanguage, supportedCreateLanguages, supportedLanguageCodes, toSpeechSynthesisLocale |
| `src/config/validate.ts` | config | Environment Variables Validation Call validateEnvironment() early in startup to: 1. Catch missing required vars before t | runEnvironmentValidation, validateEnvironment |
| `src/db/ABVariantStore.ts` | db | - | ABVariantRecord, ABVariantStore |
| `src/db/AiLearningStore.ts` | db | A legacy single model is deliberately quarantined and never returned to a tenant. | AiLearningStore, LearningEvent, LearningModelState, LearningOutcome |
| `src/db/AnalyticsStore.ts` | db | Auth-derived owner. Legacy analytics without this field are not tenant-visible. | AnalyticsRecord, AnalyticsStore |
| `src/db/ArtifactManifestStore.ts` | db | - | ArtifactKind, ArtifactLifecycle, ArtifactManifest, ArtifactManifestStore |
| `src/db/AudienceStore.ts` | db | - | AudienceStore, AudienceTargetRecord |
| `src/db/ChannelConfigStore.ts` | db | Auth-derived owner. Legacy records without this field are not tenant-visible. | ChannelConfigRecord, ChannelConfigStore |
| `src/db/ConnectorSecretStore.ts` | db | Encrypted connector secret storage. Metadata and secrets are deliberately separate. The secret file contains only encryp | ConnectorSecretStore |
| `src/db/ConnectorStore.ts` | db | Workspace-owned connector metadata store. This is the file-backed compatibility implementation of the target connector c | ConnectorDestinationRecord, ConnectorRecord, ConnectorStore |
| `src/db/ContentAutomationRuleStore.ts` | db | - | AutomationVideoType, ContentAutomationRule, ContentAutomationRuleStore |
| `src/db/ContentVersionStore.ts` | db | - | ContentVersionRecord, ContentVersionStatus, ContentVersionStore |
| `src/db/CustomNewsSourceStore.ts` | db | Workspace owner; legacy records without this field are hidden from scoped reads. | CustomNewsSourceRecord, CustomNewsSourceStore |
| `src/db/DualWriteReadVerify.ts` | db | Writes the file-backed authority first, then writes the durable shadow. The durable result is never promoted to a primar | DualWritePorts, DualWriteResult, ReadVerifyResult, compareReadModels, shadowWriteAndReadVerify |
| `src/db/JobEventOutboxStore.ts` | db | - | JobEventOutboxStore, OutboxEvent, OutboxState |
| `src/db/JobEventStore.ts` | db | - | JobEvent, JobEventStore |
| `src/db/MigrationCheckpointStore.ts` | db | - | MigrationCheckpoint, MigrationCheckpointStore |
| `src/db/PipelineStore.ts` | db | Auth-derived owner. Legacy variations without this field are not tenant-visible. | AIScores, ComparisonRun, GeneratedVariation, PipelineJob, PipelineStatus, PipelineStore, PlatformComparisonEntry |
| `src/db/ProfileAccountStore.ts` | db | - | ProfileAccountStore |
| `src/db/ProfileStore.ts` | db | - | ProfileStore |
| `src/db/PublishJobStore.ts` | db | Idempotency check: same render output + platform + channel | PublishJobStore |
| `src/db/ReleaseControlStore.ts` | db | - | ReleaseControlStore, ReleaseRecord, ReleaseState |
| `src/db/ReleaseStore.ts` | db | Workspace-owned release metadata store. A release is immutable with respect to its content version and destination ident | ReleaseRecord, ReleaseStore, ReleaseTargetRecord |
| `src/db/RenderJobStore.ts` | db | Find existing job with same idempotency key | RenderJobStore |
| `src/db/ReportStore.ts` | db | Auth-derived owner. Legacy reports without this field are not tenant-visible. | ReportRecord, ReportStatus, ReportStore |
| `src/db/ScheduleStore.ts` | db | Auth-derived owner. Legacy schedules without this field are not tenant-visible. | ScheduleRecord, ScheduleStore |
| `src/db/ScriptPlanStore.ts` | db | Auth-derived owner. Legacy plans without this field are not tenant-visible. | ScriptPlanItem, ScriptPlanStore |
| `src/db/TenantStore.ts` | db | Return a tenant only when the requested resource belongs to the auth tenant. | TenantRecord, TenantStore, TenantTier |
| `src/db/TenantUsageStore.ts` | db | - | TenantUsageStore, UsageRecord |
| `src/db/VideoLibraryStore.ts` | db | Auth-derived owner. Legacy records without this field are not tenant-visible. | VideoLibraryStore, VideoRecord |
| `src/db/VideoMetadataStore.ts` | db | - | VideoMetadataStore |
| `src/enhanced-types.ts` | module | Enhanced Features Types & Interfaces Import from here for full TypeScript support with new services | ALL_FEATURES, AgentLoopConfig, AgentResult, AssetSource, AssetSourceType, AssetStats, BeatSyncConfig, EXPERIMENTAL_FEATURES, EngagementPrediction, EnhancedFeature, EnhancedPlatform, EnhancedRecommendation, EnhancedServicesRegistry, EnhancedStyle, FallbackAsset, FeatureFlag, FeedbackContext, GenerationAttempt, GenerationContext, HookOption, IssueSeverity, IssueType, MemoryStats, PLATFORMS, PatternQuery, PlatformLimits, PlatformMetadata, PlatformType, REQUIRES_FEEDBACK, REQUIRES_MEMORY, SAFE_PRODUCTION_FEATURES, STYLES, ScriptQualityIssue, StoredPattern, StoredPatternStyle, SyncStats, SyncedScene, ViabilityAssessment, ViabilityRecommendation |
| `src/feedback/feedback.service.ts` | module | Feedback Service - Improve scripts based on scoring feedback Enables self-improving script generation within retry budge | FeedbackContext, FeedbackService, ScriptQualityIssue |
| `src/index.ts` | module | Create a deferred ShortCreator that resolves once all heavy libs are ready. | - |
| `src/logger.ts` | module | - | - |
| `src/memory/memory.service.ts` | module | Memory Service - Store and retrieve high-performing script patterns Enables the system to learn from successful content | MemoryService, PatternQuery, StoredPattern |
| `src/metadata/metadata.service.ts` | module | Metadata Service - Generate platform-specific metadata Creates titles, descriptions, and hashtags optimized per platform | MetadataService, PlatformLimits, PlatformMetadata, PlatformType |
| `src/news-fetcher/RssFetcher.ts` | module | - | NEWS_SOURCES, NewsSourceDefinition, NewsStory, RssFetcher |
| `src/predict/predict.service.ts` | module | Predictive Scoring Service - Assess topic viability before generation Uses past patterns and keywords to predict engagem | PredictiveService, ViabilityAssessment |
| `src/publishers/FacebookPublisher.ts` | publisher | FacebookPublisher – Full Facebook Graph API implementation Supports Reels, regular video posts, scheduled publishing, an | FacebookPublisher |
| `src/publishers/InstagramPublisher.ts` | publisher | InstagramPublisher – Full Instagram Graph API implementation Supports Reels, Stories, Carousels, scheduled posts, and fi | InstagramPublisher |
| `src/publishers/LinkedInPublisher.ts` | publisher | - | LinkedInPublisher |
| `src/publishers/PlatformLimits.ts` | publisher | - | enforcePlatformMetadataLimits, getPlatformLimits, validatePublishPayload |
| `src/publishers/PlatformPublisher.ts` | publisher | PlatformPublisher – Enhanced interface with all advanced fields | PlatformCapabilities, PlatformLimits, PlatformPublisher, PublishParams, PublishResult |
| `src/publishers/PublisherFactory.ts` | publisher | PublisherFactory – Phase 5.2 Instantiates the right PlatformPublisher implementation for a given platform. | createPublisher, createPublisherForAccount |
| `src/publishers/TelegramPublisher.ts` | publisher | TelegramPublisher – Phase 5.4 Sends videos to a Telegram channel via Bot API sendVideo. No OAuth needed – just BOT_TOKEN | TelegramPublisher |
| `src/publishers/XTwitterPublisher.ts` | publisher | - | XTwitterPublisher |
| `src/publishers/YouTubePublisher.ts` | publisher | YouTubePublisher – Phase 5.3 Uploads videos to YouTube using the Data API v3 via googleapis. OAuth2: refresh token flow  | YouTubePublisher |
| `src/script-generator/AiLlmGenerator.ts` | module | Roughly 8-10 seconds of narration per scene for a 25-30 word scene. | AiLlmGenerator, AutoScriptStyle, HookOption, LlmProviderOptions, ScriptGenerationOptions, configureLlmDefaults |
| `src/scripts/fetchReports.ts` | module | run immediately once | fetchReports |
| `src/scripts/install.ts` | module | runs in docker | install |
| `src/scripts/normalizeMusic.ts` | module | - | normalizeMusic |
| `src/server/auth.ts` | server | Fail-closed admin guard. Requires the X-Admin-Key header to match ADMIN_API_KEY. If the server has no ADMIN_API_KEY conf | AuthClaims, adminKeyConfigured, getAuthenticatedTenantId, isAdminRequest, logAdminKeyStatus, requireAdminKey, requireAuth, validateTokenIfPresent |
| `src/server/rateLimit.ts` | server | - | apiRateLimiter |
| `src/server/readiness.ts` | server | Shared readiness state so health checks can report the true status of the heavy video pipeline (ShortCreator) which init | readiness |
| `src/server/routers/abtesting.ts` | router | - | ABTestingRouter |
| `src/server/routers/account.ts` | router | - | AccountRouter |
| `src/server/routers/ai.ts` | router | eslint-disable-next-line @typescript-eslint/no-unused-vars | AiRouter |
| `src/server/routers/approval.ts` | router | Approval queue | ApprovalRouter |
| `src/server/routers/attention.ts` | router | - | AttentionRouter |
| `src/server/routers/audio.ts` | router | - | AudioRouter |
| `src/server/routers/branding.ts` | router | GET /api/branding/:tenantId — get branding config | BrandingRouter |
| `src/server/routers/channelconfigs.ts` | router | - | ChannelConfigRouter |
| `src/server/routers/competitor.ts` | router | - | CompetitorRouter |
| `src/server/routers/connectors.ts` | router | Workspace-owned connector metadata routes. This compatibility API deliberately accepts credential references only. It do | ConnectorsRouter |
| `src/server/routers/content.ts` | router | eslint-disable-next-line @typescript-eslint/no-require-imports | ContentRouter |
| `src/server/routers/contentbuckets.ts` | router | - | ContentBucketsRouter |
| `src/server/routers/contentversions.ts` | router | - | ContentVersionsRouter |
| `src/server/routers/costs.ts` | router | - | CostsRouter |
| `src/server/routers/editing.ts` | router | - | EditingRouter |
| `src/server/routers/emotional.ts` | router | - | EmotionalRouter |
| `src/server/routers/engagement.ts` | router | - | EngagementRouter |
| `src/server/routers/engines.ts` | router | Trend Hijacking | EnginesRouter |
| `src/server/routers/health.ts` | router | HealthRouter – Phase 4.4 GET /api/health – liveness + readiness GET /api/health/queue – BullMQ queue sizes GET /api/metr | HealthRouter |
| `src/server/routers/hooks.ts` | router | - | HooksRouter |
| `src/server/routers/humanized.ts` | router | - | HumanizedRouter |
| `src/server/routers/image.ts` | router | GET /api/image/filters Returns all available filter presets | ImageRouter |
| `src/server/routers/jobevents.ts` | router | - | JobEventsRouter |
| `src/server/routers/marketing.ts` | router | eslint-disable-next-line @typescript-eslint/no-unused-vars | MarketingRouter |
| `src/server/routers/mcp.ts` | router | - | MCPRouter |
| `src/server/routers/pipeline.ts` | router | Run all platforms in parallel — each updates the comparison entry as it completes | PipelineRouter |
| `src/server/routers/profiles.ts` | router | Accounts | OAuthRouter, ProfilesRouter |
| `src/server/routers/publish.ts` | router | PublishRouter – Phase 5.5 POST /api/publish – enqueue a video for publishing GET /api/publish/:id – get publish job stat | PublishRouter |
| `src/server/routers/quality.ts` | router | - | QualityRouter |
| `src/server/routers/queue.ts` | router | eslint-disable-next-line @typescript-eslint/no-require-imports | QueueRouter |
| `src/server/routers/recycle.ts` | router | - | RecycleRouter |
| `src/server/routers/releases.ts` | router | - | ReleasesRouter |
| `src/server/routers/repurpose.ts` | router | RepurposeRouter – long-form video → short clips (OpusClip-style, OSS). POST /api/repurpose { videoPath, clipSeconds?, ma | RepurposeRouter |
| `src/server/routers/rest.ts` | router | Resolve a user-supplied file name safely inside a base directory, | APIRouter |
| `src/server/routers/schedule.ts` | router | ScheduleRouter – Full schedule persistence with cron-like runner GET /api/schedule – list schedules POST /api/schedule – | ScheduleRouter |
| `src/server/routers/shadowban.ts` | router | Shadowban | ShadowbanRouter |
| `src/server/routers/strategy.ts` | router | Platform psychology | StrategyRouter |
| `src/server/routers/systemengines.ts` | router | ─── Resource Engine ─── | SystemEnginesRouter |
| `src/server/routers/tenants.ts` | router | Provider credential updates remain admin-only. | TenantRouter |
| `src/server/routers/thumbnail.ts` | router | - | ThumbnailRouter |
| `src/server/routers/translate.ts` | router | - | TranslateRouter |
| `src/server/routers/trends.ts` | router | - | TrendsRouter |
| `src/server/routers/videolibrary.ts` | router | VideoLibraryRouter – Full CRUD + search + stats for video library GET /api/videolibrary – list videos (with pagination,  | VideoLibraryRouter |
| `src/server/routers/visual.ts` | router | - | VisualRouter |
| `src/server/routers/watermark.ts` | router | - | WatermarkRouter |
| `src/server/routers/webhooks.ts` | router | GET /api/webhooks — list all webhooks | WebhooksRouter |
| `src/server/server.ts` | server | Trust proxies only when explicitly enabled (behind a reverse proxy). | Server |
| `src/server/swagger.ts` | server | OpenAPI 3.0 Specification for AI Viral Content Empire SaaS Platform Served at GET /api/docs (Swagger UI) and GET /api/do | swaggerSpec |
| `src/server/validator.ts` | server | Process the validation errors | ValidationErrorResult, validateCreateShortInput, validateStatusRequest, validateVideoId |
| `src/services/ABTestingEngine.ts` | engine | Newly-created experiments must belong to exactly one workspace. | ABTest, ABTestingEngine, ABVariant, StatResult |
| `src/services/AccountManagerEngine.ts` | engine | - | AccountGoal, AccountManagerEngine, AccountMetrics |
| `src/services/AiMonitoringService.ts` | service | - | AiMonitoringService, MonitoringResult |
| `src/services/AiPredictionService.ts` | service | - | AiPredictionService, AiSuggestion, SuggestionContext |
| `src/services/AiTrainingService.ts` | service | - | AiTrainingService |
| `src/services/AlertingService.ts` | service | - | AlertPayload, AlertingService |
| `src/services/AntiDuplicationEngine.ts` | engine | - | AntiDuplicationEngine, ContentFingerprint, DuplicationCheckResult |
| `src/services/ApprovalEngine.ts` | engine | Workspace ownership is mandatory for all newly-created records. | ApprovalEngine, ApprovalItem, ApprovalStatus, ChecklistItem |
| `src/services/AssetLibraryEngine.ts` | engine | - | Asset, AssetLibraryEngine, AssetSearchQuery, AssetType, ImportResult |
| `src/services/AttentionOptimizerEngine.ts` | engine | - | AttentionOptimization, AttentionOptimizerEngine, AttentionSpan |
| `src/services/AudioQualityEngine.ts` | engine | - | AudioEnhancement, AudioQualityEngine, AudioSettings |
| `src/services/AuthEngine.ts` | engine | - | AuthEngine, AuthResult, AuthToken, Tenant, verifyJwtToken |
| `src/services/BestTimeLearningEngine.ts` | engine | - | BestTimeLearningEngine, BestTimeRecommendation, TimeSlotPerformance |
| `src/services/BrandingEngine.ts` | engine | - | BrandingColors, BrandingConfig, BrandingEngine, BrandingLogo, BrandingTypography |
| `src/services/CaptionEngine.ts` | engine | - | CaptionEngine, CaptionOptions, CaptionResult |
| `src/services/CategoryEngine.ts` | engine | - | CategoryEngine, CategoryResult, ContentCategory |
| `src/services/CommentCtaEngine.ts` | engine | - | CommentCtaEngine, CtaOption, CtaPlacement, CtaPlatform |
| `src/services/CompetitorAnalysisEngine.ts` | engine | - | CompetitorAnalysisEngine, CompetitorRecord, CompetitorStrategy, CreatorProfile, ViralPattern |
| `src/services/ComplianceEngine.ts` | engine | - | ComplianceAction, ComplianceEngine, ComplianceLog, ComplianceReport |
| `src/services/ContentBucketEngine.ts` | engine | - | BucketRecord, BucketType, ContentBucket, ContentBucketEngine |
| `src/services/ContentEngine.ts` | engine | - | ContentEngine, ContentRequest, ScriptOutput |
| `src/services/ContentEnhancementService.ts` | service | - | AccessibilityResult, ContentEnhancementService, EditingOptions, IdeationInput, ModerationResult, PersonalizationInput |
| `src/services/ContentFreshnessEngine.ts` | engine | - | ContentFreshnessEngine, FreshnessCheckResult, FreshnessRecord |
| `src/services/ContentIntelligenceEngine.ts` | engine | - | ContentIntelligenceEngine, IntelligenceBrief, IntelligenceBriefInput |
| `src/services/ContentRecycleEngine.ts` | engine | - | ContentRecycleEngine, RecycleAction, RecycleCandidate |
| `src/services/CostTrackingEngine.ts` | engine | - | CostCategory, CostRecord, CostSummary, CostTrackingEngine |
| `src/services/CreatorKnowledgeBase.ts` | module | - | CreatorKnowledgeBase, KnowledgeRule, RuleCategory, SearchResult |
| `src/services/CredentialRotationEngine.ts` | engine | - | Credential, CredentialRotationEngine, CredentialType, RotationResult, RotationSchedule, RotationStatus |
| `src/services/CryptoService.ts` | service | - | CryptoService |
| `src/services/EmotionalResonanceEngine.ts` | engine | - | EmotionalDirectives, EmotionalResonanceEngine, EmotionalScore, EmotionalTone |
| `src/services/EngagementPredictionEngine.ts` | engine | - | EngagementPrediction, EngagementPredictionEngine |
| `src/services/ErrorRecoveryEngine.ts` | engine | - | ErrorCategory, ErrorEvent, ErrorRecoveryEngine, RecoveryStatus, RecoveryStrategy |
| `src/services/ExpertEditingEngine.ts` | engine | - | EditingDirectives, EditingEffect, EditingTechnique, ExpertEditingEngine |
| `src/services/ExportEngine.ts` | engine | - | ExportEngine, ExportFile, ExportFormat, ExportManifest, RestoreResult |
| `src/services/HashtagLearningEngine.ts` | engine | - | HashtagLearningEngine, HashtagPerformance, HashtagRecommendation |
| `src/services/HookLibraryEngine.ts` | engine | - | Hook, HookEmotion, HookLibraryEngine, HookType |
| `src/services/HumanEditorialEngine.ts` | engine | - | EditorialDecision, EditorialReview, EditorialSource, HumanEditorialEngine, HumanEditorialInput |
| `src/services/HumanMimicryEngine.ts` | engine | - | HumanMimicryEngine, HumanizedSchedule |
| `src/services/HumanizedContentEngine.ts` | engine | - | HumanizationConfig, HumanizedContentEngine, HumanizedOutput |
| `src/services/ImageEngine.ts` | engine | - | BannerOptions, CarouselOptions, CarouselSlide, ImageEngine, ImageRenderResult, ImageTemplate, PosterOptions, QuoteCardOptions |
| `src/services/ImageFiltersEngine.ts` | engine | ImageFiltersEngine – Advanced image filters and processing pipeline Supports 20+ filter types: color grading, cinematic, | CanvasOp, FilterOptions, FilterPreset, FilterResult, FilterType, ImageFiltersEngine |
| `src/services/ImageGenerationEngine.ts` | engine | Auth-derived owner used only for local artifact isolation. | GeneratedImage, ImageGenerationEngine, ImageGenerationOptions, ImageType |
| `src/services/JobLifecycleEventService.ts` | service | - | JobLifecycleEventService |
| `src/services/LlmGenerator.ts` | module | - | LlmConfig, LlmGenerator |
| `src/services/MarketingEngine.ts` | engine | - | BannerVariant, CampaignPlan, MarketingEngine, MockWebsiteData |
| `src/services/MetadataGenerator.ts` | module | - | MetadataGenerator, VideoMetadata |
| `src/services/ModerationEngine.ts` | engine | - | ModerationEngine, ModerationFlag, ModerationResult, ModerationSeverity |
| `src/services/OAuthProvider.ts` | module | Whether a web OAuth flow is implemented for this provider. | OAuthConnectRequest, OAuthExchangeResult, OAuthProviderInfo, buildAuthorizationUrl, defaultCallbackUrl, exchangeOAuthCode, oauthProviderInfo |
| `src/services/PipelineOrchestrator.ts` | module | - | PipelineInput, PipelineOrchestrator, PipelineResult |
| `src/services/PlatformPsychologyEngine.ts` | engine | - | Platform, PlatformProfile, PlatformPsychologyEngine |
| `src/services/ProfileService.ts` | service | Resolve the active accounts that should receive a video of `category` on `platform`. | ProfileService |
| `src/services/QualityScoringEngine.ts` | engine | Deterministic proxy for engagement potential (no randomness). | QualityMetrics, QualityScoringEngine |
| `src/services/RenderMediaToken.ts` | module | - | createRenderMediaToken, renderMediaTokenTtlSeconds, verifyRenderMediaToken |
| `src/services/RepurposeEngine.ts` | engine | Auth-derived owner for generated artifacts. | RepurposeClip, RepurposeEngine, RepurposeOptions |
| `src/services/ResourceEngine.ts` | engine | - | CpuSnapshot, DiskSnapshot, MemorySnapshot, ResourceEngine, ResourceOptimization, ResourcePrediction, ResourceSnapshot |
| `src/services/RuleBasedGenerator.ts` | module | - | RuleBasedGenerator |
| `src/services/ScheduleVideoCompletion.ts` | service | Verifies bound scheduled render evidence and commits completion without enqueueing. | completeScheduledVideo |
| `src/services/SchedulerService.ts` | service | SchedulerService – Phase 6.1 node-cron job that periodically: 1. Fetches new RSS reports 2. Creates ScriptPlan entries 3 | SchedulerService |
| `src/services/SeoOptimizerService.ts` | service | - | SeoOptimizerService |
| `src/services/SeriesBuilderEngine.ts` | engine | - | Episode, Series, SeriesBuilderEngine |
| `src/services/ShadowbanDetectionEngine.ts` | engine | - | PlatformMetrics, RecoveryPlan, ShadowbanDetectionEngine, ShadowbanStatus, WarmupDay |
| `src/services/SkipAnalysisEngine.ts` | engine | - | SkipAnalysis, SkipAnalysisEngine, SkipDataPoint |
| `src/services/TenantLoggerService.ts` | service | - | TenantLoggerService |
| `src/services/TenantQuotaService.ts` | service | - | TenantQuotaService |
| `src/services/ThrottlingEngine.ts` | engine | Fail-closed: on unexpected errors deny access rather than granting it. | QuotaLimits, QuotaUsage, TenantQuota, ThrottleResult, ThrottlingEngine |
| `src/services/ThumbnailEngine.ts` | engine | - | ThumbnailDirectives, ThumbnailEngine, ThumbnailOptions |
| `src/services/TranslationEngine.ts` | engine | - | SupportedLanguage, TranslationEngine, TranslationResult |
| `src/services/TrendEngine.ts` | engine | - | TrendEngine, TrendResult, TrendTopic |
| `src/services/TrendHijackingEngine.ts` | engine | - | TrendFormat, TrendHijackResult, TrendHijackingEngine |
| `src/services/ValidationEngine.ts` | engine | - | ImageValidationInput, MetadataValidationInput, ValidationEngine, ValidationIssue, ValidationResult, VideoValidationInput |
| `src/services/ViralRadarEngine.ts` | engine | - | RadarResult, ViralAlert, ViralRadarEngine |
| `src/services/ViralStrategyService.ts` | service | - | ViralStrategyService |
| `src/services/VisualEnhancementEngine.ts` | engine | - | EnhancementResult, EnhancementSettings, VisualEnhancementEngine |
| `src/services/VoiceEngine.ts` | engine | - | TTSProvider, TTSRequest, TTSResult, VoiceEngine, VoiceGender, VoiceProfile, VoiceSpeed |
| `src/services/WatermarkEngine.ts` | engine | - | WatermarkConfig, WatermarkEngine |
| `src/services/WebhookNotificationEngine.ts` | engine | Workspace owner; legacy records without this field are quarantined. | NotificationEvent, NotificationLog, NotificationPayload, NotificationResult, WebhookChannel, WebhookConfig, WebhookNotificationEngine |
| `src/short-creator/ShortCreator.ts` | module | todo add a semaphore | ShortCreator |
| `src/short-creator/libraries/Chatterbox.ts` | module | Voice -> (language_id, reference clip) mapping for Chatterbox. The reference clip is cloned by Chatterbox to produce the | CHATTERBOX_VOICE_MAP, Chatterbox, shutdownChatterbox |
| `src/short-creator/libraries/EdgeTts.ts` | module | Split scene narration into speakable clauses at sentence and comma boundaries, preserving each clause as its own prosody | EDGE_VOICE_MAP, EdgeTts, buildProsodyChunks, splitClauses |
| `src/short-creator/libraries/FFmpeg.ts` | module | A video with barely any luma change across sampled frames is | FFMpeg |
| `src/short-creator/libraries/Kokoro.ts` | module | - | Kokoro |
| `src/short-creator/libraries/Pexels.ts` | module | - | PexelsAPI |
| `src/short-creator/libraries/Pixabay.ts` | module | - | PixabayAPI, PixabayVideo |
| `src/short-creator/libraries/Remotion.ts` | module | Long-form always uses the LongFormVideo composition (16:9 landscape) | Remotion |
| `src/short-creator/libraries/SubtitleBuilder.ts` | module | SubtitleBuilder – Phase 2.5 Generates subtitle files from Whisper transcription captions. Supports multiple languages, S | SubtitleBuilder, SubtitleOptions, SubtitleResult |
| `src/short-creator/libraries/TtsAdapter.ts` | module | - | TtsAdapter |
| `src/short-creator/libraries/VideoSegmenter.ts` | module | VideoSegmenter – pure, deterministic short-clip scoring logic. Turns a Whisper word-level transcript into candidate clip | ClipWindow, SegmentOptions, scoreWindow, selectTopClips |
| `src/short-creator/libraries/Whisper.ts` | module | Mirror @remotion/install-whisper-cpp getWhisperExecutablePath logic | ErrorWhisper, Whisper |
| `src/short-creator/music.ts` | module | - | MusicManager |
| `src/types/ownership.ts` | types | Canonical ownership vocabulary for the Content Factory. Design contract: - workspaceId is the authenticated tenant bound | ConnectorId, ConnectorPlatform, ConnectorReference, ConnectorStatus, ContentVersionId, DestinationId, DestinationReference, DestinationStatus, ReleaseId, ReleaseStatus, ReleaseTargetReference, WorkspaceId, WorkspaceOwnedReference, requireNonEmptyOwnershipId |
| `src/types/profiles.ts` | types | Auth-derived owner. Legacy records without this field are not tenant-visible. | ProfileAccountCredentials, ProfileAccountRecord, ProfileAccountStatus, ProfileAccountSummary, ProfileRecord, ProfileSummary |
| `src/types/shorts.ts` | types | Auth-derived owner. Legacy records without this field are not tenant-visible. | Caption, CaptionLine, CaptionPage, CaptionPositionEnum, CategoryRule, ChannelConfig, CreateShortInput, LanguageEnum, LanguageProfile, Music, MusicForVideo, MusicMoodEnum, MusicTag, MusicVolumeEnum, OrientationEnum, PlatformType, PublishAttemptRecord, PublishJobRecord, PublishJobStatus, RenderConfig, RenderJobRecord, RenderJobStatus, Scene, SceneInput, StatusRequest, TextModeEnum, Video, VideoMetadataRecord, VideoStatus, VideoType, VideoTypeEnum, VoiceEnum, Voices, createShortInput, kokoroModelPrecision, renderConfig, sceneInput, statusRequestSchema, videoIdSchema, whisperModels |
| `src/ui/App.tsx` | ui | - | - |
| `src/ui/components/AuthBootstrap.tsx` | ui | - | - |
| `src/ui/components/ErrorBoundary.tsx` | ui | Error Boundary - React error boundary component for graceful error handling | ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState |
| `src/ui/components/Layout.tsx` | ui | - | - |
| `src/ui/components/ab-testing/ActiveTestsList.tsx` | ui | ActiveTestsList – list all variants for the selected video with live stats | ActiveTestsList |
| `src/ui/components/ab-testing/HistoricalTests.tsx` | ui | HistoricalTests – table of all variants for the current video with full details | HistoricalTests |
| `src/ui/components/ab-testing/ResultsView.tsx` | ui | ResultsView – visual A/B test results comparison with winner highlight | ResultsView |
| `src/ui/components/ab-testing/VariantCreationForm.tsx` | ui | VariantCreationForm – create a new A/B test variant for a video | VariantCreationForm |
| `src/ui/components/ai/ModelComparison.tsx` | ui | - | ModelComparison |
| `src/ui/components/ai/ModelHealthCard.tsx` | ui | - | ModelHealthCard |
| `src/ui/components/ai/PredictionsList.tsx` | ui | - | PredictionsList |
| `src/ui/components/ai/RecommendationsPanel.tsx` | ui | - | RecommendationsPanel |
| `src/ui/components/ai/TrainingHistory.tsx` | ui | - | TrainingHistory |
| `src/ui/components/ai/TrainingJobsList.tsx` | ui | - | TrainingJobsList |
| `src/ui/components/analytics/ContentHeatmap.tsx` | ui | ContentHeatmap Component - Day x Hour grid showing when content performs best | ContentHeatmap |
| `src/ui/components/analytics/DateRangePicker.tsx` | ui | DateRangePicker Component - Select predefined or custom date ranges | DateRangePicker |
| `src/ui/components/analytics/EngagementBreakdown.tsx` | ui | EngagementBreakdown Component - Stacked bars showing likes/shares/comments per platform | EngagementBreakdown |
| `src/ui/components/analytics/KPICards.tsx` | ui | KPICards Component - Key Performance Indicator summary cards | KPICards |
| `src/ui/components/analytics/PlatformComparison.tsx` | ui | PlatformComparison Component - Horizontal bar chart comparing platform metrics | PlatformComparison |
| `src/ui/components/analytics/TimeSeriesChart.tsx` | ui | TimeSeriesChart Component - SVG line chart for views/engagement over time | TimeSeriesChart |
| `src/ui/components/analytics/TopVideosTable.tsx` | ui | TopVideosTable Component - Ranked list of best-performing videos | TopVideosTable |
| `src/ui/components/analytics/TrendAnalysis.tsx` | ui | TrendAnalysis Component - Period-over-period trend indicators and sparklines | TrendAnalysis |
| `src/ui/components/content/AccessibilityChecker.tsx` | ui | - | - |
| `src/ui/components/content/EditingRecommendations.tsx` | ui | - | - |
| `src/ui/components/content/IdeationPanel.tsx` | ui | - | - |
| `src/ui/components/content/ModerationChecker.tsx` | ui | - | - |
| `src/ui/components/content/ScriptImprover.tsx` | ui | - | - |
| `src/ui/components/content/ThumbnailGenerator.tsx` | ui | - | - |
| `src/ui/components/publish/MetadataEditor.tsx` | ui | MetadataEditor Component - Configure metadata per platform | MetadataEditor, MetadataEditorProps |
| `src/ui/components/publish/PlatformSelector.tsx` | ui | PlatformSelector Component - Choose publishing platforms | PlatformSelector, PlatformSelectorProps |
| `src/ui/components/publish/PublishStatusTracker.tsx` | ui | PublishStatusTracker Component - Monitor publishing progress | PublishStatusTracker |
| `src/ui/components/publish/SchedulePicker.tsx` | ui | SchedulePicker Component - Configure publishing schedule | SchedulePicker |
| `src/ui/components/publish/VideoSelector.tsx` | ui | VideoSelector Component - Multi-select videos for publishing | VideoSelector, VideoSelectorProps |
| `src/ui/components/scheduler/CronBuilder.tsx` | ui | CronBuilder – visual cron expression builder with presets + custom editor | CronBuilder, CronBuilderProps |
| `src/ui/components/scheduler/ScheduleCalendar.tsx` | ui | ScheduleCalendar – Weekly calendar grid with drag-to-reschedule Shows all active schedules mapped to their publish times | ScheduleCalendar |
| `src/ui/components/scheduler/ScheduleForm.tsx` | ui | ScheduleForm – form to enqueue a new render job Updated: Added platforms, 30 languages, engine toggles, quality settings | ScheduleForm |
| `src/ui/components/scheduler/ScheduleHistory.tsx` | ui | ScheduleHistory – execution history view with outcome timeline | ScheduleHistory |
| `src/ui/components/scheduler/ScheduledJobsList.tsx` | ui | ScheduledJobsList – table of active/pending render and publish jobs with status chips | ScheduledJobsList |
| `src/ui/components/shared/Button.tsx` | ui | Button Component - Wrapper around MUI Button with variants | Button, ButtonProps |
| `src/ui/components/shared/EmptyState.tsx` | ui | - | EmptyStateProps |
| `src/ui/components/shared/LoadingSpinner.tsx` | ui | LoadingSpinner Component - Reusable loading indicator with overlay option | LoadingSpinner, LoadingSpinnerProps |
| `src/ui/components/shared/Modal.tsx` | ui | Modal Component - Dialog wrapper with consistent styling | Modal, ModalProps |
| `src/ui/components/shared/Table.tsx` | ui | Table Component - Reusable data table with sorting, pagination, and actions | Column, Table, TableProps |
| `src/ui/components/shared/Toast.tsx` | ui | Toast Component - Notification displayer with Snackbar | Toast, ToastProps |
| `src/ui/components/tenant/APIKeys.tsx` | ui | - | - |
| `src/ui/components/tenant/AuditLog.tsx` | ui | - | AuditLogEntry |
| `src/ui/components/tenant/AutomationRules.tsx` | ui | - | - |
| `src/ui/components/tenant/BillingPage.tsx` | ui | - | BillingData |
| `src/ui/components/tenant/Integrations.tsx` | ui | - | IntegrationRecord |
| `src/ui/components/tenant/QuotaUsage.tsx` | ui | - | - |
| `src/ui/components/tenant/SubscriptionManagement.tsx` | ui | - | - |
| `src/ui/components/tenant/TeamMembers.tsx` | ui | - | - |
| `src/ui/components/tenant/WorkspaceSettings.tsx` | ui | - | - |
| `src/ui/components/tenant/WorkspaceSwitcher.tsx` | ui | - | - |
| `src/ui/components/video-creator/AutoScriptPanel.tsx` | ui | - | AutoScriptStyle, NewsSourceOption |
| `src/ui/components/video-creator/SceneEditorList.tsx` | ui | - | SceneFormData |
| `src/ui/components/video-creator/ScenePreviewPanel.tsx` | ui | - | - |
| `src/ui/components/video-creator/VideoConfigPanel.tsx` | ui | - | - |
| `src/ui/hooks/useABTestMutation.ts` | ui | useABTestMutation Hook – create variants and assign them | CreateVariantRequest, useAssignVariant, useCreateVariant |
| `src/ui/hooks/useABTestResults.ts` | ui | useABTestResults Hook – fetch video list + variants for a selected video | ABTestResultsState, ABVariant, VideoEntry, computeCTR, findWinner, useABTestResults |
| `src/ui/hooks/useAIMetrics.ts` | ui | - | AIAlert, AIComparisonMetric, AIMetrics, AIMetricsData, AIRecommendation, LearningEvent, ModelState, MonitoringResult, PredictionRow, SuggestionContext, SuggestionResult, TrainingHistoryPoint, normalizeAIMetricsData, useAIMetrics |
| `src/ui/hooks/useAITraining.ts` | ui | - | executeAISuggestion, executeAITraining, useAITraining |
| `src/ui/hooks/useAnalytics.ts` | ui | useAnalytics Hook - Fetch and manage analytics data | AnalyticsDashboardData, DateRange, KPIsummary, PlatformMetrics, TimeSeriesPoint, VideoAnalytics, useAnalytics |
| `src/ui/hooks/useAutoRefresh.ts` | ui | - | UseAutoRefreshOptions, UseAutoRefreshResult, useAutoRefresh |
| `src/ui/hooks/useContentSuggestions.ts` | ui | ── Response shapes ─────────────────────────────────────────────────────────── | AccessibilityResult, EditingPayload, EditingResult, EditingSuggestion, IdeaItem, IdeationPayload, IdeationResult, ModerationResult, PersonalizePayload, TrendOptimizePayload, TrendOptimizeResult, TrendTag, useAccessibilityMutation, useEditingSuggestionsMutation, useIdeationMutation, useInteractiveMutation, useModerationMutation, usePersonalizeMutation, useTrendOptimizeMutation |
| `src/ui/hooks/useHealthDashboard.ts` | ui | - | HealthDashboardData, QueueCounts, executeHealthDashboardFetch, useHealthDashboard |
| `src/ui/hooks/useMutation.ts` | ui | useMutation Hook - For mutations/side effects with loading and error handling | UseMutationOptions, UseMutationResult, useMutation |
| `src/ui/hooks/usePublish.ts` | ui | usePublish Hook - Custom hook for publishing videos to multiple platforms | PublishRequest, PublishResponse, usePublish |
| `src/ui/hooks/useQuery.ts` | ui | useQuery Hook - For fetching data with caching and error handling | UseQueryOptions, UseQueryResult, useQuery |
| `src/ui/hooks/useScheduledJobs.ts` | ui | useScheduledJobs Hook – fetch queue stats and render/publish job lists | PublishJob, QueueCounts, QueueStats, RenderJob, ScheduledJobsData, UseScheduledJobsReturn, useScheduledJobs |
| `src/ui/hooks/useSchedulerMutation.ts` | ui | useSchedulerMutation Hook – enqueue render jobs and manage queue actions | EnqueueJobRequest, EnqueueJobResponse, useEnqueueJob |
| `src/ui/hooks/useTenantInfo.ts` | ui | - | TenantApiKey, TenantBillingSnapshot, TenantMember, TenantQuotaSnapshot, TenantRecord, useTenantBilling, useTenantDetails, useTenantKeys, useTenantMembers, useTenantQuota, useTenants |
| `src/ui/hooks/useTenantMutation.ts` | ui | - | CreateApiKeyPayload, CreateTenantPayload, InviteMemberPayload, UpdateWorkspacePayload, useCancelSubscriptionMutation, useCreateApiKeyMutation, useCreateTenantMutation, useIntegrationToggleMutation, useInviteMemberMutation, usePlanChangeMutation, useRegenerateApiKeyMutation, useRemoveMemberMutation, useRevokeApiKeyMutation, useUpdateWorkspaceMutation |
| `src/ui/index.tsx` | ui | - | - |
| `src/ui/pages/ABTestingDashboard.tsx` | page | ABTestingDashboard – Phase F4 Create and monitor A/B tests for video titles and thumbnails. | - |
| `src/ui/pages/AIDashboard.tsx` | page | - | - |
| `src/ui/pages/AccountManagerPage.tsx` | page | - | - |
| `src/ui/pages/AnalyticsDashboard.tsx` | page | AnalyticsDashboard Page - Video performance analytics and insights | - |
| `src/ui/pages/AttentionOptimizerPage.tsx` | page | - | - |
| `src/ui/pages/AudioQualityPage.tsx` | page | - | - |
| `src/ui/pages/AutoModePage.tsx` | page | - | AutoModePage |
| `src/ui/pages/BrandingDashboard.tsx` | page | - | - |
| `src/ui/pages/BulkQueue.tsx` | page | - | - |
| `src/ui/pages/CategoryMapping.tsx` | page | - | - |
| `src/ui/pages/CommentCtaPage.tsx` | page | - | - |
| `src/ui/pages/ConnectorsPage.tsx` | page | Connectors — workspace-owned provider account management. Backed only by tested server capabilities: GET /api/connectors | - |
| `src/ui/pages/ContentTools.tsx` | page | Old components (kept for backward compatibility) | - |
| `src/ui/pages/CostTracker.tsx` | page | - | CostTracker |
| `src/ui/pages/EditingPage.tsx` | page | - | - |
| `src/ui/pages/EmotionalResonancePage.tsx` | page | - | - |
| `src/ui/pages/EngagementPredictionPage.tsx` | page | - | - |
| `src/ui/pages/EnginesDashboard.tsx` | page | ─── Tab 1: Competitor Analysis ─── | - |
| `src/ui/pages/HealthDashboard.tsx` | page | - | - |
| `src/ui/pages/HookLibrary.tsx` | page | - | HookLibrary |
| `src/ui/pages/HumanizedContentPage.tsx` | page | - | - |
| `src/ui/pages/ImageFilterPage.tsx` | page | ImageFilterPage – Advanced image filters with 20+ presets, live preview, and batch apply | ImageFilterPage |
| `src/ui/pages/ImageGenerator.tsx` | page | - | ImageGenerator |
| `src/ui/pages/OAuthSuccessPage.tsx` | page | - | - |
| `src/ui/pages/PipelineComparePage.tsx` | page | Ignore fetch errors for history update | PipelineComparePage |
| `src/ui/pages/ProfilesPage.tsx` | page | Create profile form | - |
| `src/ui/pages/PublishDashboard.tsx` | page | Publish Dashboard Page - Main publishing interface Allows users to select videos, choose platforms, set metadata, and pu | PlatformMetadata, PublishDashboard, ScheduleConfig, SelectedVideo |
| `src/ui/pages/QualityScoringPage.tsx` | page | - | - |
| `src/ui/pages/RecycleDashboard.tsx` | page | - | RecycleDashboard |
| `src/ui/pages/ReleasesPage.tsx` | page | Releases — approved content versions to verified destinations. Backed only by tested server capabilities: GET /api/conte | - |
| `src/ui/pages/SchedulePersistPage.tsx` | page | SchedulePersistPage – Full schedule management with persistence Create, list, pause/resume, and monitor scheduled publis | SchedulePersistPage |
| `src/ui/pages/SchedulerDashboard.tsx` | page | SchedulerDashboard – Phase F3 Manage automated video creation scheduling, queue health, and job history. | - |
| `src/ui/pages/SeriesBuilderPage.tsx` | page | - | - |
| `src/ui/pages/ShadowbanPage.tsx` | page | - | - |
| `src/ui/pages/StrategyDashboard.tsx` | page | - | StrategyDashboard |
| `src/ui/pages/TenantConsole.tsx` | page | - | - |
| `src/ui/pages/ThumbnailPage.tsx` | page | - | - |
| `src/ui/pages/TranslatePage.tsx` | page | - | - |
| `src/ui/pages/TrendDashboard.tsx` | page | - | TrendDashboard |
| `src/ui/pages/VideoCreator.tsx` | page | - | - |
| `src/ui/pages/VideoDetails.tsx` | page | - | - |
| `src/ui/pages/VideoLibraryPage.tsx` | page | VideoLibraryPage – Full video library management with CRUD, search, filters, stats + analytics | VideoLibraryPage |
| `src/ui/pages/VideoList.tsx` | page | - | - |
| `src/ui/pages/VisualEnhancementPage.tsx` | page | - | - |
| `src/ui/pages/WatermarkPage.tsx` | page | - | - |
| `src/ui/pages/WebhookDashboard.tsx` | page | - | - |
| `src/ui/services/apiClient.ts` | ui | API Client Service Centralized HTTP client for all backend API calls with error handling, caching, and retry logic | ApiError, ApiResponse, api, apiClient |
| `src/ui/services/authenticatedFetch.ts` | ui | Authenticated fetch boundary for protected UI routes. All workspace-owned browser requests should use this helper rather | authenticatedFetch |
| `src/ui/services/authenticatedJson.ts` | ui | Authenticated JSON helper for protected UI routes. Wraps `authenticatedFetch` with consistent JSON parsing and error sur | authenticatedJson, jsonPatch, jsonPost, jsonPut |
| `src/ui/store/authStore.ts` | ui | Auth Store - Zustand state management for authentication | AuthState, AuthUser, useAuthStore |
| `src/ui/store/uiStore.ts` | ui | UI Store - Zustand state management for UI state | Notification, NotificationType, UIState, useNotification, useUIStore |
| `src/video/beat-sync.service.ts` | module | Beat Sync Service - Align video scenes with music beats Adjusts scene durations to create rhythm-matched editing | BeatSyncConfig, BeatSyncService, SyncedScene |
| `src/workers/DeadLetterWorker.ts` | module | DeadLetterWorker – Phase 4.7 Listens on deadletter_queue. Logs permanently failed jobs and marks them in the DB. | DeadLetterPayload, DeadLetterWorker |
| `src/workers/IngestWorker.ts` | module | - | IngestJobPayload, IngestWorker |
| `src/workers/PlanningWorker.ts` | module | - | PlanningJobPayload, PlanningWorker |
| `src/workers/PublishWorker.ts` | module | PublishWorker – Phase 4.1 / 5.1 BullMQ worker that processes publish_queue jobs. Concurrency = 3 (different platforms ca | PublishJobPayload, PublishWorker |
| `src/workers/QueueManager.ts` | module | QueueManager – Phase 4.1 Manages BullMQ queue instances backed by Redis. Falls back gracefully when Redis is unavailable | QUEUE_NAMES, QueueName, closeRedis, createPublishQueue, createQueue, createRenderQueue, getRedisConnection, testRedisConnection |
| `src/workers/RenderWorker.ts` | module | RenderWorker – Phase 4.1 / 4.6 / 4.7 BullMQ worker that processes render_queue jobs. Concurrency = 1 (one render at a ti | RenderJobPayload, RenderWorker |

## API Routes

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
| `GET` | `/api/schedule/:id/outputs/:artifactId` | scheduleRouter |
| `POST` | `/api/schedule/:id/confirm-assets` | scheduleRouter |
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

## UI Pages

| Route | Component | File | API Calls |
|-------|-----------|------|-----------|
| `/` | VideoList | `src/ui/pages/VideoList.tsx` | - |
| `/create` | VideoCreator | `src/ui/pages/VideoCreator.tsx` | `/api/voices` · `/api/music-tags` · `/api/news-sources` · `/api/auto-script/topics` · `/api/auto-script/hooks` · `/api/news-sources/custom` · `/api/auto-script` · `/api/short-video` |
| `/video/:videoId` | VideoDetails | `src/ui/pages/VideoDetails.tsx` | `/api/short-video/:p/status` · `/api/short-video/:p` |
| `/queue` | BulkQueue | `src/ui/pages/BulkQueue.tsx` | `/api/health/queue/states` · `/api/queue/bulk` |
| `/mappings` | CategoryMapping | `src/ui/pages/CategoryMapping.tsx` | - |
| `/publish` | PublishDashboard | `src/ui/pages/PublishDashboard.tsx` | - |
| `/analytics` | AnalyticsDashboard | `src/ui/pages/AnalyticsDashboard.tsx` | - |
| `/scheduler` | SchedulerDashboard | `src/ui/pages/SchedulerDashboard.tsx` | - |
| `/ab-testing` | ABTestingDashboard | `src/ui/pages/ABTestingDashboard.tsx` | - |
| `/ai` | AIDashboard | `src/ui/pages/AIDashboard.tsx` | - |
| `/health` | HealthDashboard | `src/ui/pages/HealthDashboard.tsx` | - |
| `/tenants` | TenantConsole | `src/ui/pages/TenantConsole.tsx` | `/api/tenants/bootstrap` |
| `/content-tools` | ContentTools | `src/ui/pages/ContentTools.tsx` | - |
| `/trends` | TrendDashboard | `src/ui/pages/TrendDashboard.tsx` | `/api/trends` · `/api/trends/viral-radar` · `/api/trends/refresh` |
| `/hooks` | HookLibrary | `src/ui/pages/HookLibrary.tsx` | `/api/hooks` · `/api/hooks/generate` · `/api/hooks/:p` |
| `/image-generator` | ImageGenerator | `src/ui/pages/ImageGenerator.tsx` | `/api/image/:p` · `/api/image/file/:p` |
| `/recycle` | RecycleDashboard | `src/ui/pages/RecycleDashboard.tsx` | `/api/recycle/candidates` · `/api/recycle/stats` · `/api/recycle/:p/recycle` · `/api/recycle/freshness/check` · `/api/recycle/dedupe/check` |
| `/costs` | CostTracker | `src/ui/pages/CostTracker.tsx` | `/api/costs/summary` · `/api/costs/record` |
| `/strategy` | StrategyDashboard | `src/ui/pages/StrategyDashboard.tsx` | `/api/strategy/platforms` · `/api/strategy/buckets` · `/api/strategy/buckets/next` |
| `/webhooks` | WebhookDashboard | `src/ui/pages/WebhookDashboard.tsx` | `/api/webhooks` · `/api/webhooks/stats` · `/api/webhooks/:p` · `/api/webhooks/:p/toggle` · `/api/webhooks/:p/test` |
| `/branding` | BrandingDashboard | `src/ui/pages/BrandingDashboard.tsx` | `/api/branding/:p` · `/api/branding/:p/reset` |
| `/humanized` | HumanizedContentPage | `src/ui/pages/HumanizedContentPage.tsx` | `/api/humanized/humanize` |
| `/thumbnail` | ThumbnailPage | `src/ui/pages/ThumbnailPage.tsx` | `/api/thumbnail/generate` |
| `/editing` | EditingPage | `src/ui/pages/EditingPage.tsx` | `/api/editing/plan` |
| `/visual` | VisualEnhancementPage | `src/ui/pages/VisualEnhancementPage.tsx` | `/api/visual/enhance` |
| `/audio` | AudioQualityPage | `src/ui/pages/AudioQualityPage.tsx` | `/api/audio/process` |
| `/emotional` | EmotionalResonancePage | `src/ui/pages/EmotionalResonancePage.tsx` | `/api/emotional/score` |
| `/attention` | AttentionOptimizerPage | `src/ui/pages/AttentionOptimizerPage.tsx` | `/api/attention/optimize` |
| `/quality` | QualityScoringPage | `src/ui/pages/QualityScoringPage.tsx` | `/api/quality/score` |
| `/engagement` | EngagementPredictionPage | `src/ui/pages/EngagementPredictionPage.tsx` | `/api/engagement/predict` |
| `/account` | AccountManagerPage | `src/ui/pages/AccountManagerPage.tsx` | `/api/account/metrics` · `/api/account/guidance` |
| `/translate` | TranslatePage | `src/ui/pages/TranslatePage.tsx` | `/api/translate/languages` · `/api/translate/` · `/api/translate/batch` |
| `/comment-cta` | CommentCtaPage | `src/ui/pages/CommentCtaPage.tsx` | `/api/strategy/cta/generate` · `/api/strategy/cta?:p` |
| `/series` | SeriesBuilderPage | `src/ui/pages/SeriesBuilderPage.tsx` | `/api/strategy/series` · `/api/strategy/series/:p` |
| `/watermark` | WatermarkPage | `src/ui/pages/WatermarkPage.tsx` | `/api/watermark/filter` · `/api/watermark/default` |
| `/shadowban` | ShadowbanPage | `src/ui/pages/ShadowbanPage.tsx` | `/api/shadowban/` |
| `/video-library` | VideoLibraryPage | `src/ui/pages/VideoLibraryPage.tsx` | `/api/videolibrary/stats` · `/api/videolibrary/tags` · `/api/videolibrary/:p` · `/api/videolibrary` · `/api/videolibrary/:p/status` |
| `/schedule-manager` | SchedulePersistPage | `src/ui/pages/SchedulePersistPage.tsx` | `/api/schedule/stats` · `/api/schedule` · `/api/schedule/:p/status` · `/api/schedule/:p/run` · `/api/schedule/:p` |
| `/image-filters` | ImageFilterPage | `src/ui/pages/ImageFilterPage.tsx` | `/api/image/filters` · `/api/image/filters/css` · `/api/image/filters/preview` · `/api/image/filters/preview/file/:p` |
| `/auto-mode` | AutoModePage | `?` | - |
| `/compare` | PipelineComparePage | `?` | - |
| `/engines-dashboard` | EnginesDashboard | `src/ui/pages/EnginesDashboard.tsx` | `/api/system-engines/auth/tenants` · `/api/system-engines/auth/register` |
| `/profiles` | ProfilesPage | `src/ui/pages/ProfilesPage.tsx` | `/api/profiles` · `/api/profiles/:p` · `/api/profiles/:p/accounts` · `/api/profiles/:p/accounts/:p` · `/api/oauth/:p/connect` · `/api/profiles/resolve` |
| `/connectors` | ConnectorsPage | `src/ui/pages/ConnectorsPage.tsx` | `/api/connectors` · `/api/connectors/:p/destinations` · `/api/connectors/:p` · `/api/connectors/:p/secret` · `/api/connectors/:p/destinations/:p/verify` |
| `/releases` | ReleasesPage | `src/ui/pages/ReleasesPage.tsx` | `/api/content-versions` · `/api/releases` · `/api/connectors` · `/api/releases/:p` · `/api/releases/:p/approve` · `/api/connectors/:p/destinations` · `/api/releases/:p/targets` · `/api/releases/:p/queue` |
| `/oauth/success` | OAuthSuccessPage | `src/ui/pages/OAuthSuccessPage.tsx` | - |

## Data Stores

| File | Class | JSON File | Purpose |
|------|-------|-----------|---------|
| `src/db/ABVariantStore.ts` | ABVariantStore | `abVariants.json` | - |
| `src/db/AiLearningStore.ts` | AiLearningStore | `ai-learning-events.json` | A legacy single model is deliberately quarantined and never returned to a tenant. |
| `src/db/AnalyticsStore.ts` | AnalyticsStore | `analytics.json` | Auth-derived owner. Legacy analytics without this field are not tenant-visible. |
| `src/db/ArtifactManifestStore.ts` | ArtifactManifestStore | `artifact-manifests.json` | - |
| `src/db/AudienceStore.ts` | AudienceStore | `audienceTargets.json` | - |
| `src/db/ChannelConfigStore.ts` | ChannelConfigStore | `channelConfigs.json` | Auth-derived owner. Legacy records without this field are not tenant-visible. |
| `src/db/ConnectorSecretStore.ts` | ConnectorSecretStore | `connector-secrets.json` | Encrypted connector secret storage. Metadata and secrets are deliberately separate. The secret file contains only encryp |
| `src/db/ConnectorStore.ts` | ConnectorStore | `connectors.json` | Workspace-owned connector metadata store. This is the file-backed compatibility implementation of the target connector c |
| `src/db/ContentAutomationRuleStore.ts` | ContentAutomationRuleStore | `contentAutomationRules.json` | - |
| `src/db/ContentVersionStore.ts` | ContentVersionStore | `content-versions.json` | - |
| `src/db/CustomNewsSourceStore.ts` | CustomNewsSourceStore | `customNewsSources.json` | Workspace owner; legacy records without this field are hidden from scoped reads. |
| `src/db/DualWriteReadVerify.ts` | - | `` | Writes the file-backed authority first, then writes the durable shadow. The durable result is never promoted to a primar |
| `src/db/JobEventOutboxStore.ts` | JobEventOutboxStore | `job-event-outbox.json` | - |
| `src/db/JobEventStore.ts` | JobEventStore | `job-events.json` | - |
| `src/db/MigrationCheckpointStore.ts` | MigrationCheckpointStore | `migration-checkpoints.json` | - |
| `src/db/PipelineStore.ts` | PipelineStore | `pipeline-jobs.json` | Auth-derived owner. Legacy variations without this field are not tenant-visible. |
| `src/db/ProfileAccountStore.ts` | ProfileAccountStore | `profileAccounts.json` | - |
| `src/db/ProfileStore.ts` | ProfileStore | `profiles.json` | - |
| `src/db/PublishJobStore.ts` | PublishJobStore | `publishJobs.json` | Idempotency check: same render output + platform + channel |
| `src/db/ReleaseControlStore.ts` | ReleaseControlStore | `release-control.json` | - |
| `src/db/ReleaseStore.ts` | ReleaseStore | `releases.json` | Workspace-owned release metadata store. A release is immutable with respect to its content version and destination ident |
| `src/db/RenderJobStore.ts` | RenderJobStore | `renderJobs.json` | Find existing job with same idempotency key |
| `src/db/ReportStore.ts` | ReportStore | `reports.json` | Auth-derived owner. Legacy reports without this field are not tenant-visible. |
| `src/db/ScheduleStore.ts` | ScheduleStore | `schedules.json` | Auth-derived owner. Legacy schedules without this field are not tenant-visible. |
| `src/db/ScriptPlanStore.ts` | ScriptPlanStore | `scriptPlans.json` | Auth-derived owner. Legacy plans without this field are not tenant-visible. |
| `src/db/TenantStore.ts` | TenantStore | `tenants.json` | Return a tenant only when the requested resource belongs to the auth tenant. |
| `src/db/TenantUsageStore.ts` | TenantUsageStore | `tenantUsage.json` | - |
| `src/db/VideoLibraryStore.ts` | VideoLibraryStore | `videoLibrary.json` | Auth-derived owner. Legacy records without this field are not tenant-visible. |
| `src/db/VideoMetadataStore.ts` | VideoMetadataStore | `videoMetadata.json` | - |
