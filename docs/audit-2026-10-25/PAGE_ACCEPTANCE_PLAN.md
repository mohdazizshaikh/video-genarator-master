# All-page acceptance plan

All rows start as `planned`. Each page also requires anonymous/role/foreign-tenant denial as applicable, session expiry and A→B session switching, loading/empty/validation/error/success states, actual browser interactions, and usable keyboard flow. Provider side effects are mocked in the default suite; live evidence is separately recorded. A static render test alone cannot verify a row.

| Route | Page | Phase | Required journey | Status | Evidence |
|---|---|---|---|---|---|
| `/` | VideoList | P7 | List owned videos; open details; delete owned video; deny foreign IDs | planned | — |
| `/create` | VideoCreator | P7 | Load sources/options; generate/edit script; submit render; observe persisted owned output | planned | — |
| `/video/:videoId` | VideoDetails | P7 | Poll progress; play/seek/download; handle failure/expiry; deny foreign media | planned | — |
| `/queue` | BulkQueue | P7 | Submit bounded batch; tenant-safe dedupe; observe progress/failure/recovery | planned | — |
| `/mappings` | CategoryMapping | P7 | Create/update/delete owner-scoped category/platform destination mapping; validate verified destination | planned | — |
| `/publish` | PublishDashboard | P7 | Select owned artifact and verified destination; enforce approval; schedule/publish; show actual result | planned | — |
| `/analytics` | AnalyticsDashboard | P8 | Ingest known events; verify filters/chart totals; isolate tenant; show missing/delayed data accurately | planned | — |
| `/scheduler` | SchedulerDashboard | P7 | Create cron/one-shot job; validate timezone; inspect occurrence/output; cancel/reschedule/recover | planned | — |
| `/ab-testing` | ABTestingDashboard | P8 | Create/assign variants; record exposure/outcome; inspect valid result; pause/finish with persisted state | planned | — |
| `/ai` | AIDashboard | P8 | Read actual model/heuristic state; train/evaluate on owned data; display provenance and bounded jobs | planned | — |
| `/health` | HealthDashboard | P7 | Observe readiness/registered-worker changes and bounded dependency failures; isolate tenant/admin metrics | planned | — |
| `/tenants` | TenantConsole | P8 | Sign up/login; change workspace settings; invite/revoke members; manage allowed roles, keys, subscriptions and audit | planned | — |
| `/content-tools` | ContentTools | P8 | Run ideation/script/moderation/accessibility tools; save changes into owned content version; show real errors | planned | — |
| `/trends` | TrendDashboard | P8 | Fetch controlled source data; refresh/fallback honestly; generate tenant-owned brief/version | planned | — |
| `/hooks` | HookLibrary | P8 | Browse immutable built-ins; create/delete own hooks; generate/track scoped usage | planned | — |
| `/image-generator` | ImageGenerator | P8 | Generate each supported card/poster/thumbnail mode; persist artifact; authenticated preview/download | planned | — |
| `/recycle` | RecycleDashboard | P8 | Inspect scoped candidates; update performance; create reviewed recycle version; avoid cross-tenant dedupe | planned | — |
| `/costs` | CostTracker | P8 | Reconcile known usage costs; enforce owner; inspect spend alerts; reject forged tenant attribution | planned | — |
| `/strategy` | StrategyDashboard | P8 | Inspect scoped buckets/platform strategy; save recommendations; carry selected strategy into content | planned | — |
| `/webhooks` | WebhookDashboard | P7 | Create/update masked hook; send one targeted mocked test; toggle/delete; show scoped redacted logs | planned | — |
| `/branding` | BrandingDashboard | P7 | Read/edit/reset own branding and preview; reject foreign tenant and invalid CSS/color fields | planned | — |
| `/humanized` | HumanizedContentPage | P8 | Generate/edit humanized script or directives; save version; verify selected runtime effects | planned | — |
| `/thumbnail` | ThumbnailPage | P8 | Generate configured thumbnail artifact; inspect contrast/layout; select it for approved release | planned | — |
| `/editing` | EditingPage | P8 | Generate plan; apply supported edits to media; inspect rendered before/after and unsupported suggestions | planned | — |
| `/visual` | VisualEnhancementPage | P8 | Configure supported enhancement; render output; compare frames/properties; persist provenance | planned | — |
| `/audio` | AudioQualityPage | P8 | Measure real levels; apply chain; verify output audio and degraded errors | planned | — |
| `/emotional` | EmotionalResonancePage | P8 | Score declared script inputs; return explainable directives; verify supported applied effects | planned | — |
| `/attention` | AttentionOptimizerPage | P8 | Produce labelled retention plan; apply supported pacing changes; inspect actual output | planned | — |
| `/quality` | QualityScoringPage | P8 | Score actual media/script inputs; expose measurement basis; persist issues/recommendations | planned | — |
| `/engagement` | EngagementPredictionPage | P8 | Predict with declared data/model basis; show confidence limits; record later outcomes for evaluation | planned | — |
| `/account` | AccountManagerPage | P8 | Read owned account metrics/goals; persist updates; prohibit foreign account actions | planned | — |
| `/translate` | TranslatePage | P7 | Translate single/batch text; isolate equal-prefix inputs; show true degraded/unavailable state | planned | — |
| `/comment-cta` | CommentCtaPage | P8 | Generate/select platform CTA; save it in a content version; verify caption/comment capability handling | planned | — |
| `/series` | SeriesBuilderPage | P8 | Create owned series; edit next episode; generate reviewed version; preserve episode relations | planned | — |
| `/watermark` | WatermarkPage | P8 | Configure owned defaults; apply watermark; compare exported frames; validate escaped text/path inputs | planned | — |
| `/shadowban` | ShadowbanPage | P8 | Record owned account metrics; show heuristic diagnosis/evidence limits; inspect recovery actions | planned | — |
| `/video-library` | VideoLibraryPage | P7 | Search/filter/update owned canonical media; reconcile render/release relations; deny foreign updates | planned | — |
| `/schedule-manager` | SchedulePersistPage | P7 | Create multi-target schedule; persist recurrence/jitter; defer unavailable engine; link actual outputs | planned | — |
| `/image-filters` | ImageFilterPage | P8 | Preview/apply preset; verify actual changed output artifact; reject foreign input; authenticated download | planned | — |
| `/auto-mode` | AutoModePage | P8 | Generate grounded versions; show real engine provenance; submit review; render/release through unified path | planned | — |
| `/compare` | PipelineComparePage | P8 | Compare platforms with labelled score basis; observe progress/failure; choose variant and create reviewed content | planned | — |
| `/engines-dashboard` | EnginesDashboard | P8 | Show measured capability/permission state; exercise supported engine outputs; protect admin controls | planned | — |
| `/profiles` | ProfilesPage | P7 | Create/update owned profile; connect account; resolve matching destinations; revoke; deny foreign account | planned | — |
| `/connectors` | ConnectorsPage | P7 | Create connector; store masked secret; verify destination; refresh/revoke; show permission failures | planned | — |
| `/releases` | ReleasesPage | P7 | Create/approve immutable release; add targets; queue due publication; show aggregate status and reconcile/recover | planned | — |
| `/oauth/success` | OAuthSuccessPage | P7 | Handle verified callback success/cancellation/expired state and re-authentication without secret leakage | planned | — |

For rendered-media features, run representative real short/long and portrait/landscape exports with subtitles, narration, music and category templates; inspect exported media as well as browser controls. For analytics/cost/model screens, seed known measured events and reconcile the displayed values to those events.
