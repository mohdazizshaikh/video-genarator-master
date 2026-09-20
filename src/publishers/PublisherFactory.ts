/**
 * PublisherFactory – Phase 5.2
 *
 * Instantiates the right PlatformPublisher implementation for a given platform.
 */
import type { Config } from "../config";
import type { PlatformType } from "../types/shorts";
import type { PlatformPublisher } from "./PlatformPublisher";

type PublisherConfig = Config & {
  linkedinAccessToken?: string;
  linkedinPersonUrn?: string;
  xBearerToken?: string;
  xApiKey?: string;
  xApiSecret?: string;
  xAccessToken?: string;
  xAccessSecret?: string;
};
import { YouTubePublisher } from "./YouTubePublisher";
import { TelegramPublisher } from "./TelegramPublisher";
import { InstagramPublisher } from "./InstagramPublisher";
import { FacebookPublisher } from "./FacebookPublisher";
import { LinkedInPublisher } from "./LinkedInPublisher";
import { XTwitterPublisher } from "./XTwitterPublisher";

export function createPublisher(platform: PlatformType, config: Config): PlatformPublisher {
  const publisherConfig = config as PublisherConfig;
  switch (platform) {
    case "youtube":
      return new YouTubePublisher(config);
    case "telegram":
      return new TelegramPublisher(config);
    case "instagram":
      return new InstagramPublisher(config);
    case "facebook":
      return new FacebookPublisher(config);
    case "linkedin":
      return new LinkedInPublisher(
        publisherConfig.linkedinAccessToken || "",
        publisherConfig.linkedinPersonUrn || "",
      );
    case "x":
      return new XTwitterPublisher({
        bearerToken: publisherConfig.xBearerToken || "",
        apiKey: publisherConfig.xApiKey || "",
        apiSecret: publisherConfig.xApiSecret || "",
        accessToken: publisherConfig.xAccessToken || "",
        accessSecret: publisherConfig.xAccessSecret || "",
      });
    default: {
      const _exhaustive: never = platform;
      throw new Error(`Unknown platform: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Maps per-account credential keys (as stored on ProfileAccountCredentials) to
 * the Config field names each publisher reads them from.
 */
const ACCOUNT_CREDENTIAL_TO_CONFIG: Record<PlatformType, Record<string, string>> = {
  youtube: {
    clientId: "youtubeClientId",
    clientSecret: "youtubeClientSecret",
    refreshToken: "youtubeRefreshToken",
  },
  telegram: {
    botToken: "telegramBotToken",
    channelId: "telegramChannelId",
  },
  instagram: {
    accessToken: "instagramAccessToken",
    businessAccountId: "instagramBusinessAccountId",
  },
  facebook: {
    accessToken: "facebookAccessToken",
    pageId: "facebookPageId",
  },
  linkedin: {
    accessToken: "linkedinAccessToken",
    personUrn: "linkedinPersonUrn",
  },
  x: {
    bearerToken: "xBearerToken",
    apiKey: "xApiKey",
    apiSecret: "xApiSecret",
    accessToken: "xAccessToken",
    accessSecret: "xAccessSecret",
  },
};

/**
 * Builds a publisher for a specific account. Account credentials are the
 * production authority. Global configuration is inherited only when the
 * explicit local compatibility flag is enabled; otherwise missing credentials
 * remain absent and the provider fails closed.
 */
export function createPublisherForAccount(
  platform: PlatformType,
  config: Config,
  credentials: Record<string, string>,
): PlatformPublisher {
  const mapping = ACCOUNT_CREDENTIAL_TO_CONFIG[platform];
  if (!mapping) {
    throw new Error(`No account credential mapping for platform: ${platform}`);
  }
  const overlay: Record<string, string> = {};
  for (const [credentialKey, configKey] of Object.entries(mapping)) {
    if (credentials[credentialKey]) overlay[configKey] = credentials[credentialKey];
  }
  const merged = config.allowGlobalProviderCredentialFallback
    ? Object.assign(Object.create(config), overlay)
    : Object.assign(Object.create(null), overlay);
  return createPublisher(platform, merged as Config);
}
