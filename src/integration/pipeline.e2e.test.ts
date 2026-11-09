import express from "express";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import axios from "axios";
import type { Job } from "bullmq";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Config } from "../config";
import { ShortCreator } from "../short-creator/ShortCreator";
import { APIRouter } from "../server/routers/rest";
import { ConnectorsRouter } from "../server/routers/connectors";
import { ContentVersionsRouter } from "../server/routers/contentversions";
import { ReleasesRouter } from "../server/routers/releases";
import { requireWorkspace } from "../server/auth";
import { dispatch } from "../server/testing/dispatch";
import { renderConfig } from "../types/shorts";
import { ArtifactManifestStore } from "../db/ArtifactManifestStore";
import { ContentVersionStore } from "../db/ContentVersionStore";
import { PublishJobStore } from "../db/PublishJobStore";
import { PublishExecutionStore } from "../db/PublishExecutionStore";
import { ReleaseStore } from "../db/ReleaseStore";
import { PublishWorker, type PublishJobPayload } from "../workers/PublishWorker";

const fake = vi.hoisted(() => ({
  process: undefined as ((job: Job<PublishJobPayload>, token?: string) => Promise<void>) | undefined,
  add: vi.fn(), remove: vi.fn(), upload: vi.fn(), validate: vi.fn(), publisher: vi.fn(),
}));
vi.mock("axios", () => ({ default: { get: vi.fn() } }));
vi.mock("bullmq", async (original) => ({ ...await original<typeof import("bullmq")>(), Worker: class {
  constructor(_name: string, processor: typeof fake.process) { fake.process = processor; }
  on() { return this; } async close() {} async pause() {}
} }));
vi.mock("../workers/QueueManager", () => ({
  QUEUE_NAMES: { PUBLISH: "publish", DEADLETTER: "deadletter" }, getRedisConnection: () => ({}),
  createPublishQueue: () => ({ add: fake.add, remove: fake.remove }), createQueue: () => ({ add: fake.add }),
}));
vi.mock("../publishers/PublisherFactory", () => ({ createPublisherForAccount: fake.publisher }));
let directory: string;
let creator: ShortCreator;
let worker: PublishWorker;
let app: express.Router;
const owner = { tenantId: "A", permissions: ["release:approve"], name: "Owner A" };
const other = { tenantId: "B", permissions: ["release:approve"], name: "Owner B" };
const request = (method: string, url: string, body?: unknown, auth = owner) => dispatch(app, method, url, { auth, body });
beforeEach(() => {
  vi.stubEnv("TENANT_KEYS_SECRET", "isolated-workflow-vault-key");
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "pipeline-acceptance-"));
  const config = { dataDirPath: directory, videosDirPath: path.join(directory, "videos"), tempDirPath: path.join(directory, "tmp"), musicDirPath: path.join(directory, "music"), redisEnabled: true, publishWorkerConcurrency: 1 } as Config;
  fs.ensureDirSync(config.videosDirPath);
  creator = new ShortCreator(config, ...(Array(6).fill({}) as [never, never, never, never, never, never]));
  vi.spyOn(creator as unknown as { createShort: (id: string) => Promise<string> }, "createShort").mockImplementation(async (id) => { fs.writeFileSync(creator.getVideoPath(id), "mock renderer output"); return id; });
  fake.add.mockReset().mockResolvedValue({ id: "queued" }); fake.remove.mockReset();
  fake.upload.mockReset().mockResolvedValue({ success: true, externalId: "provider-42" }); fake.validate.mockReset().mockResolvedValue(true);
  fake.publisher.mockReset().mockReturnValue({ uploadVideo: fake.upload, validateCredentials: fake.validate });
  vi.mocked(axios.get).mockReset().mockImplementation(async (url) => ({ data: { ok: true, result: String(url).endsWith("getMe") ? { username: "fixture_bot" } : { type: "channel" } } }));
  app = express.Router(); app.use(requireWorkspace);
  app.use("/api", new APIRouter(config, creator).router);
  app.use("/api/connectors", new ConnectorsRouter(config).router);
  app.use("/api/content-versions", new ContentVersionsRouter(directory).router);
  app.use("/api/releases", new ReleasesRouter(config).router);
  worker = new PublishWorker(config);
});
afterEach(async () => { await worker.close(); await creator.close(); vi.restoreAllMocks(); vi.unstubAllEnvs(); fs.removeSync(directory); });

async function rendered() {
  const body = { scenes: [{ text: "An owned pipeline story", language: "en", searchTerms: ["news", "story"] }], config: renderConfig.parse({}), tenantId: "forged" };
  const a = await request("POST", "/api/short-video", body);
  const b = await request("POST", "/api/short-video", body, other);
  expect(a.status).toBe(201); expect(b.status).toBe(201);
  await creator.close();
  const versions = new ContentVersionStore(directory);
  const av = versions.listForWorkspace("A")[0], bv = versions.listForWorkspace("B")[0];
  expect(av?.status).toBe("ready"); expect(bv?.status).toBe("ready"); expect(av.id).not.toBe(bv.id);
  expect(new ArtifactManifestStore(directory).listForTenant("A")).toHaveLength(1);
  expect(new ArtifactManifestStore(directory).listForTenant("B")).toHaveLength(1);
  expect((await request("GET", `/api/content-versions/${av.id}`, undefined, other)).status).toBe(404);
  return av;
}
async function approvedTarget() {
  const version = await rendered();
  const connectorResponse = await request("POST", "/api/connectors", { platform: "telegram", displayName: "Fixture bot", credentialRef: "secret://workflow", externalAccountId: "fixture-account" });
  expect(connectorResponse.status).toBe(201);
  const connector = (connectorResponse.body as { connector: { id: string } }).connector;
  expect((await request("PUT", `/api/connectors/${connector.id}/secret`, { secret: { botToken: "test-only-bot-token" } })).status).toBe(200);
  const destinationResponse = await request("POST", `/api/connectors/${connector.id}/destinations`, { externalDestinationId: "fixture-chat", displayName: "Fixture chat" });
  expect(destinationResponse.status).toBe(201);
  const destination = (destinationResponse.body as { destination: { id: string } }).destination;
  expect((await request("POST", `/api/connectors/${connector.id}/destinations/${destination.id}/verify`)).status).toBe(200);
  const created = await request("POST", "/api/releases", { contentVersionId: version.id });
  expect(created.status).toBe(201);
  const release = (created.body as { release: { id: string } }).release;
  const targetBody = { connectorId: connector.id, destinationId: destination.id, idempotencyKey: "workflow-target" };
  expect((await request("POST", `/api/releases/${release.id}/targets`, targetBody)).status).toBe(409);
  expect((await request("POST", `/api/releases/${release.id}/approve`, { destinations: [targetBody] })).status).toBe(200);
  const targetResponse = await request("POST", `/api/releases/${release.id}/targets`, targetBody);
  expect(targetResponse.status).toBe(201);
  const target = (targetResponse.body as { target: { id: string } }).target;
  expect((await request("POST", `/api/releases/${release.id}/queue`, { targetId: target.id }, other)).status).toBe(404);
  expect((await request("POST", `/api/releases/${release.id}/queue`, { targetId: target.id })).status).toBe(202);
  expect(fake.add).toHaveBeenCalledOnce();
  const payload = fake.add.mock.calls[0][1] as PublishJobPayload;
  expect(payload.tenantId).toBe("A");
  expect(JSON.stringify(payload)).not.toContain("test-only-bot-token");
  const job = { data: payload, id: "workflow-queue-job", attemptsMade: 0, opts: { attempts: 2 }, updateProgress: vi.fn(async () => undefined), discard: vi.fn() } as unknown as Job<PublishJobPayload>;
  return { version, connector, destination, release, target, payload, job };
}

describe("two-workspace render/approve/queue/publication workflow", () => {
  it("publishes owned approved content and repairs duplicate delivery without reupload", async () => {
    const flow = await approvedTarget();
    await fake.process!(flow.job, "token"); await fake.process!(flow.job, "token");
    expect(fake.upload).toHaveBeenCalledOnce();
    expect(fake.upload).toHaveBeenCalledWith(expect.objectContaining({ videoFilePath: flow.version.renderOutputPath }));
    expect(fake.publisher).toHaveBeenCalledWith("telegram", expect.anything(), expect.objectContaining({ channelId: "fixture-chat" }));
    expect(new ReleaseStore(directory).getRelease("A", flow.release.id)?.status).toBe("published");
    expect((await new PublishJobStore(directory).getJobForTenant("A", flow.payload.publishJobId))?.externalId).toBe("provider-42");
    expect(await new PublishJobStore(directory).listJobsForTenant("B")).toEqual([]);
    expect((await request("GET", `/api/releases/${flow.release.id}`, undefined, other)).status).toBe(404);
  });
  it("holds a lost response, blocks repeat uploads, and records an operator observation", async () => {
    const flow = await approvedTarget(); fake.upload.mockRejectedValue(new Error("socket lost after acceptance"));
    await expect(fake.process!(flow.job, "token")).rejects.toThrow("reconciliation");
    await expect(fake.process!(flow.job, "token")).rejects.toThrow("reconciliation");
    expect(fake.upload).toHaveBeenCalledOnce();
    expect((await request("POST", `/api/releases/${flow.release.id}/queue`, { targetId: flow.target.id })).status).toBe(409);
    const execution = new PublishExecutionStore(directory).get("A", flow.target.id)!;
    const confirm = await request("POST", `/api/releases/${flow.release.id}/targets/${flow.target.id}/confirm-publication`, { requestId: execution.requestId, externalId: "provider-observed-42", evidenceReference: "provider-case-123", verifiedOnProvider: true });
    expect(confirm.status).toBe(200);
    await fake.process!(flow.job, "token");
    expect(fake.upload).toHaveBeenCalledOnce();
    expect(new ReleaseStore(directory).getRelease("A", flow.release.id)?.status).toBe("published");
  });
  it("rejects foreign queue payloads and changed artifacts before provider dispatch", async () => {
    const flow = await approvedTarget();
    await expect(fake.process!({ ...flow.job, data: { ...flow.payload, tenantId: "B" } } as Job<PublishJobPayload>, "token")).rejects.toThrow();
    fs.writeFileSync(flow.version.renderOutputPath!, "modified after approval");
    await expect(fake.process!(flow.job, "token")).rejects.toThrow("checksum");
    expect(fake.upload).not.toHaveBeenCalled();
    expect(fake.publisher).not.toHaveBeenCalled();
    expect(new PublishExecutionStore(directory).get("A", flow.target.id)).toBeUndefined();
  });
});
