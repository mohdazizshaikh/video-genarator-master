import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { SeriesBuilderEngine } from "./SeriesBuilderEngine";

const seriesInput = {
  title: "Tenant series",
  category: "tech",
  platform: ["youtube"],
  totalEpisodes: 2,
  style: "weekly" as const,
};

describe("SeriesBuilderEngine tenant isolation", () => {
  it("keeps series and episode mutations separate per tenant", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "series-isolation-"));
    const engine = new SeriesBuilderEngine(base);
    const first = engine.createSeriesForTenant("tenant-first", seriesInput);
    const second = engine.createSeriesForTenant("tenant-second", { ...seriesInput, title: "Second series" });

    expect(engine.getAllSeriesForTenant("tenant-first").map((series) => series.id)).toEqual([first.id]);
    expect(engine.getSeriesForTenant("tenant-first", second.id)).toBeUndefined();
    expect(engine.updateEpisodeForTenant("tenant-first", second.id, 1, { title: "blocked" })).toBe(false);
    expect(engine.updateEpisodeForTenant("tenant-first", first.id, 1, { title: "updated" })).toBe(true);
    expect(engine.getNextEpisodeForTenant("tenant-first", first.id)?.title).toBe("updated");
    expect(engine.deleteSeriesForTenant("tenant-first", second.id)).toBe(false);
  });

  it("hides legacy unowned series from scoped reads and mutations", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "series-legacy-"));
    fs.writeFileSync(path.join(base, "series.json"), JSON.stringify([
      { id: "legacy", title: "Legacy", category: "tech", platform: [], totalEpisodes: 1, episodes: [], style: "mini", autoCliffhanger: true, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
    ]));
    const engine = new SeriesBuilderEngine(base);

    expect(engine.getAllSeriesForTenant("tenant-first")).toEqual([]);
    expect(engine.getSeriesForTenant("tenant-first", "legacy")).toBeUndefined();
    expect(engine.deleteSeriesForTenant("tenant-first", "legacy")).toBe(false);
  });
});
