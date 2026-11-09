/**
 * InstagramPublisher – Conservative Instagram publication adapter
 * Reels via an accessible video URL; live platform acceptance is separate.
 */
import type { Config } from "../config";
import type {
  PlatformPublisher,
  PlatformLimits,
  PlatformCapabilities,
  PublishParams,
  PublishResult,
} from "./PlatformPublisher";
import { graphRequest, requiredProviderId, requiredVideoUrl } from "./graphTransport";
import { canonicalPublication, providerFailure, verifyProviderCredentials, unsupportedNativeSchedule } from "./providerContracts";
import { logger } from "../logger";


export class InstagramPublisher implements PlatformPublisher {
  readonly platform = "instagram" as const;
  private accessToken: string;
  private businessAccountId: string;
  private apiBase = "https://graph.instagram.com/v19.0";

  constructor(config: Config) {
    this.accessToken = config.instagramAccessToken || "";
    this.businessAccountId =
      config.instagramBusinessAccountId || "";
  }

  async validateCredentials(): Promise<boolean> {
    if (!this.accessToken || !this.businessAccountId) return false;
    return verifyProviderCredentials(async () => {
      const data = await graphRequest(`${this.apiBase}/${this.businessAccountId}?fields=id,name,username&access_token=${encodeURIComponent(this.accessToken)}`, {}, 8000);
      try { requiredProviderId(data.id); } catch { throw new Error("Credential verification response unavailable"); }
    }, [this.accessToken]);
  }

  async refreshToken(): Promise<void> {
    if (!this.accessToken) throw new Error("No Instagram access token configured");
    try {
      const appId = process.env.INSTAGRAM_APP_ID;
      const appSecret = process.env.INSTAGRAM_APP_SECRET;
      if (!appId || !appSecret) throw new Error("INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET not set");
      const query = new URLSearchParams({ grant_type: "fb_exchange_token", client_id: appId, client_secret: appSecret, access_token: this.accessToken });
      const data = await graphRequest(`https://graph.instagram.com/oauth/access_token?${query}`, {}, 8000);
      if (typeof data.access_token !== "string" || !data.access_token.trim()) throw new Error("Token refresh response unavailable");
      this.accessToken = data.access_token;
    } catch (err) {
      const failure = providerFailure(err, [this.accessToken, process.env.INSTAGRAM_APP_SECRET || ""], "not_accepted");
      logger.error({ error: failure.error }, "Instagram token refresh failed");
      throw new Error(failure.error);
    }
  }

  getVideoLimits(): PlatformLimits {
    return {
      maxFileSizeMB: 650,
      maxDurationSeconds: 3600,
      maxTitleLength: 0,
      maxDescriptionLength: 2200,
      maxTagCount: 30,
      maxTagLength: 100,
      supportedFormats: ["mp4", "mov"],
      aspectRatios: ["1:1", "4:5", "9:16", "16:9"],
      maxFrameRate: 60,
    };
  }

  getCapabilities(): PlatformCapabilities {
    return {
      supportsScheduling: false,
      supportsReels: true,
      supportsCarousel: false,
      supportsStories: false,
      supportsLive: false,
      supportsThumbnailUpload: false,
      supportsFirstComment: true,
      maxHashtags: 30,
    };
  }

  async uploadVideo(params: PublishParams): Promise<PublishResult> {
    if (!this.accessToken || !this.businessAccountId) return { success: false, deliveryOutcome: "not_accepted", errorCode: "credentials_invalid", error: "Instagram credentials are unavailable" };
    const state = { started: false };
    try {
      const videoUrl = requiredVideoUrl(params.videoUrl);
      const container = await graphRequest(`${this.apiBase}/${this.businessAccountId}/media`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ video_url: videoUrl, caption: this.buildCaption(params), media_type: "REELS", share_to_feed: true, access_token: this.accessToken }) });
      const containerId = requiredProviderId(container.id);
      await this.pollContainerReady(containerId, state);
      state.started = true;
      const published = await graphRequest(`${this.apiBase}/${this.businessAccountId}/media_publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ creation_id: containerId, access_token: this.accessToken }) });
      // Graph media IDs are not Instagram shortcodes; do not fabricate a permalink.
      const result = canonicalPublication(published.id);
      if (result.success) {
        logger.info({ postId: result.externalId }, "Instagram publication acknowledged");
        if (params.firstComment) await this.postComment(result.externalId!, params.firstComment);
      }
      return result;
    } catch (error) {
      const failure = providerFailure(error, [this.accessToken], state.started ? "unknown" : "not_accepted");
      logger.error({ error: failure.error, code: failure.errorCode }, "Instagram upload failed");
      return failure;
    }
  }

  async scheduleVideo(params: PublishParams, publishAt: Date): Promise<PublishResult> {
    void params; void publishAt;
    return unsupportedNativeSchedule("Instagram");
  }

  private async pollContainerReady(containerId: string, state: { started: boolean }): Promise<void> {
    const deadline = Date.now() + 180000;
    for (let attempt = 0; attempt < 36 && Date.now() < deadline; attempt++) {
      let data: Record<string, unknown> | undefined;
      try { data = await graphRequest(`${this.apiBase}/${encodeURIComponent(containerId)}?fields=status_code&access_token=${encodeURIComponent(this.accessToken)}`, {}, Math.max(1, Math.min(10000, deadline - Date.now()))); }
      catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status && status < 500) throw error;
      }
      if (data?.status_code === "FINISHED") return;
      if (data?.status_code === "PUBLISHED") { state.started = true; throw new Error("Container already published; reconciliation is required"); }
      if (data && data.status_code !== "IN_PROGRESS") throw new Error("Media container processing failed or returned an invalid status");
      if (attempt < 35 && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, Math.min(5000, deadline - Date.now())));
    }
    throw new Error("Media container processing timed out before publication");
  }

  private async postComment(mediaId: string, message: string): Promise<void> {
    try { await graphRequest(`${this.apiBase}/${encodeURIComponent(mediaId)}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, access_token: this.accessToken }) }); }
    catch (error) {
      const failure = providerFailure(error, [this.accessToken], "unknown");
      logger.warn({ error: failure.error, code: failure.errorCode }, "Instagram first comment failed; publication remains acknowledged");
    }
  }

  private buildCaption(params: PublishParams): string {
    const parts: string[] = [];
    if (params.title) parts.push(params.title);
    if (params.description) parts.push(`\n${params.description}`);
    if (params.callToAction) parts.push(`\n\n${params.callToAction}`);
    if (params.tags?.length) parts.push(`\n\n${params.tags.slice(0, 30).map((t) => `#${t.replace(/\s+/g, "")}`).join(" ")}`);
    return parts.join("").slice(0, 2200);
  }

  static isConfigured(): boolean {
    return Boolean(process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID);
  }
}
