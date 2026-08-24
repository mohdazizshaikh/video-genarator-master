import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import fsp from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { PipelineStore } from "./PipelineStore";

const jobInput = { topic: "Tenant isolation", platform: "youtube", tone: "informative", bulkCount: 1, autoSchedule: false } as const;

describe("PipelineStore tenant isolation", () => {
  it("keeps jobs, variations, and comparisons scoped to their tenant", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pipeline-isolation-"));
    const store = new PipelineStore(base);
    const first = await store.createJob({ ...jobInput, tenantId: "tenant-first" });
    const second = await store.createJob({ ...jobInput, tenantId: "tenant-second" });
    await store.saveVariation({ tenantId: "tenant-first", jobId: first.id, hook: "First", caption: "First", hashtags: [], humanizedOutput: {}, emotionalDirectives: {}, thumbnailDirectives: {}, watermarkFilter: "", aiScores: { emotionalScore: 1, qualityScore: 1, attentionScore: 1, engagementScore: 1, overallScore: 1 }, rank: 1 });

    expect((await store.listJobsForTenant("tenant-first")).map((job) => job.id)).toEqual([first.id]);
    expect(await store.getJobForTenant("tenant-first", second.id)).toBeNull();
    expect(await store.getVariationsForJobForTenant("tenant-first", second.id)).toEqual([]);
    expect((await store.getStatsForTenant("tenant-first")).totalJobs).toBe(1);

    const comparison = await store.createComparison({ tenantId: "tenant-first", topic: "Topic", tone: "informative", platforms: ["youtube", "tiktok"] });
    expect(await store.getComparisonForTenant("tenant-second", comparison.id)).toBeNull();
    expect((await store.listComparisonsForTenant("tenant-first")).map((run) => run.id)).toEqual([comparison.id]);
  });

  it("keeps legacy pipeline records out of scoped reads", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "pipeline-legacy-"));
    const store = new PipelineStore(base);
    await fsp.writeFile(path.join(base, "pipeline-jobs.json"), JSON.stringify([{ id: "legacy", topic: "Legacy", platform: "youtube", tone: "calm", bulkCount: 1, autoSchedule: false, status: "pending", currentStep: "queued", totalVariations: 0, topVariations: [], scheduleIds: [], createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }]), "utf8");
    expect(await store.getJobForTenant("tenant-first", "legacy")).toBeNull();
    expect(await store.listJobsForTenant("tenant-first")).toEqual([]);
  });
});

