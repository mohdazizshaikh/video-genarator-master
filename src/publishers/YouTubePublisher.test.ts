import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ insert: vi.fn() }));

vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: class {
        setCredentials(): void {}
        async refreshAccessToken(): Promise<{ credentials: { access_token: string } }> {
          return { credentials: { access_token: "mock-access-token" } };
        }
      },
    },
    youtube: vi.fn(() => ({ videos: { insert: mocks.insert } })),
  },
}));
vi.mock("node:fs", () => ({
  default: { createReadStream: vi.fn(() => "mock-video-stream") },
  createReadStream: vi.fn(() => "mock-video-stream"),
}));

import { YouTubePublisher } from "./YouTubePublisher";

const baseParams = {
  videoFilePath: "/tmp/video.mp4",
  title: "Classification test",
  description: "Classification test",
  tags: [],
  category: "Technology",
  language: "en" as const,
};

function publisher() {
  return new YouTubePublisher({
    youtubeClientId: "test-client-id",
    youtubeClientSecret: "test-client-secret",
    youtubeRefreshToken: "1//refresh-token-value",
  } as never);
}

describe("YouTubePublisher failure classification", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the video id and watch url on success", async () => {
    mocks.insert.mockResolvedValueOnce({ data: { id: "vid123" } });
    const result = await publisher().uploadVideo(baseParams as never);
    expect(result).toMatchObject({ success: true, externalId: "vid123", publishedUrl: "https://www.youtube.com/watch?v=vid123" });
  });

  it("classifies quota errors as rate limits", async () => {
    mocks.insert.mockRejectedValueOnce(
      Object.assign(new Error("Quota exceeded"), {
        response: { status: 403, data: { error: { message: "The request cannot be completed because you have exceeded your quota.", errors: [{ reason: "quotaExceeded" }] } } },
      }),
    );
    const result = await publisher().uploadVideo(baseParams as never);
    expect(result).toMatchObject({ success: false, errorCode: "rate_limited" });
  });

  it("classifies authentication failures as invalid credentials", async () => {
    mocks.insert.mockRejectedValueOnce(
      Object.assign(new Error("Request failed with status code 401"), {
        response: { status: 401, data: { error: { message: "Invalid Credentials", errors: [{ reason: "authError" }] } } },
      }),
    );
    const result = await publisher().uploadVideo(baseParams as never);
    expect(result).toMatchObject({ success: false, errorCode: "credentials_invalid" });
  });

  it("redacts the refresh token if it leaks into a provider message", async () => {
    mocks.insert.mockRejectedValueOnce(new Error("token 1//refresh-token-value rejected"));
    const result = await publisher().uploadVideo(baseParams as never);
    expect(result.success).toBe(false);
    expect(result.error).not.toContain("1//refresh-token-value");
    expect(result.error).toContain("[redacted]");
  });
});

it("holds an upload response without a canonical video ID", async () => {
  mocks.insert.mockResolvedValueOnce({ data: {} });
  expect(await publisher().uploadVideo(baseParams as never)).toMatchObject({ success: false, deliveryOutcome: "unknown" });
});
it("separates transient token verification failure from invalid access", async () => {
  const adapter = publisher();
  vi.spyOn(adapter, "refreshToken").mockRejectedValueOnce({ response: { status: 401 } }).mockRejectedValueOnce(new Error("network timeout"));
  expect(await adapter.validateCredentials()).toBe(false);
  await expect(adapter.validateCredentials()).rejects.toMatchObject({ code: "provider_unavailable" });
});
it("reports no publication dispatch when token refresh fails before insert", async () => {
  const adapter = publisher(); mocks.insert.mockClear();
  vi.spyOn(adapter, "refreshToken").mockRejectedValueOnce(new Error("token endpoint unavailable"));
  expect(await adapter.uploadVideo(baseParams as never)).toMatchObject({ success: false, deliveryOutcome: "not_accepted" });
  expect(mocks.insert).not.toHaveBeenCalled();
});
