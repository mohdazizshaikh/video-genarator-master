# API Reference – AI Viral Content Empire v12.0

> **Interactive Docs:** Visit `/api/docs` when the server is running for live Swagger UI.
> **Raw Spec:** `GET /api/docs.json`

## Base URL

```
http://localhost:3123
```

## Rate Limiting

All `/api/*` endpoints are rate-limited to **120 requests per minute** per IP.

Response headers:
- `RateLimit-Limit: 120`
- `RateLimit-Remaining: 119`
- `RateLimit-Reset: 1234567890`

Rate limit exceeded: `HTTP 429 Too Many Requests`

---

<!-- AUTO-GENERATED:api-endpoints:BEGIN -->
Live API surface derived from source (312 routes).

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
| `POST` | `/api/approval/editorial-review` | approvalRouter |
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
| `POST` | `/api/auto-script` | deferredApiRouter |
| `POST` | `/api/auto-script/hooks` | deferredApiRouter |
| `POST` | `/api/auto-script/topics` | deferredApiRouter |
| `POST` | `/api/auto-script/translate` | deferredApiRouter |
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
| `POST` | `/api/marketing/ab/assign/:videoId` | marketingRouter |
| `POST` | `/api/marketing/ab/variants` | marketingRouter |
| `GET` | `/api/marketing/ab/variants/:videoId` | marketingRouter |
| `POST` | `/api/marketing/analytics` | marketingRouter |
| `GET` | `/api/marketing/analytics/:videoId` | marketingRouter |
| `GET` | `/api/marketing/audience` | marketingRouter |
| `POST` | `/api/marketing/audience` | marketingRouter |
| `GET` | `/api/marketing/dashboard` | marketingRouter |
| `POST` | `/api/marketing/seo/optimize` | marketingRouter |
| `GET` | `/api/music-tags` | deferredApiRouter |
| `GET` | `/api/music/:fileName` | deferredApiRouter |
| `GET` | `/api/news-sources` | deferredApiRouter |
| `POST` | `/api/news-sources/custom` | deferredApiRouter |
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
| `POST` | `/api/queue/bulk` | deferredQueueRouter |
| `PATCH` | `/api/recycle/:videoId/metrics` | recycleRouter |
| `POST` | `/api/recycle/:videoId/recycle` | recycleRouter |
| `GET` | `/api/recycle/candidates` | recycleRouter |
| `POST` | `/api/recycle/dedupe/check` | recycleRouter |
| `GET` | `/api/recycle/dedupe/stats` | recycleRouter |
| `POST` | `/api/recycle/freshness/check` | recycleRouter |
| `POST` | `/api/recycle/freshness/record` | recycleRouter |
| `POST` | `/api/recycle/register` | recycleRouter |
| `GET` | `/api/recycle/stats` | recycleRouter |
| `GET` | `/api/reports` | deferredApiRouter |
| `GET` | `/api/reports/:reportId` | deferredApiRouter |
| `POST` | `/api/reports/fetch` | deferredApiRouter |
| `POST` | `/api/reports/merge` | deferredApiRouter |
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
| `GET` | `/api/script-plans` | deferredApiRouter |
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
| `POST` | `/api/short-video` | deferredApiRouter |
| `DELETE` | `/api/short-video/:videoId` | deferredApiRouter |
| `GET` | `/api/short-video/:videoId` | deferredApiRouter |
| `GET` | `/api/short-video/:videoId/metadata` | deferredApiRouter |
| `GET` | `/api/short-video/:videoId/render-path` | deferredApiRouter |
| `GET` | `/api/short-video/:videoId/status` | deferredApiRouter |
| `GET` | `/api/short-videos` | deferredApiRouter |
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
| `GET` | `/api/system/assets` | systemEnginesRouter |
| `POST` | `/api/system/assets` | systemEnginesRouter |
| `DELETE` | `/api/system/assets/:id` | systemEnginesRouter |
| `PATCH` | `/api/system/assets/:id/tags` | systemEnginesRouter |
| `GET` | `/api/system/assets/stats` | systemEnginesRouter |
| `POST` | `/api/system/auth/authenticate` | systemEnginesRouter |
| `POST` | `/api/system/auth/register` | systemEnginesRouter |
| `POST` | `/api/system/auth/rotate/:tenantId` | systemEnginesRouter |
| `GET` | `/api/system/auth/tenants` | systemEnginesRouter |
| `POST` | `/api/system/auth/verify` | systemEnginesRouter |
| `GET` | `/api/system/compliance/critical` | systemEnginesRouter |
| `POST` | `/api/system/compliance/log` | systemEnginesRouter |
| `GET` | `/api/system/compliance/logs` | systemEnginesRouter |
| `POST` | `/api/system/compliance/report` | systemEnginesRouter |
| `POST` | `/api/system/content-buckets/add` | contentBucketsRouter |
| `POST` | `/api/system/content-buckets/detect` | contentBucketsRouter |
| `GET` | `/api/system/content-buckets/next` | contentBucketsRouter |
| `GET` | `/api/system/content-buckets/stats` | contentBucketsRouter |
| `GET` | `/api/system/credentials` | systemEnginesRouter |
| `POST` | `/api/system/credentials` | systemEnginesRouter |
| `POST` | `/api/system/credentials/:id/rotate` | systemEnginesRouter |
| `GET` | `/api/system/credentials/expiring` | systemEnginesRouter |
| `POST` | `/api/system/credentials/schedule` | systemEnginesRouter |
| `GET` | `/api/system/errorrecovery` | systemEnginesRouter |
| `POST` | `/api/system/errorrecovery/:id/dead` | systemEnginesRouter |
| `POST` | `/api/system/errorrecovery/:id/recover` | systemEnginesRouter |
| `POST` | `/api/system/errorrecovery/clear` | systemEnginesRouter |
| `GET` | `/api/system/errorrecovery/deadletter` | systemEnginesRouter |
| `POST` | `/api/system/errorrecovery/process` | systemEnginesRouter |
| `POST` | `/api/system/errorrecovery/record` | systemEnginesRouter |
| `GET` | `/api/system/errorrecovery/stats` | systemEnginesRouter |
| `POST` | `/api/system/export` | systemEnginesRouter |
| `POST` | `/api/system/export/backup` | systemEnginesRouter |
| `GET` | `/api/system/export/list` | systemEnginesRouter |
| `POST` | `/api/system/export/restore` | systemEnginesRouter |
| `GET` | `/api/system/knowledgebase` | systemEnginesRouter |
| `POST` | `/api/system/knowledgebase` | systemEnginesRouter |
| `DELETE` | `/api/system/knowledgebase/:id` | systemEnginesRouter |
| `PATCH` | `/api/system/knowledgebase/:id` | systemEnginesRouter |
| `GET` | `/api/system/knowledgebase/categories` | systemEnginesRouter |
| `GET` | `/api/system/knowledgebase/top` | systemEnginesRouter |
| `POST` | `/api/system/marketing-engine/banners` | systemEnginesRouter |
| `POST` | `/api/system/marketing-engine/campaign` | systemEnginesRouter |
| `POST` | `/api/system/marketing-engine/scrape` | systemEnginesRouter |
| `GET` | `/api/system/resource/history` | systemEnginesRouter |
| `GET` | `/api/system/resource/optimize` | systemEnginesRouter |
| `POST` | `/api/system/resource/predict` | systemEnginesRouter |
| `GET` | `/api/system/resource/snapshot` | systemEnginesRouter |
| `POST` | `/api/system/throttle/check` | systemEnginesRouter |
| `POST` | `/api/system/throttle/plan` | systemEnginesRouter |
| `GET` | `/api/system/throttle/quotas` | systemEnginesRouter |
| `GET` | `/api/system/throttle/quotas/:tenantId` | systemEnginesRouter |
| `POST` | `/api/system/throttle/reset` | systemEnginesRouter |
| `GET` | `/api/tenants` | tenantRouter |
| `POST` | `/api/tenants` | tenantRouter |
| `GET` | `/api/tenants/:tenantId` | tenantRouter |
| `GET` | `/api/tenants/:tenantId/billing` | tenantRouter |
| `POST` | `/api/tenants/:tenantId/engines` | tenantRouter |
| `POST` | `/api/tenants/:tenantId/keys` | tenantRouter |
| `POST` | `/api/tenants/:tenantId/logs/:engine` | tenantRouter |
| `POST` | `/api/tenants/:tenantId/quotas` | tenantRouter |
| `GET` | `/api/thumbnail/curiosity-gap/:topic` | thumbnailRouter |
| `POST` | `/api/thumbnail/generate` | thumbnailRouter |
| `POST` | `/api/thumbnail/validate-contrast` | thumbnailRouter |
| `GET` | `/api/tmp/:tmpFile` | deferredApiRouter |
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
| `GET` | `/api/voices` | deferredApiRouter |
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
| `POST` | `/mcp/messages` | deferredMcpRouter |
| `GET` | `/mcp/sse` | deferredMcpRouter |
<!-- AUTO-GENERATED:api-endpoints:END -->


## Endpoints

### Health

#### `GET /api/health`
System health check.

**Response:**
```json
{
  "status": "ok",
  "version": "12.0.0",
  "uptime": 3600,
  "memory": { "used": 512, "total": 4096 },
  "services": { "redis": "connected", "pexels": "ok" }
}
```

---

### Videos — Core Creation

#### `GET /api/short-videos`
List all render jobs.

**Query params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | all | `pending\|rendering\|done\|failed` |
| `limit` | integer | 50 | Results per page |
| `offset` | integer | 0 | Pagination offset |

#### `POST /api/short-video`
Create and queue a new short video.

**Request body:**
```json
{
  "scenes": [
    {
      "text": "Narration text for this scene",
      "searchTerms": ["technology", "AI", "future"]
    }
  ],
  "music": { "genre": "ambient", "mood": "inspiring" },
  "voice": "af_heart"
}
```

**Response:**
```json
{
  "id": "clx1234abc",
  "status": "pending"
}
```

#### `GET /api/short-video/:id`
Get video details and render status.

#### `DELETE /api/short-video/:id`
Delete a video and its files.

---

### Video Library

#### `GET /api/videolibrary`
List library videos with filtering.

**Query params:** `status`, `platform`, `category`, `limit`, `offset`

#### `POST /api/videolibrary`
Add a video record to the library.

#### `GET /api/videolibrary/stats`
Library statistics breakdown by status, platform, category.

#### `GET /api/videolibrary/tags`
All tags sorted by usage count.

#### `GET /api/videolibrary/search`
Full-text search across title, description, tags.

#### `GET /api/videolibrary/:id`
Get single library record.

#### `PATCH /api/videolibrary/:id`
Update library record fields.

#### `DELETE /api/videolibrary/:id`
Delete library record.

#### `PATCH /api/videolibrary/:id/metrics`
Update engagement metrics.

```json
{ "views": 15000, "likes": 1200, "comments": 89, "shares": 340 }
```

---

### Schedule

#### `GET /api/schedule`
List schedules.

#### `POST /api/schedule`
Create a persistent schedule.

```json
{
  "name": "Daily Tech Content",
  "platforms": ["youtube", "instagram"],
  "categories": ["Technology"],
  "languages": ["en"],
  "cronExpression": "0 9 * * *",
  "engines": {
    "enableHashtagOptimization": true,
    "enableCommentCTA": true,
    "enableViralElements": true
  },
  "quality": {
    "targetLUFS": -14,
    "visualQualityTier": "premium"
  }
}
```

#### `GET /api/schedule/stats`
Schedule statistics (active count, runs today, success rate).

#### `PATCH /api/schedule/:id/status`
Update schedule status.
```json
{ "status": "paused" }
```

#### `POST /api/schedule/:id/run`
Trigger a manual schedule run.

#### `GET /api/schedule/:id`
Get schedule details.

#### `PATCH /api/schedule/:id`
Update schedule settings.

#### `DELETE /api/schedule/:id`
Delete schedule.

---

### Publishing

#### `POST /api/publish`
Publish a video to a platform.

```json
{
  "renderOutputPath": "/path/to/video.mp4",
  "platform": "youtube",
  "channelId": "channel_handle_or_id",
  "accountId": "optional_profile_account_id",
  "title": "My Viral Video",
  "description": "Watch this amazing content!",
  "tags": ["viral", "AI", "tech"],
  "category": "Technology"
}
```

**Optional `accountId`:** when provided, publishes using that profile account's stored (encrypted) credentials instead of the global env credentials.

---

### Client Profiles (Multi-Account)

Manage client profiles and their per-platform accounts. Credentials are encrypted at rest (AES-256-GCM via `TENANT_KEYS_SECRET`). See [`docs/CLIENT_PROFILES.md`](CLIENT_PROFILES.md) for details.

#### `GET /api/profiles`
List all profiles with their account summaries.

#### `POST /api/profiles`
Create a profile.

```json
{
  "name": "TechBrand Client",
  "description": "Technology content for TechBrand",
  "genres": ["Technology", "Science"]
}
```

#### `GET /api/profiles/:id`
Get one profile with its accounts.

#### `PATCH /api/profiles/:id`
Update `name`, `description`, or `genres`.

#### `DELETE /api/profiles/:id`
Delete a profile and all its accounts.

#### `POST /api/profiles/resolve`
Auto-routing: which accounts should receive a video for a category + platform.

```json
{ "category": "Technology", "platform": "youtube" }
```

Response: array of matching `ProfileAccountSummary` objects (active accounts on profiles whose `genres` include the category).

#### `GET /api/profiles/:id/accounts`
List accounts for a profile.

#### `POST /api/profiles/:id/accounts`
Add a platform account manually.

```json
{
  "provider": "telegram",
  "label": "TechBrand Telegram channel",
  "credentials": { "botToken": "...", "channelId": "@techbrand" },
  "displayName": "TechBrand"
}
```

Credential keys per provider: `youtube` → `clientId, clientSecret, refreshToken`; `telegram` → `botToken, channelId`; `instagram` → `accessToken, businessAccountId`; `facebook` → `accessToken, pageId`; `linkedin` → `accessToken, personUrn`; `x` → `bearerToken, apiKey, apiSecret, accessToken, accessSecret`.

#### `DELETE /api/profiles/:id/accounts/:accountId`
Remove an account.

#### `POST /api/profiles/:id/accounts/:accountId/refresh`
Token refresh info (stub; auto-refresh happens on next publish).

#### `POST /api/oauth/:provider/connect`
Start an OAuth connect flow.

```json
{ "profileId": "<profileId>", "redirectUri": "optional_custom_base" }
```

Response: `{ authorizationUrl, state, provider }`. Only YouTube is currently supported (`webOAuthSupported: true`); other providers return a hint to add credentials manually.

#### `GET /api/oauth/:provider/callback`
OAuth provider redirect target. Exchanges the code, creates the account, then redirects the browser to `/oauth/success?status=...`.

---

### Trends

#### `GET /api/trends`
Get trending topics by category.

**Query params:** `category`, `region`, `limit`

#### `GET /api/trends/viral-radar`
Viral radar — top opportunities scored by viral potential.

---

### Image Generation

#### `POST /api/image/generate`
Generate an image using AI.

```json
{
  "type": "quote_card | thumbnail | banner | social",
  "title": "Your text here",
  "category": "Technology",
  "platform": "instagram_square | youtube_thumbnail | linkedin_banner",
  "style": "modern | minimal | bold | cinematic"
}
```

#### `GET /api/image/filters`
List 20 built-in filter presets.

**Query params:** `platform`

#### `POST /api/image/filters/css`
Build CSS filter string from preset.

```json
{
  "filter": "cinema | fade | punch | chrome | ...",
  "intensity": 90,
  "brightness": 90,
  "contrast": 130,
  "saturation": 80
}
```

---

### Content Tools

#### `POST /api/translate`
Translate content to another language.

```json
{
  "text": "Hello world",
  "targetLanguage": "es",
  "sourceLanguage": "en"
}
```

#### `GET /api/recycle/stats`
Get content recycling suggestions from the library.

#### `POST /api/watermark/filter`
Apply watermark to a video.

```json
{
  "videoId": "clx1234abc",
  "watermark": "@YourBrand",
  "position": "bottom-right | bottom-left | top-right | top-left | center"
}
```

#### `POST /api/shadowban/metrics`
Check shadowban risk for hashtags.

```json
{
  "hashtags": ["#trending", "#viral", "#fyp"],
  "platform": "instagram | tiktok"
}
```

---

### AI Engines

#### `POST /api/humanized/humanize`
Humanize AI-generated content.

#### `POST /api/thumbnail/generate`
Generate thumbnail for a video.

#### `POST /api/quality/score`
Score content quality (virality, engagement, retention potential).

#### `POST /api/engagement/predict`
Predict engagement metrics for content.

#### `POST /api/emotional/score`
Emotional resonance analysis.

#### `POST /api/attention/optimize`
Attention curve optimization.

#### `POST /api/audio/process`
Audio enhancement suggestions.

#### `POST /api/visual/enhance`
Visual style recommendations.

#### `POST /api/editing/plan`
Auto-editing suggestions.

---

### Strategy & Hooks

#### `GET /api/hooks`
Hook template library.

**Query params:** `category`, `platform`, `minEffectiveness`

#### `POST /api/strategy/cta/generate`
Generate call-to-action copy.

#### `GET /api/strategy/cta`
List available call-to-action templates.

#### `POST /api/marketing/audience`
Generate marketing copy variants for a target audience.

---

### Analytics

#### `POST /api/marketing/analytics`
Submit performance analytics metrics.

**Query params:** `period` (`7d|30d|90d|all`)

#### `GET /api/abtesting`
List A/B test variants.

#### `POST /api/abtesting`
Create new A/B test.

#### `POST /api/abtesting/:id/event`
Record an A/B test event (impression / conversion).

---

### System

#### `GET /api/tenants`
List tenants (admin).

#### `POST /api/tenants`
Create tenant.

#### `GET /api/costs/summary`
Cost tracking summary.

#### `GET /api/webhooks`
List configured webhooks.

#### `POST /api/webhooks`
Register a new webhook.

#### `GET /api/branding/:tenantId`
Get branding configuration.

#### `PUT /api/branding/:tenantId`
Update branding theme.

#### `POST /api/queue/bulk`
Queue status and job counts.

---

## Error Responses

All errors follow this format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description"
}
```

| HTTP Code | Description |
|-----------|-------------|
| 400 | Bad Request — validation error |
| 401 | Unauthorized — invalid API key |
| 404 | Not Found |
| 429 | Too Many Requests — rate limited |
| 500 | Internal Server Error |

---

## Interactive API Documentation

The live Swagger UI is available at:

```
http://localhost:3123/api/docs
```

Raw OpenAPI JSON spec:

```
http://localhost:3123/api/docs.json
```
