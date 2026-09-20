# Database Schema – AI Viral Content Empire v12.0

> **Scope note:** This document defines the existing JSON-store contracts and is retained for compatibility and migration reference. It is not the final PostgreSQL schema. Connector evolution, workspace ownership, profile-account reconciliation, and the planned destination model are consolidated in `docs/MULTI_WORKSPACE_CONNECTOR_ARCHITECTURE.md`; migration safety and cutover status remain in `docs/MIGRATION_RUNBOOK.md` and `docs/POSTGRES_MINIO_MIGRATION_MATRIX.md`.

## Overview

The platform uses a **file-based JSON store** pattern. All data is stored as JSON files in `DATA_DIR_PATH` (default: `~/.ai-content-empire/`). Each store is a single JSON file read fully into memory, modified, and written back atomically.

> This design makes the app zero-dependency for persistence — no PostgreSQL, MySQL, or MongoDB required. For high-volume production (>10k records per store), consider replacing individual stores with SQLite or Postgres.

## Store Files

### `videoLibrary.json` — Video Library

Array of `VideoRecord` objects.

```json
{
  "id": "clx1234abc",
  "title": "string",
  "description": "string",
  "category": "Technology | Business | Health | ...",
  "subcategory": "string | null",
  "duration": 60,
  "platform": "youtube | instagram | tiktok | facebook | linkedin | twitter | telegram",
  "status": "draft | published | scheduled | archived",
  "videoPath": "/app/data/videos/abc.mp4 | null",
  "thumbnailPath": "/app/data/thumbnails/abc.jpg | null",
  "tags": ["string"],
  "engagementMetrics": {
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0
  },
  "publishedAt": "ISO8601 | null",
  "scheduledFor": "ISO8601 | null",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### `renderJobs.json` — Render Job Queue

Array of `RenderJob` objects tracking video rendering state.

```json
{
  "id": "string",
  "status": "pending | rendering | done | failed",
  "videoId": "string | null",
  "scenes": [{ "text": "string", "searchTerms": ["string"] }],
  "options": {},
  "progress": 0,
  "error": "string | null",
  "outputPath": "string | null",
  "startedAt": "ISO8601 | null",
  "completedAt": "ISO8601 | null",
  "createdAt": "ISO8601"
}
```

### `publishJobs.json` — Publish Job Queue

Array of `PublishJob` objects tracking platform publishing state.

```json
{
  "id": "string",
  "videoId": "string",
  "platform": "youtube | instagram | ...",
  "status": "pending | publishing | done | failed",
  "platformVideoId": "string | null",
  "platformUrl": "string | null",
  "error": "string | null",
  "metadata": {
    "title": "string",
    "description": "string",
    "tags": ["string"],
    "category": "string"
  },
  "publishedAt": "ISO8601 | null",
  "createdAt": "ISO8601"
}
```

### `schedules.json` — Persistent Content Schedules

Array of `ScheduleRecord` objects.

```json
{
  "id": "string",
  "name": "string",
  "status": "active | paused | completed | failed",
  "platforms": ["youtube", "instagram"],
  "categories": ["Technology"],
  "languages": ["en"],
  "cronExpression": "0 9 * * *",
  "publishAt": "ISO8601 | null",
  "runCount": 0,
  "lastRun": "ISO8601 | null",
  "nextRun": "ISO8601 | null",
  "engines": {
    "enableHashtagOptimization": true,
    "enableCommentCTA": true,
    "enableViralElements": true,
    "enableTrendAlignment": true,
    "enableEngagementHooks": true
  },
  "quality": {
    "targetLUFS": -14,
    "visualQualityTier": "standard | premium | ultra",
    "enableColorGrading": true,
    "enableNoiseReduction": false
  },
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### `tenants.json` — Multi-Tenant SaaS Accounts

Array of `Tenant` objects.

```json
{
  "id": "string",
  "name": "string",
  "plan": "free | starter | pro | enterprise",
  "apiKey": "ace_xxxxxxxxxxxx",
  "settings": {
    "maxVideosPerMonth": 1000,
    "maxStorageGB": 50,
    "enabledPlatforms": ["youtube", "instagram", "tiktok"],
    "brandingEnabled": true,
    "whitelabelEnabled": false
  },
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### `tenantUsage.json` — Per-Tenant Usage Tracking

```json
{
  "tenantId": "string",
  "month": "2026-05",
  "videosCreated": 45,
  "videosPublished": 38,
  "storageUsedGB": 12.4,
  "apiCallsTotal": 1234,
  "updatedAt": "ISO8601"
}
```

### `profiles.json` — Client Profiles

Array of `ProfileRecord` objects. Each profile represents a client / niche and lists the content categories that route to it.

```json
{
  "id": "string",
  "name": "TechBrand Client",
  "description": "Technology content for TechBrand",
  "genres": ["Technology", "Science"],
  "accountIds": ["<profileAccountId>"],
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### `profileAccounts.json` — Profile Platform Accounts

Array of `ProfileAccountRecord` objects. Each account belongs to exactly one profile.

```json
{
  "id": "string",
  "profileId": "string",
  "provider": "youtube | telegram | instagram | facebook | linkedin | x",
  "label": "TechBrand Telegram channel",
  "externalId": "string | null",
  "displayName": "string | null",
  "avatarUrl": "string | null",
  "status": "active | needs-reauth | error",
  "lastError": "string | null",
  "credentials": {
    "botToken": "ENCRYPTED_BASE64",
    "channelId": "ENCRYPTED_BASE64"
  },
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

> **Credentials are encrypted at rest** with AES-256-GCM using `TENANT_KEYS_SECRET`. Each value is `base64(iv || authTag || ciphertext)`. The API summary exposes `hasCredentials` instead of the encrypted values.

### `analytics.json` — Performance Analytics

```json
{
  "events": [
    {
      "id": "string",
      "type": "video_rendered | video_published | schedule_run | error",
      "videoId": "string | null",
      "platform": "string | null",
      "metadata": {},
      "timestamp": "ISO8601"
    }
  ],
  "aggregates": {
    "2026-05": {
      "videosRendered": 120,
      "videosPublished": 98,
      "totalViews": 456789,
      "totalLikes": 23456
    }
  }
}
```

### `abVariants.json` — A/B Test Variants

```json
{
  "id": "string",
  "name": "string",
  "hypothesis": "string",
  "status": "running | completed | paused",
  "variants": [
    {
      "id": "A",
      "description": "Control",
      "allocation": 50,
      "metrics": { "views": 0, "ctr": 0, "retention": 0 }
    },
    {
      "id": "B",
      "description": "Treatment",
      "allocation": 50,
      "metrics": { "views": 0, "ctr": 0, "retention": 0 }
    }
  ],
  "winner": "A | B | null",
  "confidence": 0.0,
  "createdAt": "ISO8601",
  "completedAt": "ISO8601 | null"
}
```

### `hooks.json` — Hook Templates Library

```json
{
  "id": "string",
  "category": "Question | Controversy | Secret | Number | Story | Warning | Comparison | POV",
  "template": "string with {placeholders}",
  "effectiveness": 8.5,
  "platforms": ["tiktok", "youtube", "instagram"],
  "usageCount": 0,
  "createdAt": "ISO8601"
}
```

### `brandingConfig.json` — White-Label Branding

```json
{
  "defaultTheme": "string | null",
  "themes": [
    {
      "id": "string",
      "name": "string",
      "colors": {
        "primary": "#6366f1",
        "secondary": "#f59e0b",
        "accent": "#22c55e",
        "background": "#0f172a",
        "text": "#ffffff"
      },
      "fonts": { "heading": "Inter", "body": "Roboto" },
      "logo": "base64_or_url | null",
      "watermark": "string | null",
      "createdAt": "ISO8601"
    }
  ]
}
```

### `webhooks.json` — Outgoing Webhooks

```json
{
  "id": "string",
  "url": "https://...",
  "events": ["video.rendered", "video.published", "schedule.run", "error"],
  "secret": "string",
  "active": true,
  "lastTriggered": "ISO8601 | null",
  "createdAt": "ISO8601"
}
```

### `costs.json` — Cost Tracking

```json
{
  "records": [
    {
      "id": "string",
      "service": "pexels | openai | kokoro | whisper | remotion",
      "operation": "string",
      "amount": 0.005,
      "currency": "USD",
      "metadata": {},
      "timestamp": "ISO8601"
    }
  ],
  "totals": {
    "2026-05": { "usd": 12.34 }
  }
}
```

### `customNewsSources.json` — RSS News Sources

```json
{
  "id": "string",
  "name": "TechCrunch",
  "url": "https://techcrunch.com/feed/",
  "category": "Technology",
  "active": true,
  "createdAt": "ISO8601"
}
```

### `categoryMappings.json` — Platform Category Mappings

```json
{
  "id": "string",
  "name": "Technology",
  "youtubeCategory": "28",
  "tiktokCategory": "tech",
  "searchTerms": ["technology", "AI", "software"],
  "createdAt": "ISO8601"
}
```

## Migration System

Migrations live in `database/migrations/` and are numbered (`001_init.js`, `002_xyz.js`, ...).

- Run: `bash database/migrate.sh`
- Applied migrations are tracked in `DATA_DIR_PATH/_migrations.json`
- All migrations are **idempotent** — safe to re-run

## Seeder System

Seeders live in `database/seeders/` and are numbered similarly.

- Run: `bash database/seed.sh`
- Applied seeders tracked in `DATA_DIR_PATH/_seeders.json`
- Skip seeding if data already exists

## Performance Notes

| Store | Typical Size | Load Time |
|-------|-------------|-----------|
| videoLibrary.json | ~5MB (1000 videos) | ~50ms |
| hooks.json | ~50KB | <5ms |
| analytics.json | ~50MB (1M events) | ~500ms |

> For `analytics.json` at high volume, consider switching to SQLite or a time-series DB.


<!-- AUTO-GENERATED:store-inventory:BEGIN -->
JSON-backed data stores in `src/db/` (18).

| File | Class | JSON File | Purpose |
|------|-------|-----------|---------|
| `src/db/ABVariantStore.ts` | ABVariantStore | `abVariants.json` | - |
| `src/db/AiLearningStore.ts` | AiLearningStore | `ai-learning-events.json` | - |
| `src/db/AnalyticsStore.ts` | AnalyticsStore | `analytics.json` | - |
| `src/db/AudienceStore.ts` | AudienceStore | `audienceTargets.json` | - |
| `src/db/ChannelConfigStore.ts` | ChannelConfigStore | `channelConfigs.json` | - |
| `src/db/CustomNewsSourceStore.ts` | CustomNewsSourceStore | `customNewsSources.json` | - |
| `src/db/PipelineStore.ts` | PipelineStore | `pipeline-jobs.json` | - |
| `src/db/ProfileAccountStore.ts` | ProfileAccountStore | `profileAccounts.json` | - |
| `src/db/ProfileStore.ts` | ProfileStore | `profiles.json` | - |
| `src/db/PublishJobStore.ts` | PublishJobStore | `publishJobs.json` | Idempotency check: same render output + platform + channel |
| `src/db/RenderJobStore.ts` | RenderJobStore | `renderJobs.json` | Find existing job with same idempotency key |
| `src/db/ReportStore.ts` | ReportStore | `reports.json` | - |
| `src/db/ScheduleStore.ts` | ScheduleStore | `schedules.json` | Calculate next run based on cron expression (simplified) |
| `src/db/ScriptPlanStore.ts` | ScriptPlanStore | `scriptPlans.json` | - |
| `src/db/TenantStore.ts` | TenantStore | `tenants.json` | - |
| `src/db/TenantUsageStore.ts` | TenantUsageStore | `tenantUsage.json` | - |
| `src/db/VideoLibraryStore.ts` | VideoLibraryStore | `videoLibrary.json` | - |
| `src/db/VideoMetadataStore.ts` | VideoMetadataStore | `videoMetadata.json` | - |
<!-- AUTO-GENERATED:store-inventory:END -->
