import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { CompetitorAnalysisEngine } from "./CompetitorAnalysisEngine";

describe("CompetitorAnalysisEngine tenant isolation", () => {
  it("keeps generated strategy history separate per tenant", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "competitor-isolation-"));
    const engine = new CompetitorAnalysisEngine(base);

    engine.generateStrategyForTenant("tenant-first", "tech", "youtube");
    engine.generateStrategyForTenant("tenant-second", "finance", "instagram");

    expect(engine.getHistoryForTenant("tenant-first").map((record) => record.niche)).toEqual(["tech"]);
    expect(engine.getHistoryForTenant("tenant-second").map((record) => record.niche)).toEqual(["finance"]);
    expect(engine.getHistoryForTenant("tenant-missing")).toEqual([]);
  });

  it("does not return legacy unowned history to a tenant", async () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "competitor-legacy-"));
    fs.writeFileSync(path.join(base, "competitor-analysis.json"), JSON.stringify([
      { niche: "tech", platform: "youtube", analyzedAt: "2026-01-01", creators: [], strategy: {} },
    ]));
    const engine = new CompetitorAnalysisEngine(base);

    expect(engine.getHistoryForTenant("tenant-first")).toEqual([]);
  });
});
