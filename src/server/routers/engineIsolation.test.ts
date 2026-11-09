import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import type { Config } from "../../config";
import { CostsRouter } from "./costs";
import { RecycleRouter } from "./recycle";
import { ContentBucketsRouter } from "./contentbuckets";
import { StrategyRouter } from "./strategy";
import { HooksRouter } from "./hooks";
import { dispatch } from "../testing/dispatch";

let dir: string;
let config: Config;
const a = { tenantId: "tenant-A" },
  b = { tenantId: "tenant-B" };
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "engine-isolation-"));
  config = { dataDirPath: dir } as Config;
});
afterEach(() => fs.removeSync(dir));

describe("legacy engine workspace isolation", () => {
  it("ignores forged cost attribution and scopes summaries and tenant lookups", async () => {
    const router = new CostsRouter(config).router;
    const created = await dispatch(router, "POST", "/record", {
      auth: a,
      body: {
        category: "other",
        description: "A expense",
        units: 2,
        costPerUnit: 4,
        tenantId: b.tenantId,
      },
    });
    expect(created.body).toMatchObject({
      data: { tenantId: a.tenantId, totalCost: 8 },
    });
    expect(
      (await dispatch(router, "GET", "/summary", { auth: b })).body,
    ).toMatchObject({ data: { totalCost: 0 } });
    expect(
      (await dispatch(router, "GET", `/tenant/${a.tenantId}`, { auth: b }))
        .status,
    ).toBe(404);
    expect(
      (await dispatch(router, "GET", "/summary", { auth: a })).body,
    ).toMatchObject({ data: { totalCost: 8 } });
  });

  it("shares one bucket store for a workspace across route families, without sharing across owners", async () => {
    const buckets = new ContentBucketsRouter(config).router;
    const strategy = new StrategyRouter(config).router;
    await dispatch(buckets, "POST", "/add", {
      auth: a,
      body: { videoId: "A-video", title: "A story", category: "Business" },
    });
    const own = await dispatch(strategy, "GET", "/buckets", { auth: a });
    const foreign = await dispatch(strategy, "GET", "/buckets", { auth: b });
    expect(JSON.stringify(own.body)).not.toBe(JSON.stringify(foreign.body));
    // A new router in the same process must not introduce a second stale cache.
    expect(
      (
        await dispatch(
          new ContentBucketsRouter(config).router,
          "GET",
          "/stats",
          { auth: a },
        )
      ).body,
    ).toEqual(own.body);
  });

  it("does not reveal recycled content or legacy globally unowned records", async () => {
    fs.writeJsonSync(path.join(dir, "recycle-records.json"), [
      { videoId: "legacy" },
    ]);
    const router = new RecycleRouter(config).router;
    await dispatch(router, "POST", "/register", {
      auth: a,
      body: {
        videoId: "A-video",
        title: "A secret",
        category: "Business",
        isEvergreen: true,
      },
    });
    const other = await dispatch(router, "GET", "/candidates", { auth: b });
    expect(other.body).toMatchObject({ data: [] });
    expect(fs.readJsonSync(path.join(dir, "recycle-records.json"))).toEqual([
      { videoId: "legacy" },
    ]);
  });

  it("isolates custom hooks and their mutation IDs", async () => {
    const router = new HooksRouter(config).router;
    const created = await dispatch(router, "POST", "/", {
      auth: a,
      body: {
        text: "A private hook",
        type: "question",
        category: ["Business"],
        platform: ["youtube"],
        emotion: "curiosity",
        performanceScore: 50,
      },
    });
    const id = (created.body as { data: { id: string } }).data.id;
    expect(
      (await dispatch(router, "DELETE", `/${id}`, { auth: b })).status,
    ).toBe(404);
    const foreign = await dispatch(router, "GET", "/", { auth: b });
    expect(JSON.stringify(foreign.body)).not.toContain("A private hook");
    expect(
      JSON.stringify((await dispatch(router, "GET", "/", { auth: a })).body),
    ).toContain("A private hook");
  });
});
