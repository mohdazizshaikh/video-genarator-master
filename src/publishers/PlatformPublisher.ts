/**
 * PlatformPublisher – Enhanced interface with all advanced fields
 */
import type { PlatformType } from "../types/shorts";
import type { PublishFailureCode } from "./failureClassification";

export interface PublishParams {
  videoFilePath: string;
  videoUrl?: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  language: string;
  thumbnailPath?: string;
  thumbnailUrl?: string;
  scheduleAt?: Date;
  callToAction?: string;
  aspectRatio?: string;
  visibility?: "public" | "private" | "unlisted";
  location?: string;
  firstComment?: string;
}

export interface PublishResult {
  /** Only a confirmed provider rejection permits automatic upload retry. */
  deliveryOutcome?: "not_accepted" | "unknown";
  success: boolean;
  externalId?: string;
  platformVideoId?: string;
  publishedUrl?: string;
  scheduledFor?: string;
  error?: string;
  rateLimitResetAt?: Date;
  credentialsValid?: boolean;
  /** Normalized failure classification (P1-03); set when success is false. */
  errorCode?: PublishFailureCode;
  /** Provider-advertised seconds to wait before retrying (rate limits). */
  retryAfterSeconds?: number;
}

export interface PlatformLimits {
  maxFileSizeMB: number;
  maxDurationSeconds: number;
  maxTitleLength: number;
  maxDescriptionLength: number;
  maxTagCount: number;
  maxTagLength: number;
  supportedFormats: string[];
  aspectRatios?: string[];
  maxFrameRate?: number;
}

export interface PlatformCapabilities {
  supportsScheduling: boolean;
  supportsReels: boolean;
  supportsCarousel: boolean;
  supportsStories: boolean;
  supportsLive: boolean;
  supportsThumbnailUpload: boolean;
  supportsFirstComment: boolean;
  maxHashtags: number;
}

export interface PlatformPublisher {
  platform: PlatformType;
  uploadVideo(params: PublishParams): Promise<PublishResult>;
  scheduleVideo(params: PublishParams, publishAt: Date): Promise<PublishResult>;
  refreshToken(): Promise<void>;
  validateCredentials(): Promise<boolean>;
  getVideoLimits(): PlatformLimits;
  getCapabilities?(): PlatformCapabilities;
}
