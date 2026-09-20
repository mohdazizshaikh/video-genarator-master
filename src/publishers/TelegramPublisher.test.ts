/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import fs from "node:fs";
import FormData from "form-data";
import { TelegramPublisher } from "./TelegramPublisher";

type TestForm = { append: ReturnType<typeof vi.fn>; getHeaders: ReturnType<typeof vi.fn> };
vi.mock("axios", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("node:fs", () => ({ default: { createReadStream: vi.fn(() => "mock-video-stream") }, createReadStream: vi.fn(() => "mock-video-stream") }));
vi.mock("form-data", () => ({ default: vi.fn().mockImplementation(() => ({ append: vi.fn(), getHeaders: vi.fn(() => ({ "content-type": "multipart/form-data" })) })) }));
const mockedAxios = vi.mocked(axios, true);
const mockedFs = vi.mocked(fs, true);
const mockedFormData = vi.mocked(FormData, true);
function publisher(botToken = "test-bot-token", chatId = "-100verified-destination") { return new TelegramPublisher({ telegramBotToken: botToken, telegramChannelId: chatId } as any); }
describe("TelegramPublisher", () => {
  beforeEach(() => vi.clearAllMocks());
  it("validates the bot with getMe and requires a destination", async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { ok: true, result: { username: "test_bot" } } });
    expect(await publisher().validateCredentials()).toBe(true);
    expect(mockedAxios.get).toHaveBeenCalledWith("https://api.telegram.org/bottest-bot-token/getMe", { timeout: 10000 });
    expect(await publisher("test-bot-token", "").validateCredentials()).toBe(false);
  });
  it("sends video to the connector-bound destination and returns the message id", async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { ok: true, result: { message_id: 42 } } });
    const result = await publisher().uploadVideo({ videoFilePath: "/tmp/video.mp4", title: "Aaditech campaign", description: "Verified destination test", tags: [], category: "Technology", language: "en" as any });
    const form = mockedFormData.mock.results[0]?.value as TestForm;
    expect(form.append).toHaveBeenCalledWith("chat_id", "-100verified-destination");
    expect(mockedFs.createReadStream).toHaveBeenCalledWith("/tmp/video.mp4");
    expect(mockedAxios.post).toHaveBeenCalledWith("https://api.telegram.org/bottest-bot-token/sendVideo", form, expect.objectContaining({ timeout: 5 * 60 * 1000 }));
    expect(result).toMatchObject({ success: true, externalId: "42" });
  });
  it("redacts the bot token from provider failures", async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error("provider rejected token test-bot-token"));
    const result = await publisher().uploadVideo({ videoFilePath: "/tmp/video.mp4", title: "Failure test", description: "Redaction test", tags: [], category: "Technology", language: "en" as any });
    expect(result.success).toBe(false);
    expect(result.error).not.toContain("test-bot-token");
    expect(result.error).toContain("[redacted]");
  });
});
