import axios from "axios";
import fs from "fs-extra";
import { logger } from "../logger";
import { canonicalPublication, providerFailure, verifyProviderCredentials, unsupportedNativeSchedule } from "./providerContracts";
import { getPlatformLimits } from "./PlatformLimits";
import type { PlatformPublisher, PublishParams, PublishResult, PlatformLimits } from "./PlatformPublisher";

export class LinkedInPublisher implements PlatformPublisher {
  platform = "linkedin" as const;
  private accessToken: string;
  private personUrn: string;

  constructor(accessToken: string, personUrn: string = "") {
    this.accessToken = accessToken;
    this.personUrn = personUrn;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    };
  }

  private async registerAndUpload(params: PublishParams): Promise<string> {
    const regRes = await axios.post(
      "https://api.linkedin.com/v2/assets?action=registerUpload",
      {
        registerUploadRequest: {
          owner: this.personUrn,
          recipes: ["urn:li:digitalmediaRecipe:feedshare-video"],
          serviceRelationships: [{ identifier: "urn:li:userGeneratedContent", relationshipType: "OWNER" }],
          supportedUploadMechanism: ["MULTIPART_UPLOAD"],
        },
      },
      { headers: this.headers, timeout: 30000 },
    );

    const uploadUrl = regRes.data.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
    const asset = regRes.data.value?.asset;
    if (typeof uploadUrl !== "string" || typeof asset !== "string" || !asset.trim()) throw new Error("LinkedIn: Failed to register upload");

    const fileBuffer = await fs.readFile(params.videoFilePath);
    await axios.put(uploadUrl, fileBuffer, { headers: { "Content-Type": "video/mp4" }, maxBodyLength: Infinity, timeout: 90000 });
    return asset;
  }

  async uploadVideo(params: PublishParams): Promise<PublishResult> {
    let publicationStarted = false;
    try {
      const asset = await this.registerAndUpload(params);
      publicationStarted = true;
      const postRes = await axios.post(
        "https://api.linkedin.com/v2/ugcPosts",
        {
          author: this.personUrn,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: `${params.title}\n\n${params.description}` },
              shareMediaCategory: "VIDEO",
              media: [{
                status: "READY",
                description: { text: params.description.substring(0, 200) },
                media: asset,
                title: { text: params.title },
              }],
            },
          },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        },
        { headers: this.headers, timeout: 30000 },
      );
      const postId = postRes.data?.id;
      const result = canonicalPublication(postId, (id) => `https://linkedin.com/feed/update/${encodeURIComponent(id)}`);
      if (result.success) logger.info({ postId }, "LinkedIn video published");
      return result;
    } catch (err: unknown) {
      const failure = providerFailure(err, [this.accessToken], publicationStarted ? "unknown" : "not_accepted");
      logger.error({ error: failure.error, code: failure.errorCode }, "LinkedIn publish failed");
      return failure;
    }
  }

  async scheduleVideo(params: PublishParams, publishAt: Date): Promise<PublishResult> {
    void params; void publishAt;
    return unsupportedNativeSchedule("LinkedIn");
  }

  async refreshToken(): Promise<void> {
    logger.info("LinkedIn token refresh not implemented — use OAuth flow");
  }

  async validateCredentials(): Promise<boolean> {
    if (!this.accessToken) return false;
    return verifyProviderCredentials(() => axios.get("https://api.linkedin.com/v2/me", { headers: this.headers, timeout: 5000 }), [this.accessToken]);
  }

  getVideoLimits(): PlatformLimits {
    return getPlatformLimits("linkedin");
  }

  static isConfigured(config: { linkedinAccessToken?: string }): boolean {
    return Boolean(config.linkedinAccessToken);
  }
}
