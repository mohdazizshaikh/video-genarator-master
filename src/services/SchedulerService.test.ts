/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, expect, it } from "vitest";
import { SchedulerService } from "./SchedulerService";

describe("SchedulerService in-flight guard", () => {
  it("rejects duplicate category-slot enqueue requests", async () => {
    const config: any = { redisEnabled: false, dataDirPath: process.cwd(), cronInterval: "*/30 * * * *" };
    const shortCreator: any = {};
    const service = new SchedulerService(config, shortCreator);

    const promiseA = service.enqueueRenderJob({
      tenantId: "test-tenant",
      sceneInput: [{ text: "hello", searchTerms: ["a"], language: "en" }],
      config: {} as any,
      orientation: "portrait",
      category: "World",
      videoType: "short",
      subtitleLanguage: "en",
      namingKey: "same",
    });

    const promiseB = service.enqueueRenderJob({
      tenantId: "test-tenant",
      sceneInput: [{ text: "hello", searchTerms: ["a"], language: "en" }],
      config: {} as any,
      orientation: "portrait",
      category: "World",
      videoType: "short",
      subtitleLanguage: "en",
      namingKey: "same-2",
    });

    await expect(promiseB).rejects.toThrow(/Duplicate in-flight category slot/);
    await promiseA.catch(() => undefined);
  });

  it("keeps an empty source-driven tick review-safe and side-effect free", async () => {
    const config: any = { redisEnabled: false, dataDirPath: "/tmp/content-factory-scheduler-empty", cronInterval: "*/30 * * * *", aiLlmUrl: "http://127.0.0.1:9", aiLlmModel: "test" };
    const service = new SchedulerService(config, {} as any);
    await expect(service.runOnce()).resolves.toEqual({ rules: 0, drafts: 0, skipped: 0 });
  });
});
