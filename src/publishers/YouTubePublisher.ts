/**
 * YouTubePublisher – Phase 5.3
 *
 * Uploads videos to YouTube using the Data API v3 via googleapis.
 * OAuth2: refresh token flow (offline access).
 */
import fs from "node:fs";
import { google } from "googleapis";
import type { Config } from "../config";
import { logger } from "../logger";
import { classifyFailure, sanitizeProviderMessage } from "./failureClassification";
import type { PlatformPublisher, PlatformLimits, PublishParams, PublishResult } from "./PlatformPublisher";

export class YouTubePublisher implements PlatformPublisher {
  readonly platform = "youtube" as const;
  private readonly oAuth2Client;

  constructor(private config: Config) {
    this.oAuth2Client = new google.auth.OAuth2(
      config.youtubeClientId,
      config.youtubeClientSecret,
    );
    if (config.youtubeRefreshToken) {
      this.oAuth2Client.setCredentials({ refresh_token: config.youtubeRefreshToken });
    }
  }

  async validateCredentials(): Promise<boolean> {
    if (!this.config.youtubeClientId || !this.config.youtubeClientSecret || !this.config.youtubeRefreshToken) {
      return false;
    }
    try {
      await this.refreshToken();
      return true;
    } catch {
      return false;
    }
  }

  async refreshToken(): Promise<void> {
    const { credentials } = await this.oAuth2Client.refreshAccessToken();
    this.oAuth2Client.setCredentials(credentials);
    logger.debug("YouTube: access token refreshed");
  }

  getVideoLimits(): PlatformLimits {
    return {
      maxFileSizeMB: 256 * 1024, // 256 GB
      maxDurationSeconds: 12 * 3600, // 12 hours
      maxTitleLength: 100,
      maxDescriptionLength: 5000,
      maxTagCount: 500,
      maxTagLength: 30,
      supportedFormats: ["mp4", "mov", "avi", "wmv", "flv", "webm"],
    };
  }

  async uploadVideo(params: PublishParams): Promise<PublishResult> {
    try {
      await this.refreshToken();
      const youtube = google.youtube({ version: "v3", auth: this.oAuth2Client });

      const limits = this.getVideoLimits();
      const title = params.title.slice(0, limits.maxTitleLength);
      const description = params.description.slice(0, limits.maxDescriptionLength);
      const tags = params.tags
        .slice(0, limits.maxTagCount)
        .map((t) => t.slice(0, limits.maxTagLength));

      const res = await youtube.videos.insert({
        part: ["snippet", "status"],
        requestBody: {
          snippet: {
            title,
            description,
            tags,
            defaultLanguage: params.language,
            defaultAudioLanguage: params.language,
          },
          status: {
            privacyStatus: params.scheduleAt ? "private" : "public",
            publishAt: params.scheduleAt?.toISOString(),
          },
        },
        media: {
          mimeType: "video/mp4",
          body: fs.createReadStream(params.videoFilePath),
        },
      });

      const videoId = res.data.id;
      logger.info({ videoId, title }, "YouTube: video uploaded");

      return {
        success: true,
        externalId: videoId ?? undefined,
        publishedUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined,
      };
    } catch (err: unknown) {
      const rawMessage = err instanceof Error ? err.message : String(err);
      const response = (err as {
        response?: { status?: number; data?: { error?: { message?: string; errors?: Array<{ reason?: string }> } } };
      })?.response;
      const httpStatus = typeof response?.status === "number" ? response.status : undefined;
      const apiMessage = typeof response?.data?.error?.message === "string" ? response.data.error.message : undefined;
      const reason = Array.isArray(response?.data?.error?.errors) ? response.data.error.errors[0]?.reason : undefined;
      const quotaLimited = reason === "quotaExceeded" || reason === "rateLimitExceeded" || reason === "userRateLimitExceeded";
      const sourceMessage = apiMessage ?? rawMessage;
      const safeMessage = sanitizeProviderMessage(sourceMessage, [this.config.youtubeRefreshToken, this.config.youtubeClientSecret]);
      const failure = quotaLimited
        ? classifyFailure({ code: "rate_limited", message: sourceMessage })
        : classifyFailure({ message: sourceMessage, httpStatus });
      logger.error({ err: safeMessage, code: failure.code }, "YouTube upload failed");
      return { success: false, error: safeMessage, errorCode: failure.code };
    }
  }

  async scheduleVideo(params: PublishParams, publishAt: Date): Promise<PublishResult> {
    return this.uploadVideo({ ...params, scheduleAt: publishAt });
  }
}
