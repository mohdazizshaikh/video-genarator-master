/**
 * OpenAPI 3.0 Specification for AI Viral Content Empire SaaS Platform
 * Served at GET /api/docs (Swagger UI) and GET /api/docs.json (raw spec)
 */

export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "AI Viral Content Empire – API",
    version: "12.0.0",
    description: `
## AI Viral Content Empire SaaS Platform

A full-stack AI-powered viral content creation and publishing platform with **60 engines**.

### Features
- 🎬 AI video creation with TTS, captions, and background footage
- 📱 Multi-platform publishing (YouTube, Instagram, TikTok, Facebook, LinkedIn, X, Telegram)
- 📈 Trend intelligence, viral radar, and engagement prediction
- 🎨 Image generation with 20+ filter presets
- 📅 Persistent scheduling with engine & quality controls
- 📚 Video library with engagement analytics
- 🔄 Content recycling, translation, and series builder
- 🏢 Multi-tenant SaaS with white-label branding

### Authentication
Most endpoints are rate-limited (120 req/min). Admin endpoints require \`X-Admin-Key\` header.

### Base URL
\`http://localhost:3123\`
    `.trim(),
    contact: {
      name: "AI Content Empire Support",
      url: "https://github.com/gyoridavid/short-video-maker",
    },
    license: { name: "MIT", url: "https://opensource.org/licenses/MIT" },
  },
  servers: [
    { url: "http://localhost:3123", description: "Local Development" },
    { url: "http://localhost:5000", description: "Replit Dev Server" },
  ],
  tags: [
    { name: "Health", description: "System health and status" },
    { name: "Videos", description: "Video creation, rendering, and management" },
    { name: "Video Library", description: "Persistent video library CRUD and analytics" },
    { name: "Publishing", description: "Multi-platform video publishing" },
    { name: "Queue", description: "BullMQ job queue management" },
    { name: "Schedule", description: "Persistent scheduling with engine settings" },
    { name: "Trends", description: "Trend intelligence and viral radar" },
    { name: "Strategy", description: "Content strategy, hooks, CTA, and psychology" },
    { name: "Image", description: "AI image generation and filters" },
    { name: "Analytics", description: "Performance analytics and A/B testing" },
    { name: "AI Engines", description: "60 AI enhancement engines" },
    { name: "Content Tools", description: "Translation, recycling, series builder, watermark" },
    { name: "System", description: "Tenants, branding, webhooks, costs, health" },
  ],
  paths: {
    // ── Health ────────────────────────────────────────────────
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Application readiness",
        description: "Returns 200 only when the video engine and configured Redis workers are ready; otherwise 503. /api/health/live reports process liveness. Host and queue details are restricted to operations access.",
        responses: {
          200: {
            description: "Application is ready",
            content: {
              "application/json": {
                example: {
                  status: "ready",
                  ready: true,
                },
              },
            },
          },
        },
      },
    },

    // ── Videos ────────────────────────────────────────────────
    "/api/shorts": {
      get: {
        tags: ["Videos"],
        summary: "List all videos",
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["pending", "rendering", "done", "failed"] } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
        ],
        responses: { 200: { description: "List of videos" } },
      },
      post: {
        tags: ["Videos"],
        summary: "Create a new short video",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["scenes"],
                properties: {
                  scenes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string", description: "Narration text for this scene" },
                        searchTerms: { type: "array", items: { type: "string" }, description: "Search terms for background video" },
                      },
                    },
                  },
                  music: { type: "object", properties: { genre: { type: "string" }, mood: { type: "string" } } },
                  voice: { type: "string", description: "TTS voice to use" },
                },
              },
              example: {
                scenes: [
                  { text: "Artificial intelligence is transforming the world.", searchTerms: ["technology", "AI", "future"] },
                  { text: "Here are 3 ways AI will change your business.", searchTerms: ["business", "office", "digital"] },
                ],
                music: { genre: "ambient", mood: "inspiring" },
              },
            },
          },
        },
        responses: {
          200: { description: "Video created and queued for rendering" },
          400: { description: "Validation error" },
        },
      },
    },
    "/api/shorts/{videoId}": {
      get: {
        tags: ["Videos"],
        summary: "Get video details",
        parameters: [{ name: "videoId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Video details" }, 404: { description: "Not found" } },
      },
      delete: {
        tags: ["Videos"],
        summary: "Delete a video",
        parameters: [{ name: "videoId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Deleted" } },
      },
    },

    // ── Video Library ─────────────────────────────────────────
    "/api/videolibrary": {
      get: {
        tags: ["Video Library"],
        summary: "List library videos",
        parameters: [
          { name: "status", in: "query", schema: { type: "string", enum: ["draft", "published", "scheduled", "archived"] } },
          { name: "platform", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        ],
        responses: { 200: { description: "Video library records" } },
      },
      post: {
        tags: ["Video Library"],
        summary: "Add video to library",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              example: {
                title: "My Viral Tech Video",
                description: "A deep dive into AI trends",
                category: "Technology",
                platform: "youtube",
                status: "draft",
                tags: ["AI", "tech", "viral"],
                duration: 60,
              },
            },
          },
        },
        responses: { 200: { description: "Created record" } },
      },
    },
    "/api/videolibrary/stats": {
      get: {
        tags: ["Video Library"],
        summary: "Library statistics",
        description: "Returns counts by status, platform, and category",
        responses: { 200: { description: "Stats breakdown" } },
      },
    },
    "/api/videolibrary/tags": {
      get: {
        tags: ["Video Library"],
        summary: "Trending tags in library",
        responses: { 200: { description: "Tags sorted by usage count" } },
      },
    },
    "/api/videolibrary/search": {
      get: {
        tags: ["Video Library"],
        summary: "Full-text search",
        parameters: [{ name: "q", in: "query", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Search results" } },
      },
    },
    "/api/videolibrary/{id}": {
      get: { tags: ["Video Library"], summary: "Get library record", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Record" } } },
      patch: { tags: ["Video Library"], summary: "Update library record", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Updated" } } },
      delete: { tags: ["Video Library"], summary: "Delete library record", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Deleted" } } },
    },
    "/api/videolibrary/{id}/metrics": {
      patch: {
        tags: ["Video Library"],
        summary: "Update engagement metrics",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              example: { views: 15000, likes: 1200, comments: 89, shares: 340 },
            },
          },
        },
        responses: { 200: { description: "Updated" } },
      },
    },

    // ── Schedule ──────────────────────────────────────────────
    "/api/schedule": {
      get: {
        tags: ["Schedule"],
        summary: "List schedules",
        parameters: [{ name: "status", in: "query", schema: { type: "string" } }],
        responses: { 200: { description: "Schedule records" } },
      },
      post: {
        tags: ["Schedule"],
        summary: "Create a schedule",
        requestBody: {
          content: {
            "application/json": {
              example: {
                name: "Daily Tech Content",
                platforms: ["youtube", "instagram"],
                categories: ["Technology"],
                languages: ["en"],
                cronExpression: "0 9 * * *",
                publishAt: "2026-05-05T09:00:00.000Z",
                engines: { enableHashtagOptimization: true, enableCommentCTA: true },
                quality: { targetLUFS: -14, visualQualityTier: "premium" },
              },
            },
          },
        },
        responses: { 200: { description: "Created schedule" } },
      },
    },
    "/api/schedule/stats": {
      get: { tags: ["Schedule"], summary: "Schedule statistics", responses: { 200: { description: "Stats" } } },
    },
    "/api/schedule/{id}/run": {
      post: { tags: ["Schedule"], summary: "Trigger manual run", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "Triggered" } } },
    },
    "/api/schedule/{id}/status": {
      patch: {
        tags: ["Schedule"],
        summary: "Update schedule status (active/paused/completed)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { example: { status: "paused" } } } },
        responses: { 200: { description: "Updated" } },
      },
    },

    // ── Trends ────────────────────────────────────────────────
    "/api/trends": {
      get: { tags: ["Trends"], summary: "Get trending topics", parameters: [{ name: "category", in: "query", schema: { type: "string" } }], responses: { 200: { description: "Trending topics" } } },
    },
    "/api/trends/viral": {
      get: { tags: ["Trends"], summary: "Viral radar", description: "Top viral content opportunities scored by potential", responses: { 200: { description: "Viral scores" } } },
    },

    // ── Image ─────────────────────────────────────────────────
    "/api/image/generate": {
      post: {
        tags: ["Image"],
        summary: "Generate an image",
        requestBody: {
          content: {
            "application/json": {
              example: { type: "quote_card", title: "AI is the future", category: "Technology", platform: "instagram_square" },
            },
          },
        },
        responses: { 200: { description: "Generated image" } },
      },
    },
    "/api/image/filters": {
      get: {
        tags: ["Image"],
        summary: "List 20 filter presets",
        parameters: [{ name: "platform", in: "query", schema: { type: "string" } }],
        responses: { 200: { description: "Filter presets" } },
      },
    },
    "/api/image/filters/css": {
      post: {
        tags: ["Image"],
        summary: "Build CSS filter string",
        requestBody: {
          content: {
            "application/json": {
              example: { filter: "cinema", intensity: 90, brightness: 90, contrast: 130, saturation: 80 },
            },
          },
        },
        responses: { 200: { description: "CSS and SVG filter strings" } },
      },
    },

    // ── Publishing ────────────────────────────────────────────
    "/api/publish": {
      post: {
        tags: ["Publishing"],
        summary: "Publish video to platform",
        requestBody: {
          content: {
            "application/json": {
              example: { videoId: "vid_abc123", platform: "youtube", title: "My Viral Video", description: "Watch this!", tags: ["viral", "AI"] },
            },
          },
        },
        responses: { 200: { description: "Published" }, 400: { description: "Error" } },
      },
    },

    // ── Analytics ─────────────────────────────────────────────
    "/api/analytics": {
      get: { tags: ["Analytics"], summary: "Performance analytics", parameters: [{ name: "period", in: "query", schema: { type: "string", default: "7d" } }], responses: { 200: { description: "Analytics data" } } },
    },
    "/api/ab-testing": {
      get: { tags: ["Analytics"], summary: "A/B test variants", responses: { 200: { description: "Test variants" } } },
      post: { tags: ["Analytics"], summary: "Create A/B test", responses: { 200: { description: "Created" } } },
    },

    // ── AI Engines ────────────────────────────────────────────
    "/api/humanized": {
      post: { tags: ["AI Engines"], summary: "Humanize content", description: "Makes AI-generated content sound more natural and human", requestBody: { content: { "application/json": { example: { text: "AI content here" } } } }, responses: { 200: { description: "Humanized content" } } },
    },
    "/api/thumbnail": {
      post: { tags: ["AI Engines"], summary: "Generate thumbnail", requestBody: { content: { "application/json": { example: { title: "Video Title", style: "youtube" } } } }, responses: { 200: { description: "Thumbnail" } } },
    },
    "/api/quality": {
      post: { tags: ["AI Engines"], summary: "Score content quality", requestBody: { content: { "application/json": { example: { script: "Content to score" } } } }, responses: { 200: { description: "Quality scores" } } },
    },
    "/api/engagement": {
      post: { tags: ["AI Engines"], summary: "Predict engagement", requestBody: { content: { "application/json": { example: { title: "Video title", description: "Description", tags: ["tag1"] } } } }, responses: { 200: { description: "Engagement predictions" } } },
    },

    // ── Content Tools ─────────────────────────────────────────
    "/api/translate": {
      post: { tags: ["Content Tools"], summary: "Translate content", requestBody: { content: { "application/json": { example: { text: "Hello world", targetLanguage: "es" } } } }, responses: { 200: { description: "Translated text" } } },
    },
    "/api/recycle": {
      get: { tags: ["Content Tools"], summary: "Get recycled content suggestions", responses: { 200: { description: "Content to recycle" } } },
    },
    "/api/watermark": {
      post: { tags: ["Content Tools"], summary: "Apply watermark to video", requestBody: { content: { "application/json": { example: { videoId: "vid_abc123", watermark: "@YourBrand", position: "bottom-right" } } } }, responses: { 200: { description: "Watermarked" } } },
    },
    "/api/shadowban": {
      post: { tags: ["Content Tools"], summary: "Check shadowban risk", requestBody: { content: { "application/json": { example: { hashtags: ["#trending", "#viral"], platform: "instagram" } } } }, responses: { 200: { description: "Risk assessment" } } },
    },

    // ── System ────────────────────────────────────────────────
    "/api/tenants": {
      get: { tags: ["System"], summary: "List tenants", responses: { 200: { description: "Tenants" } } },
      post: { tags: ["System"], summary: "Create tenant", responses: { 200: { description: "Created" } } },
    },
    "/api/costs": {
      get: { tags: ["System"], summary: "Cost tracking summary", responses: { 200: { description: "Cost breakdown" } } },
    },
    "/api/webhooks": {
      get: { tags: ["System"], summary: "List webhooks", responses: { 200: { description: "Webhooks" } } },
      post: { tags: ["System"], summary: "Create webhook", responses: { 200: { description: "Created" } } },
    },
    "/api/branding": {
      get: { tags: ["System"], summary: "Get branding config", responses: { 200: { description: "Branding" } } },
      post: { tags: ["System"], summary: "Update branding", responses: { 200: { description: "Updated" } } },
    },
    "/api/hooks": {
      get: { tags: ["Strategy"], summary: "Hook templates library", parameters: [{ name: "category", in: "query", schema: { type: "string" } }], responses: { 200: { description: "Hook templates" } } },
    },
    "/api/strategy/hashtags": {
      post: { tags: ["Strategy"], summary: "Optimize hashtags", requestBody: { content: { "application/json": { example: { topic: "AI technology", platform: "instagram" } } } }, responses: { 200: { description: "Optimized hashtags" } } },
    },
  },
  components: {
    schemas: {
      VideoRecord: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          status: { type: "string", enum: ["draft", "published", "scheduled", "archived"] },
          platform: { type: "string" },
          category: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          engagementMetrics: {
            type: "object",
            properties: {
              views: { type: "integer" },
              likes: { type: "integer" },
              comments: { type: "integer" },
              shares: { type: "integer" },
            },
          },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      ScheduleRecord: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          platforms: { type: "array", items: { type: "string" } },
          cronExpression: { type: "string" },
          status: { type: "string", enum: ["active", "paused", "completed", "failed"] },
          runCount: { type: "integer" },
          nextRun: { type: "string", format: "date-time" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
        },
      },
    },
    securitySchemes: {
      AdminKey: {
        type: "apiKey",
        in: "header",
        name: "X-Admin-Key",
        description: "Admin API key (set ADMIN_API_KEY env var)",
      },
    },
  },
};
