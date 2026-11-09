import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScheduledJobsList } from "./ScheduledJobsList";
import { normalizeRenderJobs } from "../../hooks/useScheduledJobs";

describe("render output visibility", () => {
  it("keeps owned output IDs and links only confirmed completed renders", () => {
    const jobs = normalizeRenderJobs([
      { id: "job-1", status: "rendered", videoId: "video-1", artifactId: "artifact-1", contentVersionId: "version-1" },
      { id: "job-2", status: "reconciling", videoId: "video-2", error: "Missing artifact" },
      { id: "job-3", status: "rendered", videoId: "video-3" },
    ]);
    expect(jobs[0]).toMatchObject({ artifactId: "artifact-1", contentVersionId: "version-1" });
    const markup = renderToStaticMarkup(<ScheduledJobsList renderJobs={jobs} publishJobs={[]} loading={false} onRefresh={() => undefined} />);
    expect(markup).toContain('href="/video/video-1"');
    expect(markup).not.toContain('href="/video/video-2"');
    expect(markup).not.toContain('href="/video/video-3"');
    expect(markup).toContain("Needs review");
  });
});
