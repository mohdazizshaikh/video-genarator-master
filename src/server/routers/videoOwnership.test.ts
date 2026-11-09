import express from "express";
import fs from "fs-extra";
import { requireAuth } from "../auth";
import { ContentVersionStore } from "../../db/ContentVersionStore";
import { ArtifactManifestStore } from "../../db/ArtifactManifestStore";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShortCreator } from "../../short-creator/ShortCreator";
import { APIRouter } from "./rest";
import { MCPRouter } from "./mcp";
import { VideoMetadataStore } from "../../db/VideoMetadataStore";
import { renderConfig, LanguageEnum } from "../../types/shorts";
import { dispatch } from "../testing/dispatch";

let directory: string;
let creator: ShortCreator;
let router: APIRouter;
const scenes = [
  {
    text: "A workspace-owned story",
    language: LanguageEnum.en,
    searchTerms: ["news", "story"],
  },
];
const options = renderConfig.parse({});
const auth = { tenantId: "workspace-A" };
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "video-ownership-"));
  const config = {
    dataDirPath: directory,
    videosDirPath: path.join(directory, "videos"),
    tempDirPath: path.join(directory, "tmp"),
    musicDirPath: path.join(directory, "music"),
  } as ConstructorParameters<typeof ShortCreator>[0];
  fs.ensureDirSync(config.videosDirPath);
  creator = new ShortCreator(
    config,
    ...(Array(6).fill({}) as [never, never, never, never, never, never]),
  );
  vi.spyOn(
    creator as unknown as { processQueue: () => Promise<void> },
    "processQueue",
  ).mockResolvedValue();
  router = new APIRouter(config, creator);
});
afterEach(() => {
  fs.removeSync(directory);
});
function queue(tenantId = auth.tenantId) {
  return creator.addToQueue(scenes, options, "short", "en", tenantId);
}

describe("workspace-owned video lifecycle", () => {
  it("requires ownership before enqueue and dedupes only inside a workspace", () => {
    expect(() => creator.addToQueue(scenes, options)).toThrow(/workspace/);
    const a = queue();
    expect(queue()).toBe(a);
    expect(queue("workspace-B")).not.toBe(a);
    expect(creator.listAllVideos(auth.tenantId).map((v) => v.id)).toEqual([a]);
  });
  it("persists authenticated ownership during REST create", async () => {
    const result = await dispatch(router.router, "POST", "/short-video", {
      auth,
      body: { scenes, config: options, tenantId: "workspace-B" },
    });
    expect(result.status).toBe(201);
    const id = (result.body as { videoId: string }).videoId;
    expect(
      new VideoMetadataStore(directory).getSync(id, auth.tenantId),
    ).toBeDefined();
    expect(
      new VideoMetadataStore(directory).getSync(id, "workspace-B"),
    ).toBeUndefined();
  });
  it.each(["/status", "/metadata", "/render-path", ""])(
    "hides foreign video%s",
    async (suffix) => {
      const id = queue();
      const result = await dispatch(
        router.router,
        "GET",
        `/short-video/${id}${suffix}`,
        { auth: { tenantId: "workspace-B" } },
      );
      expect(result.status).toBe(404);
    },
  );
  it("does not delete a foreign video or list it for the other workspace", async () => {
    const id = queue();
    fs.writeFileSync(creator.getVideoPath(id), "video");
    const other = { tenantId: "workspace-B" };
    expect(
      (await dispatch(router.router, "GET", "/short-videos", { auth: other }))
        .body,
    ).toEqual({ videos: [] });
    expect(
      (
        await dispatch(router.router, "DELETE", `/short-video/${id}`, {
          auth: other,
        })
      ).status,
    ).toBe(404);
    expect(fs.existsSync(creator.getVideoPath(id))).toBe(true);
  });
  it("rejects symlink escapes even with owned metadata", async () => {
    const id = queue();
    const outside = path.join(directory, "outside.mp4");
    fs.writeFileSync(outside, "private");
    fs.symlinkSync(outside, creator.getVideoPath(id));
    expect(
      (await dispatch(router.router, "GET", `/short-video/${id}`, { auth }))
        .status,
    ).toBe(404);
  });
  it("serves and deletes an owned file without exposing legacy unowned files", async () => {
    const id = queue();
    fs.writeFileSync(creator.getVideoPath(id), "owned video");
    fs.writeFileSync(creator.getVideoPath("legacy-unowned"), "legacy");
    expect(
      (await dispatch(router.router, "GET", `/short-video/${id}`, { auth }))
        .body,
    ).toEqual(Buffer.from("owned video"));
    expect(
      (
        await dispatch(router.router, "GET", "/short-video/legacy-unowned", {
          auth,
        })
      ).status,
    ).toBe(404);
    expect(
      (await dispatch(router.router, "DELETE", `/short-video/${id}`, { auth }))
        .status,
    ).toBe(200);
    expect(fs.existsSync(creator.getVideoPath(id))).toBe(false);
  });
  it("streams byte ranges and rejects invalid seeks", async () => {
    const id = queue();
    fs.writeFileSync(creator.getVideoPath(id), "0123456789");
    const partial = await dispatch(router.router, "GET", `/short-video/${id}`, {
      auth,
      headers: { range: "bytes=2-5" },
    });
    expect(partial.status).toBe(206);
    expect(partial.body).toEqual(Buffer.from("2345"));
    expect(
      (
        await dispatch(router.router, "GET", `/short-video/${id}`, {
          auth,
          headers: { range: "bytes=100-" },
        })
      ).status,
    ).toBe(416);
  });
  it("authorizes a signed media URL without opening other API routes", async () => {
    vi.stubEnv(
      "JWT_SECRET",
      "isolated-playback-link-test-secret-with-32-characters",
    );
    try {
      const id = queue();
      fs.writeFileSync(creator.getVideoPath(id), "owned media");
      const signed = await dispatch(
        router.router,
        "GET",
        `/short-video/${id}/playback`,
        { auth },
      );
      const url = (signed.body as { url: string }).url.replace("/api", "");
      const protectedRouter = express.Router();
      protectedRouter.use(requireAuth, router.router);
      expect((await dispatch(protectedRouter, "GET", url)).body).toEqual(
        Buffer.from("owned media"),
      );
      expect(
        (await dispatch(protectedRouter, "GET", `/short-video/${id}`)).status,
      ).toBe(401);
      const token = new URL(url, "http://localhost").searchParams.get(
        "videoToken",
      );
      expect(
        (
          await dispatch(
            protectedRouter,
            "GET",
            `/short-video/${id}/metadata?videoToken=${token}`,
          )
        ).status,
      ).toBe(401);
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("registers successful render output as an owned artifact and releaseable version", async () => {
    vi.spyOn(
      creator as unknown as { processQueue: () => Promise<void> },
      "processQueue",
    ).mockRestore();
    vi.spyOn(
      creator as unknown as { createShort: (id: string) => Promise<string> },
      "createShort",
    ).mockImplementation(async (id) => {
      fs.writeFileSync(creator.getVideoPath(id), "render output");
      return id;
    });
    const id = queue();
    await vi.waitFor(() =>
      expect(
        new ContentVersionStore(directory).listForWorkspace(auth.tenantId)[0]
          ?.status,
      ).toBe("ready"),
    );
    expect(
      new ArtifactManifestStore(directory).listForTenant(auth.tenantId)[0],
    ).toMatchObject({ kind: "video", localPath: creator.getVideoPath(id) });
    expect(
      new ContentVersionStore(directory).listForWorkspace("workspace-B"),
    ).toEqual([]);
  });
  it("fails closed for MCP session messages without matching ownership", async () => {
    const mcp = new MCPRouter(creator);
    expect(
      (
        await dispatch(
          mcp.router,
          "POST",
          "/messages?sessionId=other-session",
          { auth },
        )
      ).status,
    ).toBe(404);
    expect(
      (await dispatch(mcp.router, "POST", "/messages?sessionId=other-session"))
        .status,
    ).toBe(401);
  });
});
