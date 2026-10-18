/**
 * TelegramPublisher – Phase 5.4
 *
 * Sends videos to a Telegram channel via Bot API sendVideo.
 * No OAuth needed – just BOT_TOKEN + CHANNEL_ID.
 */
import fs from "node:fs";
import FormData from "form-data";
import axios from "axios";
import type { Config } from "../config";
import { logger } from "../logger";
import { classifyFailure, sanitizeProviderMessage } from "./failureClassification";
import type { PlatformPublisher, PlatformLimits, PublishParams, PublishResult } from "./PlatformPublisher";

const TELEGRAM_BASE = "https://api.telegram.org";

export class TelegramPublisher implements PlatformPublisher {
  readonly platform = "telegram" as const;

  constructor(private config: Config) {}

  async validateCredentials(): Promise<boolean> {
    if (!this.config.telegramBotToken || !this.config.telegramChannelId) {
      return false;
    }
    try {
      const res = await axios.get(
        `${TELEGRAM_BASE}/bot${this.config.telegramBotToken}/getMe`,
        { timeout: 10000 },
      );
      return res.data?.ok === true;
    } catch {
      return false;
    }
  }

  // No-op: Telegram Bot API tokens don't expire
  async refreshToken(): Promise<void> {}

  getVideoLimits(): PlatformLimits {
    return {
      maxFileSizeMB: 2000, // 2 GB via Bot API
      maxDurationSeconds: 3600,
      maxTitleLength: 256,
      maxDescriptionLength: 1024, // caption limit
      maxTagCount: 0,
      maxTagLength: 0,
      supportedFormats: ["mp4"],
    };
  }

  async uploadVideo(params: PublishParams): Promise<PublishResult> {
    try {
      const limits = this.getVideoLimits();
      const caption = `${params.title}\n\n${params.description}`
        .slice(0, limits.maxDescriptionLength);

      const form = new FormData();
      form.append("chat_id", this.config.telegramChannelId);
      form.append("caption", caption);
      form.append(
        "video",
        fs.createReadStream(params.videoFilePath),
        { filename: "video.mp4", contentType: "video/mp4" },
      );

      const res = await axios.post(
        `${TELEGRAM_BASE}/bot${this.config.telegramBotToken}/sendVideo`,
        form,
        {
          headers: form.getHeaders(),
          timeout: 5 * 60 * 1000, // 5 min
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        },
      );

      if (!res.data?.ok) {
        throw new Error(res.data?.description ?? "Telegram API error");
      }

      const messageId = String(res.data.result?.message_id);
      logger.info({ messageId, channelId: this.config.telegramChannelId }, "Telegram: video sent");

      return {
        success: true,
        externalId: messageId,
        publishedUrl: undefined,
      };
    } catch (err: unknown) {
      const rawMessage = err instanceof Error ? err.message : String(err);
      const response = (err as {
        response?: { status?: number; data?: { description?: string; parameters?: { retry_after?: number } } };
      })?.response;
      const httpStatus = typeof response?.status === "number" ? response.status : undefined;
      const apiDescription = typeof response?.data?.description === "string" ? response.data.description : undefined;
      const retryAfterRaw = Number(response?.data?.parameters?.retry_after);
      const retryAfterSeconds = Number.isFinite(retryAfterRaw) && retryAfterRaw > 0 ? retryAfterRaw : undefined;
      const safeMessage = sanitizeProviderMessage(apiDescription ?? rawMessage, [this.config.telegramBotToken]);
      const failure = classifyFailure({ message: apiDescription ?? rawMessage, httpStatus, retryAfterSeconds });
      logger.error({ err: safeMessage, code: failure.code }, "Telegram upload failed");
      return { success: false, error: safeMessage, errorCode: failure.code, retryAfterSeconds };
    }
  }

  // Telegram does not support scheduling via standard Bot API
  async scheduleVideo(params: PublishParams, _publishAt: Date): Promise<PublishResult> {
    void _publishAt;
    logger.warn("Telegram does not support scheduled posts via Bot API; uploading immediately");
    return this.uploadVideo(params);
  }
}
