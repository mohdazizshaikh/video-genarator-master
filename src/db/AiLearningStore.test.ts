import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { AiLearningStore } from "./AiLearningStore";

const eventInput = {
  jobId: "job-1",
  phase: "render" as const,
  outcome: "success" as const,
  latencyMs: 120,
};

describe("AiLearningStore tenant isolation", () => {
  it("writes and reads events only for their owning tenant", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "ai-learning-isolation-"));
    const store = new AiLearningStore(base);
    const first = await store.addEventForTenant("tenant-first", eventInput);
    const second = await store.addEventForTenant("tenant-second", { ...eventInput, jobId: "job-2" });

    expect((await store.listEventsForTenant("tenant-first")).map((event) => event.id)).toEqual([first.id]);
    expect((await store.listEventsForTenant("tenant-second")).map((event) => event.id)).toEqual([second.id]);
  });

  it("does not expose the legacy global model to a tenant", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "ai-learning-legacy-"));
    const store = new AiLearningStore(base);
    const legacy = { ...(await store.getModelStateForTenant("tenant-first")), samples: 999 };
    await fsp.writeFile(path.join(base, "ai-learning-model.json"), JSON.stringify(legacy), "utf8");

    expect((await store.getModelStateForTenant("tenant-first")).samples).toBe(0);
  });

  it("keeps model state separate for each tenant", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "ai-learning-models-"));
    const store = new AiLearningStore(base);
    const first = { ...(await store.getModelStateForTenant("tenant-first")), samples: 3 };
    const second = { ...(await store.getModelStateForTenant("tenant-second")), samples: 7 };
    await store.saveModelStateForTenant("tenant-first", first);
    await store.saveModelStateForTenant("tenant-second", second);

    expect((await store.getModelStateForTenant("tenant-first")).samples).toBe(3);
    expect((await store.getModelStateForTenant("tenant-second")).samples).toBe(7);
  });
});
