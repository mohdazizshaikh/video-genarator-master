import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Config } from "../../config";
import type { ShortCreator } from "../../short-creator/ShortCreator";
import { RenderJobStore } from "../../db/RenderJobStore";
import { OrientationEnum } from "../../types/shorts";
import { QueueRouter } from "./queue";
import { dispatch } from "../testing/dispatch";
let directory: string;
let router: QueueRouter["router"];
let jobs: RenderJobStore;
const input = { tenantId: "a", scriptPlanId: "", videoType: "short" as const, language: "en", subtitleLanguage: "en", orientation: OrientationEnum.portrait, category: "Tech", namingKey: "test" };
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "render-job-api-"));
  router = new QueueRouter({ dataDirPath: directory } as Config, {} as ShortCreator).router;
  jobs = new RenderJobStore(directory);
});
afterEach(() => fs.removeSync(directory));
describe("owned render execution visibility", () => {
  it("exposes completed output IDs through the scheduler endpoint without filesystem paths", async () => {
    const record = await jobs.create(input);
    await jobs.updateStatusForTenant("a", record.id, "rendered", { outputPath: "/private/video.mp4", videoId: "video", artifactId: "artifact", contentVersionId: "version", executionId: "execution" });
    const response = await dispatch(router, "GET", "/render-jobs", { auth: { tenantId: "a" } });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([{ id: record.id, status: "rendered", videoId: "video", artifactId: "artifact", contentVersionId: "version" }]);
    expect(JSON.stringify(response.body)).not.toContain("/private/");
    expect((await dispatch(router, "GET", "/render-jobs", { auth: { tenantId: "b" } })).body).toEqual([]);
    expect((await dispatch(router, "GET", `/render-jobs/${record.id}`, { auth: { tenantId: "b" } })).status).toBe(404);
  });
  it("rejects anonymous access and shows reconciliation without claiming completion", async () => {
    expect((await dispatch(router, "GET", "/render-jobs")).status).toBe(401);
    const record = await jobs.create(input);
    await jobs.updateStatusForTenant("a", record.id, "reconciling", { error: "Render outcome needs review" });
    expect((await dispatch(router, "GET", `/render-jobs/${record.id}`, { auth: { tenantId: "a" } })).body).toMatchObject({ status: "reconciling", error: "Render outcome needs review" });
  });
});
