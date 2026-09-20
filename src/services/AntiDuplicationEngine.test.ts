import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AntiDuplicationEngine } from "./AntiDuplicationEngine";

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) fs.removeSync(dir); });

describe("AntiDuplicationEngine tenant isolation", () => {
  it("does not compare one tenant against another tenant history", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dedupe-tenant-"));
    dirs.push(dir);
    const engine = new AntiDuplicationEngine(dir);
    engine.register("Same title", ["same", "title"], "tech", "tenant-a");
    expect(engine.check("Same title", ["same", "title"], "tech", "tenant-a").isDuplicate).toBe(true);
    expect(engine.check("Same title", ["same", "title"], "tech", "tenant-b").isDuplicate).toBe(false);
  });
});
