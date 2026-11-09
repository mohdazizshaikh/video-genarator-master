/**
 * FacebookPublisher – Conservative Facebook publication adapter
 * Regular video/Reel acknowledgement; live platform acceptance is separate.
 */
import type { Config } from "../config";
import type {
  PlatformPublisher,
  PlatformLimits,
  PlatformCapabilities,
  PublishParams,
  PublishResult,
} from "./PlatformPublisher";
import { logger } from "../logger";
import fs from "fs-extra";
import { graphRequest, requiredProviderId, requiredVideoUrl } from "./graphTransport";
import { canonicalPublication, providerFailure, verifyProviderCredentials } from "./providerContracts";

export class FacebookPublisher implements PlatformPublisher {
  readonly platform = "facebook" as const;
  private pageAccessToken: string;
  private pageId: string;
  private apiBase = "https://graph.facebook.com/v19.0";

  constructor(config: Config) {
    this.pageAccessToken = config.facebookAccessToken || "";
    this.pageId = config.facebookPageId || "";
  }

  async validateCredentials(): Promise<boolean> {
    if (!this.pageAccessToken || !this.pageId) return false;
    return verifyProviderCredentials(async () => {
      const data = await graphRequest(`${this.apiBase}/${this.pageId}?fields=id,name&access_token=${encodeURIComponent(this.pageAccessToken)}`, {}, 8000);
      try { requiredProviderId(data.id); } catch { throw new Error("Credential verification response unavailable"); }
    }, [this.pageAccessToken]);
  }

  async refreshToken(): Promise<void> {
    if (!this.pageAccessToken) throw new Error("No Facebook page access token configured");
    try {
      const appId = process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      if (!appId || !appSecret) throw new Error("FACEBOOK_APP_ID / FACEBOOK_APP_SECRET not set");
      const query = new URLSearchParams({ grant_type: "fb_exchange_token", client_id: appId, client_secret: appSecret, access_token: this.pageAccessToken });
      const data = await graphRequest(`${this.apiBase}/oauth/access_token?${query}`, {}, 8000);
      if (typeof data.access_token !== "string" || !data.access_token.trim()) throw new Error("Token refresh response unavailable");
      this.pageAccessToken = data.access_token;
    } catch (err) {
      const failure = providerFailure(err, [this.pageAccessToken, process.env.FACEBOOK_APP_SECRET || ""], "not_accepted");
      logger.error({ error: failure.error }, "Facebook token refresh failed");
      throw new Error(failure.error);
    }
  }

  getVideoLimits(): PlatformLimits {
    return {
      maxFileSizeMB: 10 * 1024,
      maxDurationSeconds: 4 * 3600,
      maxTitleLength: 255,
      maxDescriptionLength: 63206,
      maxTagCount: 0,
      maxTagLength: 0,
      supportedFormats: ["mp4", "mov", "avi", "mkv"],
      aspectRatios: ["16:9", "9:16", "1:1", "4:5"],
      maxFrameRate: 60,
    };
  }

  getCapabilities(): PlatformCapabilities {
    return {
      supportsScheduling: true,
      supportsReels: true,
      supportsCarousel: false,
      supportsStories: false,
      supportsLive: false,
      supportsThumbnailUpload: false,
      supportsFirstComment: false,
      maxHashtags: 30,
    };
  }

  async uploadVideo(params: PublishParams): Promise<PublishResult> {
    if (!this.pageAccessToken || !this.pageId) return { success: false, deliveryOutcome: "not_accepted", errorCode: "credentials_invalid", error: "Facebook credentials are unavailable" };
    const state = { started: false };
    try {
      return await (params.aspectRatio === "9:16" ? this.uploadReel(params, state) : this.uploadRegularVideo(params, state));
    } catch (error) {
      const failure = providerFailure(error, [this.pageAccessToken], state.started ? "unknown" : "not_accepted");
      logger.error({ error: failure.error, code: failure.errorCode }, "Facebook upload failed");
      return failure;
    }
  }

  private post(url: string, body: Record<string, unknown>) {
    return graphRequest(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  }

  private async uploadRegularVideo(params: PublishParams, state: { started: boolean }): Promise<PublishResult> {
    if (!params.videoUrl) return this.resumableUpload(params, state);
    const fileUrl = requiredVideoUrl(params.videoUrl);
    state.started = true;
    const data = await this.post(`${this.apiBase}/${this.pageId}/videos`, { file_url: fileUrl, description: this.buildDescription(params), title: params.title?.slice(0, 255), access_token: this.pageAccessToken });
    return canonicalPublication(data.id, (id) => `https://www.facebook.com/video/${encodeURIComponent(id)}`);
  }

  private async uploadReel(params: PublishParams, state: { started: boolean }): Promise<PublishResult> {
    const fileUrl = params.videoUrl ? requiredVideoUrl(params.videoUrl) : undefined;
    const file = fileUrl ? undefined : await fs.readFile(params.videoFilePath);
    if (file && !file.length) throw new Error("Invalid empty video file");
    const initialized = await this.post(`${this.apiBase}/${this.pageId}/video_reels`, { upload_phase: "start", access_token: this.pageAccessToken });
    const videoId = requiredProviderId(initialized.video_id);
    if (file) {
      const upload = new URL(typeof initialized.upload_url === "string" ? initialized.upload_url : "");
      if (upload.protocol !== "https:" || upload.username || upload.password || upload.port || !(upload.hostname === "facebook.com" || upload.hostname.endsWith(".facebook.com"))) throw new Error("Invalid Facebook upload endpoint");
      const transferred = await graphRequest(upload.href, { method: "POST", headers: { Authorization: `OAuth ${this.pageAccessToken}`, "Content-Type": "video/mp4", offset: "0", file_size: String(file.length) }, body: file });
      if (transferred.success !== true) throw new Error("Video transfer was not acknowledged");
    }
    state.started = true;
    const finished = await this.post(`${this.apiBase}/${this.pageId}/video_reels`, { upload_phase: "finish", video_id: videoId, description: this.buildDescription(params), access_token: this.pageAccessToken, published: true, ...(fileUrl ? { file_url: fileUrl } : {}) });
    if (finished.success !== true) throw new Error("Reel publication was not acknowledged");
    return canonicalPublication(videoId, (id) => `https://www.facebook.com/reel/${encodeURIComponent(id)}`);
  }

  private async resumableUpload(params: PublishParams, state: { started: boolean }): Promise<PublishResult> {
    const file = await fs.readFile(params.videoFilePath);
    if (!file.length) throw new Error("Invalid empty video file");
    const endpoint = `https://graph-video.facebook.com/v19.0/${this.pageId}/videos`;
    const initialized = await this.post(endpoint, { upload_phase: "start", file_size: file.length, access_token: this.pageAccessToken });
    const sessionId = requiredProviderId(initialized.upload_session_id);
    const offset = (value: unknown) => {
      if ((typeof value !== "string" && typeof value !== "number") || !/^\d+$/.test(String(value))) throw new Error("Invalid video transfer offset");
      const number = Number(value);
      if (!Number.isSafeInteger(number) || number < 0 || number > file.length) throw new Error("Invalid video transfer offset");
      return number;
    };
    let start = offset(initialized.start_offset), end = offset(initialized.end_offset);
    if (start !== 0) throw new Error("Invalid initial video transfer offset");
    const deadline = Date.now() + 300000;
    let transfers = 0;
    while (start < file.length) {
      if (end <= start || ++transfers > 10000 || Date.now() >= deadline) throw new Error("Video transfer did not make bounded progress");
      const form = new FormData();
      form.append("upload_phase", "transfer"); form.append("upload_session_id", sessionId); form.append("start_offset", String(start));
      form.append("video_file_chunk", new Blob([file.subarray(start, end)], { type: "video/mp4" }));
      const transferred = await graphRequest(endpoint, { method: "POST", headers: { Authorization: `OAuth ${this.pageAccessToken}` }, body: form }, Math.min(30000, deadline - Date.now()));
      const next = offset(transferred.start_offset), nextEnd = offset(transferred.end_offset);
      if (next !== end || next <= start || nextEnd < next) throw new Error("Invalid video transfer acknowledgement");
      start = next; end = nextEnd;
    }
    const finish = new FormData();
    finish.append("upload_phase", "finish"); finish.append("upload_session_id", sessionId); finish.append("access_token", this.pageAccessToken);
    finish.append("description", this.buildDescription(params)); finish.append("title", params.title?.slice(0, 255) || "");
    state.started = true;
    const finished = await graphRequest(endpoint, { method: "POST", body: finish });
    if (finished.success !== true) throw new Error("Video publication was not acknowledged");
    // A session identifier is never a publication receipt.
    return canonicalPublication(finished.video_id || initialized.video_id, (id) => `https://www.facebook.com/video/${encodeURIComponent(id)}`);
  }

  async scheduleVideo(params: PublishParams, publishAt: Date): Promise<PublishResult> {
    const state = { started: false };
    try {
      if (!this.pageAccessToken || !this.pageId) throw new Error("Facebook credentials are unavailable");
      if (!Number.isFinite(publishAt.getTime()) || publishAt.getTime() - Date.now() < 600000) throw new Error("Invalid Facebook schedule: use a future date at least ten minutes away");
      const fileUrl = requiredVideoUrl(params.videoUrl);
      state.started = true;
      const data = await this.post(`${this.apiBase}/${this.pageId}/videos`, { file_url: fileUrl, title: params.title?.slice(0, 255), description: this.buildDescription(params), published: false, scheduled_publish_time: Math.floor(publishAt.getTime() / 1000), access_token: this.pageAccessToken });
      const result = canonicalPublication(data.id);
      return result.success ? { ...result, scheduledFor: publishAt.toISOString() } : result;
    } catch (error) { return providerFailure(error, [this.pageAccessToken], state.started ? "unknown" : "not_accepted"); }
  }

  private buildDescription(params: PublishParams): string {
    const parts: string[] = [];
    if (params.description) parts.push(params.description);
    if (params.callToAction) parts.push(`\n\n${params.callToAction}`);
    if (params.tags?.length) parts.push(`\n\n${params.tags.slice(0, 30).map((t) => `#${t.replace(/\s+/g, "")}`).join(" ")}`);
    return parts.join("").slice(0, 63206);
  }

  static isConfigured(): boolean {
    return Boolean(process.env.FACEBOOK_PAGE_ACCESS_TOKEN && process.env.FACEBOOK_PAGE_ID);
  }
}
