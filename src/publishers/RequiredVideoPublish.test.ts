import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import fs from "fs-extra";
import { LinkedInPublisher } from "./LinkedInPublisher";
import { XTwitterPublisher } from "./XTwitterPublisher";
import type { PublishParams } from "./PlatformPublisher";
import { logger } from "../logger";
vi.mock("axios", () => ({ default: { post: vi.fn(), put: vi.fn(), get: vi.fn() } }));
vi.mock("fs-extra", () => ({ default: { readFile: vi.fn() } }));
vi.mock("../logger", () => ({ logger: { info: vi.fn(), error: vi.fn() } }));
const params = { videoFilePath: "/tmp/fixture.mp4", title: "Approved title", description: "Approved description", tags: ["story"], category: "News", language: "en" } as PublishParams;
const token = "test-only-provider-secret";
beforeEach(() => { vi.resetAllMocks(); vi.mocked(fs.readFile).mockResolvedValue(Buffer.from("fixture video") as never); });
function publisher(platform: string) { return platform === "x" ? new XTwitterPublisher({ bearerToken: token, apiKey: "test-api-key", apiSecret: "test-api-secret", accessToken: "test-access-token", accessSecret: "test-access-secret" }) : new LinkedInPublisher(token, "urn:li:person:fixture"); }
function registered(platform: string) {
  vi.mocked(axios.post).mockResolvedValueOnce(platform === "x" ? { data: { media_id_string: "media42" } } : { data: { value: { asset: "urn:li:digitalmediaAsset:42", uploadMechanism: { "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": { uploadUrl: "https://upload.example.test/video" } } } } });
  vi.mocked(axios.put).mockResolvedValueOnce({ status: 200 });
}
describe.each(["x", "linkedin"])("%s required-video publication", (platform) => {
  it("requires media upload before posting and returns a canonical external ID", async () => {
    registered(platform); vi.mocked(axios.post).mockResolvedValueOnce({ data: platform === "x" ? { data: { id: "post42" } } : { id: "post42" } });
    expect(await publisher(platform).uploadVideo(params)).toMatchObject({ success: true, externalId: "post42" });
    expect(axios.post).toHaveBeenCalledTimes(2);
    const body = vi.mocked(axios.post).mock.calls[1][1];
    expect(body).toMatchObject(platform === "x" ? { media: { media_ids: ["media42"] } } : { specificContent: { "com.linkedin.ugc.ShareContent": { shareMediaCategory: "VIDEO" } } });
  });
  it("never substitutes a text post when media upload fails", async () => {
    vi.mocked(axios.post).mockRejectedValueOnce(new Error(`socket lost ${token}`));
    expect(await publisher(platform).uploadVideo(params)).toMatchObject({ success: false, deliveryOutcome: "not_accepted" });
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain(token);
  });
  it("rejects a missing media identifier before the public post", async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: {} });
    expect(await publisher(platform).uploadVideo(params)).toMatchObject({ success: false, deliveryOutcome: "not_accepted" });
    expect(axios.post).toHaveBeenCalledTimes(1);
  });
  it("holds a lost public-post response rather than proving rejection", async () => {
    registered(platform); vi.mocked(axios.post).mockRejectedValueOnce(new Error("socket lost after publication"));
    expect(await publisher(platform).uploadVideo(params)).toMatchObject({ success: false, deliveryOutcome: "unknown" });
  });
  it("does not claim success when the post response has no ID", async () => {
    registered(platform); vi.mocked(axios.post).mockResolvedValueOnce({ data: {} });
    expect(await publisher(platform).uploadVideo(params)).toMatchObject({ success: false, deliveryOutcome: "unknown" });
  });
  it("rejects unsupported native scheduling without reading media or calling the provider", async () => {
    expect(await publisher(platform).scheduleVideo(params, new Date(Date.now() + 60000))).toMatchObject({ success: false, deliveryOutcome: "not_accepted", errorCode: "payload_rejected" });
    expect(fs.readFile).not.toHaveBeenCalled(); expect(axios.post).not.toHaveBeenCalled();
  });
  it("distinguishes denied credentials from transient validation failure", async () => {
    vi.mocked(axios.get).mockRejectedValueOnce({ response: { status: 401 } });
    expect(await publisher(platform).validateCredentials()).toBe(false);
    vi.mocked(axios.get).mockRejectedValueOnce(new Error(`network timeout ${token}`));
    await expect(publisher(platform).validateCredentials()).rejects.toMatchObject({ code: "provider_unavailable" });
  });
});
