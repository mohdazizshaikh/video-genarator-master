import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { canReviewAssets, confirmScheduleAssets, ScheduleAssetReview, type ReviewExecution } from "./ScheduleAssetReview";
import { authenticatedFetch } from "../../services/authenticatedFetch";
vi.mock("../../services/authenticatedFetch", () => ({ authenticatedFetch: vi.fn() }));
const request = vi.mocked(authenticatedFetch);
const held = (): ReviewExecution => ({ id: "execution-1", state: "reconciling", producerContract: { expectedAssets: 1, expectsVideo: false }, pendingOutput: { state: "assets-persisted", artifacts: [{ id: "artifact-1" }] } });
beforeEach(() => request.mockReset());

describe("schedule asset review", () => {
  it("shows candidate downloads and requires explicit inspection before confirmation", () => {
    const html = renderToStaticMarkup(<ScheduleAssetReview scheduleId="schedule-1" execution={held()} onDownload={() => undefined} onConfirmed={async () => undefined} />);
    expect(html).toContain("Download pending image 1");
    expect(html).toContain("Evidence reference");
    expect(html).toContain("I inspected every expected output");
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Confirm completed assets<\/button>/);
    expect(request).not.toHaveBeenCalled();
  });
  it("keeps partial, video, unbound and active claims out of confirmation", () => {
    const scenarios: ReviewExecution[] = [
      { ...held(), state: "claimed" },
      { ...held(), producerContract: undefined },
      { ...held(), pendingOutput: undefined },
      { ...held(), producerContract: { expectedAssets: 2, expectsVideo: false } },
      { ...held(), producerContract: { expectedAssets: 1, expectsVideo: true } },
      { ...held(), producerContract: { expectedAssets: 2, expectsVideo: false }, pendingOutput: { state: "assets-persisted", artifacts: [{ id: "a" }, { id: "a" }] } },
    ];
    for (const execution of scenarios) {
      expect(canReviewAssets(execution)).toBe(false);
      const html = renderToStaticMarkup(<ScheduleAssetReview scheduleId="s" execution={execution} onDownload={() => undefined} onConfirmed={async () => undefined} />);
      expect(html).not.toContain("Confirm completed assets");
    }
  });
  it("shows escaped recorded operator evidence after confirmation", () => {
    const execution: ReviewExecution = { ...held(), state: "completed", reconciliation: { operator: "operator", evidenceReference: "<review-1>", confirmedAt: "2026-10-29" } };
    const html = renderToStaticMarkup(<ScheduleAssetReview scheduleId="s" execution={execution} onDownload={() => undefined} onConfirmed={async () => undefined} />);
    expect(html).toContain("Assets confirmed by");
    expect(html).toContain("&lt;review-1&gt;");
    expect(html).not.toContain("Confirm completed assets");
  });
  it("submits the captured execution and attestation through authenticated fetch only", async () => {
    request.mockResolvedValue(new Response(null, { status: 200 }));
    await confirmScheduleAssets("schedule/1", "execution-1", " review-1 ", true);
    expect(request).toHaveBeenCalledExactlyOnceWith("/api/schedule/schedule%2F1/confirm-assets", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ executionId: "execution-1", evidenceReference: "review-1", verifiedOutcome: true }),
    });
  });
  it("does not dispatch missing, oversized, multiline or unverified evidence", async () => {
    for (const [evidence, verified] of [["", true], ["x".repeat(501), true], ["a\nb", true], ["review", false]] as const)
      await expect(confirmScheduleAssets("s", "e", evidence, verified)).rejects.toThrow("Provide an evidence reference");
    expect(request).not.toHaveBeenCalled();
  });
  it.each([[403, "permission"], [409, "Refresh"], [500, "failed"]])("surfaces HTTP %i without reporting success", async (status, message) => {
    request.mockResolvedValue(new Response(null, { status }));
    await expect(confirmScheduleAssets("s", "e", "review", true)).rejects.toThrow(message);
  });
});
