import axios from "axios";
import fs from "fs-extra";
import { logger } from "../logger";
import { canonicalPublication, providerFailure, verifyProviderCredentials, unsupportedNativeSchedule } from "./providerContracts";
import { getPlatformLimits } from "./PlatformLimits";
import type { PlatformPublisher, PublishParams, PublishResult, PlatformLimits } from "./PlatformPublisher";

export class XTwitterPublisher implements PlatformPublisher {
  platform = "x" as const;
  private bearerToken: string;
  private apiKey: string;
  private apiSecret: string;
  private accessToken: string;
  private accessSecret: string;

  constructor(credentials: {
    bearerToken: string;
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessSecret: string;
  }) {
    this.bearerToken = credentials.bearerToken;
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    this.accessToken = credentials.accessToken;
    this.accessSecret = credentials.accessSecret;
  }

  private truncateText(text: string, maxLen = 280): string {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen - 3) + "...";
  }

  async uploadVideo(params: PublishParams): Promise<PublishResult> {
    let publicationStarted = false;
    try {
      const tweetText = this.truncateText(
        `${params.title}\n\n${params.description}\n\n${params.tags.slice(0, 3).map((t) => `#${t}`).join(" ")}`,
      );

      const fileBuffer = await fs.readFile(params.videoFilePath);
      const mediaRes = await axios.post(
        "https://upload.twitter.com/1.1/media/upload.json",
        { media_data: fileBuffer.toString("base64"), media_type: "video/mp4" },
        { headers: { Authorization: `Bearer ${this.bearerToken}`, "Content-Type": "application/json" }, timeout: 90000 },
      );
      const mediaId = mediaRes.data?.media_id_string;
      if (typeof mediaId !== "string" || !mediaId.trim() || /\s/.test(mediaId) || ["null", "undefined"].includes(mediaId)) throw new Error("Invalid video media upload response");
      const body = { text: tweetText, media: { media_ids: [mediaId] } };
      publicationStarted = true;
      const res = await axios.post("https://api.twitter.com/2/tweets", body, {
        headers: { Authorization: `Bearer ${this.bearerToken}`, "Content-Type": "application/json" }, timeout: 30000,
      });

      const tweetId = res.data?.data?.id;
      const result = canonicalPublication(tweetId, (id) => `https://x.com/i/web/status/${encodeURIComponent(id)}`);
      if (result.success) logger.info({ tweetId }, "X/Twitter post published");
      return result;
    } catch (err: unknown) {
      const failure = providerFailure(err, [this.bearerToken, this.apiKey, this.apiSecret, this.accessToken, this.accessSecret], publicationStarted ? "unknown" : "not_accepted");
      logger.error({ error: failure.error, code: failure.errorCode }, "X/Twitter publish failed");
      return failure;
    }
  }

  async scheduleVideo(params: PublishParams, publishAt: Date): Promise<PublishResult> {
    void params; void publishAt;
    return unsupportedNativeSchedule("X");
  }

  async refreshToken(): Promise<void> {
    logger.info("X/Twitter OAuth2 token refresh not implemented");
  }

  async validateCredentials(): Promise<boolean> {
    if (!this.bearerToken) return false;
    return verifyProviderCredentials(() => axios.get("https://api.twitter.com/2/users/me", {
      headers: { Authorization: `Bearer ${this.bearerToken}` }, timeout: 5000,
    }), [this.bearerToken, this.apiKey, this.apiSecret, this.accessToken, this.accessSecret]);
  }

  getVideoLimits(): PlatformLimits {
    return getPlatformLimits("x");
  }

  static isConfigured(config: { xApiKey?: string; xBearerToken?: string }): boolean {
    return Boolean(config.xApiKey && config.xBearerToken);
  }
}
