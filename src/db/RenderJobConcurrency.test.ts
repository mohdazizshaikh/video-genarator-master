import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderJobStore } from "./RenderJobStore";
import { RenderExecutionStore } from "./RenderExecutionStore";
import { OrientationEnum } from "../types/shorts";
let directory: string;
beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), "render-store-concurrency-")); });
afterEach(() => fs.removeSync(directory));
describe("file-mode render identity coordination", () => {
  it("retains interleaved independent writers and attempt increments", async () => {
    const first = new RenderJobStore(directory), second = new RenderJobStore(directory);
    const input = { tenantId: "a", scriptPlanId: "", videoType: "short" as const, language: "en", subtitleLanguage: "en", orientation: OrientationEnum.portrait, category: "Tech", namingKey: "one" };
    const records = await Promise.all([first.create(input), second.create({ ...input, namingKey: "two" })]);
    await Promise.all([first.incrementAttempt(records[0].id), second.incrementAttempt(records[0].id)]);
    expect(await first.list()).toHaveLength(2);
    expect((await second.get(records[0].id))?.attemptCount).toBe(2);
  });
  it("reuses a claim across instances and refuses rebinding its video identity", () => {
    const first = new RenderExecutionStore(directory), second = new RenderExecutionStore(directory);
    const initial = first.claim("a", "job", 1000);
    const repeated = second.claim("a", "job", 90000);
    expect(repeated.created).toBe(false);
    expect(repeated.execution.id).toBe(initial.execution.id);
    expect(repeated.execution.deadlineAt).toBe(initial.execution.deadlineAt);
    first.attachVideo("a", "job", initial.execution.id, "video-one");
    expect(() => second.attachVideo("a", "job", initial.execution.id, "video-two")).toThrow("rebound");
    expect(first.get("a", "job")?.videoId).toBe("video-one");
    expect(second.get("other", "job")).toBeUndefined();
  });
});
