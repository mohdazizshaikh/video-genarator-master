# Architecture – AI Viral Content Empire v12.0

> **Scope note:** This is the original system overview and remains useful for component context. For current migration status, use `docs/CURRENT_STATUS.md`, `docs/MIGRATION_RUNBOOK.md`, and `docs/POSTGRES_MINIO_MIGRATION_MATRIX.md`. For the connector/account evolution and workspace isolation model, use `docs/MULTI_WORKSPACE_CONNECTOR_ARCHITECTURE.md`. The file-backed and global-provider sections below describe the legacy/current compatibility path, not a completed PostgreSQL connector cutover.

## Overview

AI Viral Content Empire is a full-stack SaaS platform for automated viral content creation and multi-platform publishing. It ships **60 AI engines** across a TypeScript/Node.js backend and a React frontend.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser / Mobile Client                     │
│                     React + Vite + MUI Frontend                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP / REST API
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Express.js API Server                      │
│                      Port: 3123 (default)                       │
│  ┌─────────────┐  ┌────────────┐  ┌────────────┐               │
│  │ Rate Limiter│  │ API Router │  │Swagger Docs│               │
│  │ 120 req/min │  │ /api/*     │  │ /api/docs  │               │
│  └─────────────┘  └─────┬──────┘  └────────────┘               │
│                          │                                       │
│  ┌───────────────────────┴────────────────────────────────────┐ │
│  │                    42 Feature Routers                       │ │
│  │  health │ publish │ queue │ tenants │ marketing │ ai        │ │
│  │  content│ trends  │ hooks │ translate│ image    │ recycle   │ │
│  │  costs  │ shadowban│strategy│webhooks│branding  │ humanized │ │
│  │  thumbnail│editing│visual │ audio  │ emotional │ attention  │ │
│  │  quality│ engagement│account│watermark│videolibrary│schedule│ │
│  │  profiles │ oauth │ pipeline │ ...                         │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬──────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│   ShortCreator      │         │   BullMQ Workers     │
│   Service Layer     │         │                      │
│                     │         │  RenderWorker        │
│  ┌───────────────┐  │         │  PublishWorker       │
│  │ Kokoro TTS    │  │         │  DeadLetterWorker    │
│  │ Whisper STT   │  │◄───────►│                      │
│  │ Remotion      │  │         │  (Redis-backed)      │
│  │ FFmpeg        │  │         └──────────┬──────────┘
│  │ PexelsAPI     │  │                    │
│  └───────────────┘  │                    ▼
│                     │         ┌─────────────────────┐
│  SchedulerService   │         │       Redis          │
│  (cron-based)       │         │   (Job Queue)        │
└─────────┬───────────┘         └─────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    File-Based Data Layer                        │
│          DATA_DIR_PATH (~/.ai-content-empire/)                  │
│                                                                 │
│  videoLibrary.json    renderJobs.json      publishJobs.json     │
│  schedules.json       tenants.json         hooks.json           │
│  analytics.json       abVariants.json      brandingConfig.json  │
│  costs.json           webhooks.json        aiLearning.json      │
│  customNewsSources.json  audienceProfiles.json  reports.json    │
│  scriptPlans.json     videoMetadata.json   tenantUsage.json     │
└─────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### Frontend (`src/remotion/` + `src/ui/`)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| UI Framework | React 18 + Vite | Single-page web app |
| Component Library | Material UI v5 | Design system |
| Charts | Recharts | Analytics dashboards |
| Video Rendering | Remotion | Programmatic video composition |
| State | React hooks + context | Local state management |

### Backend (`src/`)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Node.js 20 | Server runtime |
| Language | TypeScript 5 | Type safety |
| HTTP Server | Express.js | REST API |
| Logging | Pino | Structured JSON logging |
| Config | `src/config.ts` | Centralized env-var access |
| Validation | `src/config/validate.ts` | Startup env validation |

### AI & Media Processing

| Component | Technology | Purpose |
|-----------|-----------|---------|
| TTS | Kokoro | Text-to-speech voice synthesis |
| STT / Captions | Whisper.cpp | Speech recognition & caption timing |
| Video Rendering | Remotion + FFmpeg | Video composition & encoding |
| Background Video | Pexels API | Stock footage sourcing |
| AI Images | Pollinations / LLM | AI image generation |
| LLM | Ollama / Docker Model Runner | Script & metadata generation |
| Translation | LibreTranslate | Multi-language content |

### Job Queue (`src/workers/`)

```
Direct Mode (no Redis):
  API Request → ShortCreator → file output

Queue Mode (REDIS_ENABLED=true):
  API Request → BullMQ Queue (Redis)
                    ├── RenderWorker (RENDER_WORKER_CONCURRENCY)
                    ├── PublishWorker (PUBLISH_WORKER_CONCURRENCY)
                    └── DeadLetterWorker (failed job recovery)
```

### Publishing Platforms

| Platform | Method | Config |
|----------|--------|--------|
| YouTube | Google OAuth2 API | `YOUTUBE_CLIENT_*` |
| Instagram | Graph API | `INSTAGRAM_ACCESS_TOKEN` |
| Facebook | Graph API | `FACEBOOK_ACCESS_TOKEN` |
| Telegram | Bot API | `TELEGRAM_BOT_TOKEN` + `CHANNEL_ID` |
| LinkedIn | REST API | `LINKEDIN_ACCESS_TOKEN` |
| X/Twitter | REST API v2 | `TWITTER_API_*` |

## Data Flow: Video Creation

```
1. POST /api/shorts
        │
        ▼
2. ShortCreator.createShort(scenes, options)
        │
        ├── 2a. PexelsAPI.searchVideos(searchTerms)
        │         → Download background clips
        │
        ├── 2b. KokoroTTS.synthesize(text)
        │         → Generate voice audio (.wav)
        │
        ├── 2c. Remotion.renderVideo(composition)
        │         → Render React composition to video
        │
        ├── 2d. Whisper.transcribe(audio)
        │         → Generate caption timestamps
        │
        └── 2e. FFmpeg.compose(video, audio, captions)
                  → Final MP4 output
```

## Security Architecture

- **Rate Limiting**: 120 req/min per IP via `express-rate-limit`
- **Multi-Tenant**: Tenant API keys signed with `TENANT_KEYS_SECRET`
- **CORS**: Configurable `CORS_ORIGINS` env var
- **Trust Proxy**: Enabled for reverse proxy deployments
- **Dependency Auditing**: `pnpm audit` in CI (`security.yml`)
- **No SQL Injection Risk**: File-based JSON stores (no SQL)

## Scalability

The app is designed as a single-process service optimized for vertical scaling:

- Increase `CONCURRENCY` for more parallel Remotion renders
- Increase `RENDER_WORKER_CONCURRENCY` / `PUBLISH_WORKER_CONCURRENCY` for more queue throughput
- Horizontal scaling requires a shared `DATA_DIR_PATH` (NFS/EFS) and Redis
- Memory intensive: recommend 4–8GB RAM per instance

## Directory Structure

```
ai-viral-content-empire/
├── src/
│   ├── config.ts              # Env-var config class
│   ├── config/
│   │   └── validate.ts        # Startup env validation
│   ├── index.ts               # Entry point
│   ├── logger.ts              # Pino logger setup
│   ├── db/                    # File-based data stores
│   ├── server/
│   │   ├── server.ts          # Express setup
│   │   ├── swagger.ts         # OpenAPI spec
│   │   ├── rateLimit.ts       # Rate limiter
│   │   └── routers/           # 33 feature routers
│   ├── short-creator/         # Core video creation engine
│   │   ├── ShortCreator.ts
│   │   └── libraries/         # Kokoro, Whisper, Remotion, FFmpeg, Pexels
│   ├── workers/               # BullMQ queue workers
│   ├── services/              # SchedulerService, etc.
│   └── scripts/               # install.ts
├── src/ui/                    # React frontend (Vite)
├── database/
│   ├── migrations/            # Idempotent init scripts
│   └── seeders/               # Default data seeders
├── scripts/                   # deploy.sh, backup.sh, healthcheck.sh
├── .github/workflows/         # CI + Deploy
├── docs/                      # This folder
├── docker-compose.yml
├── main.Dockerfile
├── .env.example
└── setup.sh
```
