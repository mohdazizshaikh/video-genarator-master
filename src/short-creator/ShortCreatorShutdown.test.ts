import fs from "fs-extra";
import path from "node:path";
import os from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShortCreator } from "./ShortCreator";
import { ContentVersionStore } from "../db/ContentVersionStore";
import { LanguageEnum, renderConfig } from "../types/shorts";

let directory: string;
let creator: ShortCreator;
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "creator-drain-"));
  const config = { dataDirPath: directory, videosDirPath: path.join(directory, "videos") } as ConstructorParameters<typeof ShortCreator>[0];
  fs.ensureDirSync(config.videosDirPath);
  creator = new ShortCreator(config, ...(Array(6).fill({}) as [never, never, never, never, never, never]));
});
afterEach(() => { vi.restoreAllMocks(); fs.removeSync(directory); });
describe("video engine shutdown", () => {
  it("rejects new work and drains already queued renders through output registration", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    vi.spyOn(creator as unknown as { createShort(id: string): Promise<void> }, "createShort").mockImplementation(async (id) => { await gate; fs.writeFileSync(creator.getVideoPath(id), "fixture video"); });
    const scenes = [{ text: "First story", language: LanguageEnum.en, searchTerms: ["test"] }];
    const first = creator.addToQueue(scenes, renderConfig.parse({}), "short", "en", "a");
    const second = creator.addToQueue([{ ...scenes[0], text: "Second story" }], renderConfig.parse({}), "short", "en", "a");
    let closed = false;
    const close = creator.close().then(() => { closed = true; });
    await Promise.resolve();
    expect(closed).toBe(false);
    expect(() => creator.addToQueue(scenes, renderConfig.parse({}), "short", "en", "a")).toThrow("shutting down");
    release(); await close;
    expect(creator.status(first)).toBe("ready");
    expect(creator.status(second)).toBe("ready");
    expect(new ContentVersionStore(directory).listForWorkspace("a").filter((version) => version.status === "ready")).toHaveLength(2);
  });
  it("resolves an idle engine drain immediately", async () => {
    await expect(creator.close()).resolves.toBeUndefined();
  });
});
