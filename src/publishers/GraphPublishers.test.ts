import fs from "fs-extra";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FacebookPublisher } from "./FacebookPublisher";
import { createPublisherForAccount } from "./PublisherFactory";
import { InstagramPublisher } from "./InstagramPublisher";
import type { PublishParams } from "./PlatformPublisher";
import { logger } from "../logger";
vi.mock("fs-extra", () => ({ default: { readFile: vi.fn() } }));
vi.mock("../logger", () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));
const network = vi.fn();
const token = "test-only-graph-token";
const params = { videoFilePath: "/tmp/fixture.mp4", title: "Approved story", description: "Approved description", tags: [], category: "News", language: "en" } as PublishParams;
const remote = { ...params, videoUrl: "https://media.example.test/video.mp4" };
const facebook = () => new FacebookPublisher({ facebookAccessToken: token, facebookPageId: "page42" } as never);
const instagram = () => new InstagramPublisher({ instagramAccessToken: token, instagramBusinessAccountId: "account42" } as never);
function reply(data: unknown, status = 200) { network.mockResolvedValueOnce(new Response(JSON.stringify(data), { status })); }
function container(status = "FINISHED") { reply({ id: "container42" }); reply({ status_code: status }); }
function resumable(id?: string) { reply({ upload_session_id: "session-only", video_id: id, start_offset: "0", end_offset: "4" }); reply({ start_offset: "4", end_offset: "4" }); }
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal("fetch", network); vi.mocked(fs.readFile).mockResolvedValue(Buffer.from("data") as never); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });
describe("Facebook transfer/publication boundaries", () => {
  it("returns the real video ID after all bytes are acknowledged and leaves multipart boundaries to FormData", async () => {
    resumable("video42"); reply({ success: true });
    expect(await facebook().uploadVideo(params)).toMatchObject({ success: true, externalId: "video42" });
    expect(network).toHaveBeenCalledTimes(3);
    expect(network.mock.calls[1][1].headers).not.toHaveProperty("Content-Type");
    expect(network.mock.calls[1][1].body.get("upload_phase")).toBe("transfer");
  });
  it("never substitutes the upload-session ID for a missing video ID", async () => {
    resumable(); reply({ success: true });
    expect(await facebook().uploadVideo(params)).toMatchObject({ success: false, deliveryOutcome: "unknown" });
  });
  it.each([{ start_offset: "NaN", end_offset: "4" }, { start_offset: "0", end_offset: "0" }, { start_offset: "1", end_offset: "4" }])("rejects malformed initial offsets without finishing: %j", async (offsets) => {
    reply({ upload_session_id: "session42", ...offsets });
    expect(await facebook().uploadVideo(params)).toMatchObject({ success: false, deliveryOutcome: "not_accepted" });
    expect(network).toHaveBeenCalledOnce();
  });
  it("stops on failed chunk transfer and redacts errors instead of finishing", async () => {
    reply({ upload_session_id: "session42", start_offset: "0", end_offset: "4" }); reply({ error: { message: `upload failed ${token}` } }, 500);
    const result = await facebook().uploadVideo(params);
    expect(result).toMatchObject({ success: false, deliveryOutcome: "not_accepted" }); expect(network).toHaveBeenCalledTimes(2);
    expect(JSON.stringify([result, vi.mocked(logger.error).mock.calls])).not.toContain(token);
  });
  it("rejects nonprogressing acknowledgements without looping or finishing", async () => {
    reply({ upload_session_id: "session42", start_offset: "0", end_offset: "4" }); reply({ start_offset: "0", end_offset: "4" });
    expect(await facebook().uploadVideo(params)).toMatchObject({ success: false, deliveryOutcome: "not_accepted" }); expect(network).toHaveBeenCalledTimes(2);
  });
  it("does not finish a Reel when file transfer fails", async () => {
    reply({ video_id: "reel42", upload_url: "https://rupload.facebook.com/video42" }); reply({ error: { message: "transfer failed" } }, 500);
    expect(await facebook().uploadVideo({ ...params, aspectRatio: "9:16" })).toMatchObject({ success: false, deliveryOutcome: "not_accepted" }); expect(network).toHaveBeenCalledTimes(2);
  });
  it("does not send credentials or video bytes to an arbitrary upload URL", async () => {
    reply({ video_id: "reel42", upload_url: "https://attacker.example/upload" });
    expect(await facebook().uploadVideo({ ...params, aspectRatio: "9:16" })).toMatchObject({ success: false, deliveryOutcome: "not_accepted" }); expect(network).toHaveBeenCalledOnce();
  });
  it("requires both transfer and finish acknowledgements for Reel success", async () => {
    reply({ video_id: "reel42", upload_url: "https://rupload.facebook.com/video42" }); reply({ success: true }); reply({ success: false });
    expect(await facebook().uploadVideo({ ...params, aspectRatio: "9:16" })).toMatchObject({ success: false, deliveryOutcome: "unknown" });
  });
  it("returns the Reel ID only after acknowledged finish", async () => {
    reply({ video_id: "reel42", upload_url: "https://rupload.facebook.com/video42" }); reply({ success: true }); reply({ success: true });
    expect(await facebook().uploadVideo({ ...params, aspectRatio: "9:16" })).toMatchObject({ success: true, externalId: "reel42" });
  });
  it("holds an uncertain URL-publication response and never treats it as proven rejection", async () => {
    network.mockRejectedValueOnce(new Error("lost response"));
    expect(await facebook().uploadVideo(remote)).toMatchObject({ success: false, deliveryOutcome: "unknown" });
  });
  it("rejects local-path scheduling and invalid dates before provider dispatch", async () => {
    expect(await facebook().scheduleVideo(params, new Date(Date.now() + 3600000))).toMatchObject({ success: false, deliveryOutcome: "not_accepted" });
    expect(await facebook().scheduleVideo(remote, new Date("invalid"))).toMatchObject({ success: false, deliveryOutcome: "not_accepted" }); expect(network).not.toHaveBeenCalled();
  });
});
describe("Instagram container/publication boundaries", () => {
  it("rejects local filesystem paths instead of passing them as provider URLs", async () => {
    expect(await instagram().uploadVideo(params)).toMatchObject({ success: false, deliveryOutcome: "not_accepted" }); expect(network).not.toHaveBeenCalled();
  });
  it("returns a canonical media ID without fabricating an Instagram shortcode link", async () => {
    container(); reply({ id: "media42" });
    const result = await instagram().uploadVideo(remote);
    expect(result).toMatchObject({ success: true, externalId: "media42" }); expect(result.publishedUrl).toBeUndefined();
  });
  it("rejects a missing container ID before polling or publication", async () => {
    reply({}); expect(await instagram().uploadVideo(remote)).toMatchObject({ success: false, deliveryOutcome: "not_accepted" }); expect(network).toHaveBeenCalledOnce();
  });
  it("stops on terminal processing failure without publishing", async () => {
    container("ERROR"); expect(await instagram().uploadVideo(remote)).toMatchObject({ success: false, deliveryOutcome: "not_accepted" }); expect(network).toHaveBeenCalledTimes(2);
  });
  it("holds an already-published container rather than attempting to publish it again", async () => {
    container("PUBLISHED"); expect(await instagram().uploadVideo(remote)).toMatchObject({ success: false, deliveryOutcome: "unknown" }); expect(network).toHaveBeenCalledTimes(2);
  });
  it("bounds processing polling without ever calling media_publish on timeout", async () => {
    vi.useFakeTimers(); reply({ id: "container42" }); network.mockImplementation(async () => new Response(JSON.stringify({ status_code: "IN_PROGRESS" })));
    const pending = instagram().uploadVideo(remote); await vi.runAllTimersAsync();
    expect(await pending).toMatchObject({ success: false, deliveryOutcome: "not_accepted" }); expect(network).toHaveBeenCalledTimes(37);
    expect(network.mock.calls.some(([url]) => String(url).includes("media_publish"))).toBe(false);
  });
  it("does not claim publication success for a missing final media ID", async () => {
    container(); reply({}); expect(await instagram().uploadVideo(remote)).toMatchObject({ success: false, deliveryOutcome: "unknown" });
  });
  it("keeps an acknowledged publication when an optional comment fails, with redacted logging", async () => {
    container(); reply({ id: "media42" }); reply({ error: { message: `comment failed ${token}` } }, 500);
    expect(await instagram().uploadVideo({ ...remote, firstComment: "A comment" })).toMatchObject({ success: true, externalId: "media42" });
    expect(JSON.stringify(vi.mocked(logger.warn).mock.calls)).not.toContain(token);
  });
  it("rejects native scheduling without claiming a container is a scheduled publication", async () => {
    expect(await instagram().scheduleVideo(remote, new Date(Date.now() + 3600000))).toMatchObject({ success: false, deliveryOutcome: "not_accepted" }); expect(network).not.toHaveBeenCalled(); expect(instagram().getCapabilities().supportsScheduling).toBe(false);
  });
});
describe.each([facebook, instagram])("Graph credential verification", (factory) => {
  it("separates authentication denial, transient failure and malformed success responses", async () => {
    reply({ error: { message: "denied" } }, 401); expect(await factory().validateCredentials()).toBe(false);
    reply({ error: { message: "unavailable" } }, 503); await expect(factory().validateCredentials()).rejects.toMatchObject({ code: "provider_unavailable" });
    reply({}); await expect(factory().validateCredentials()).rejects.toMatchObject({ code: "provider_unavailable" });
  });
});

it.each(["facebook", "instagram"])("%s does not inherit global credentials when account configuration is empty", async (platform) => {
  for (const name of ["FACEBOOK_PAGE_ACCESS_TOKEN", "FACEBOOK_ACCESS_TOKEN", "INSTAGRAM_ACCESS_TOKEN"]) vi.stubEnv(name, "global-provider-token");
  vi.stubEnv("FACEBOOK_PAGE_ID", "global-page"); vi.stubEnv("INSTAGRAM_BUSINESS_ACCOUNT_ID", "global-account");
  const adapter = createPublisherForAccount(platform as "facebook" | "instagram", { allowGlobalProviderCredentialFallback: false, facebookAccessToken: "global-config-token", facebookPageId: "global-config-page", instagramAccessToken: "global-config-token", instagramBusinessAccountId: "global-config-account" } as never, {});
  expect(await adapter.validateCredentials()).toBe(false);
  expect(await adapter.uploadVideo(remote)).toMatchObject({ success: false, deliveryOutcome: "not_accepted", errorCode: "credentials_invalid" });
  expect(network).not.toHaveBeenCalled();
});
it.each(["facebook", "instagram"])("%s rejects a token-refresh response without a token and redacts refresh failures", async (platform) => {
  const prefix = platform.toUpperCase(); vi.stubEnv(`${prefix}_APP_ID`, "test-app"); vi.stubEnv(`${prefix}_APP_SECRET`, "test-app-secret");
  const adapter = platform === "facebook" ? facebook() : instagram();
  reply({}); await expect(adapter.refreshToken()).rejects.toThrow("unavailable");
  reply({ error: { message: `refresh failed ${token} test-app-secret` } }, 500);
  await expect(adapter.refreshToken()).rejects.toThrow("[redacted]");
  expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain(token);
  expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain("test-app-secret");
});
