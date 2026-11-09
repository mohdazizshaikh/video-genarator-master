import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadScheduledJobs } from "./useScheduledJobs";
import { api } from "../services/apiClient";
vi.mock("../services/apiClient", () => ({ api: {
  queue: { getStatus: vi.fn(), listRenderJobs: vi.fn() },
  publish: { list: vi.fn() }, videos: { list: vi.fn() },
} }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.queue.getStatus).mockResolvedValue({ render: { waiting: 2 }, publish: {}, redisEnabled: false, source: "workspace_dashboard" });
  vi.mocked(api.queue.listRenderJobs).mockResolvedValue([{ id: "execution-job", status: "rendered", videoId: "video", artifactId: "artifact", contentVersionId: "version" }]);
  vi.mocked(api.publish.list).mockResolvedValue([]);
});
describe("scheduler data contract", () => {
  it("loads real persisted render jobs with their output links", async () => {
    const data = await loadScheduledJobs();
    expect(data.renderJobs).toMatchObject([{ id: "execution-job", status: "rendered", videoId: "video", artifactId: "artifact", contentVersionId: "version" }]);
    expect(api.queue.listRenderJobs).toHaveBeenCalledOnce();
    expect(api.videos.list).not.toHaveBeenCalled();
    expect(data.queueStats.redisEnabled).toBe(false);
    expect(data.queueStats.render.waiting).toBe(2);
  });
  it("surfaces a failed render-job request rather than displaying an empty queue", async () => {
    vi.mocked(api.queue.listRenderJobs).mockRejectedValue(new Error("Render store needs reconciliation"));
    await expect(loadScheduledJobs()).rejects.toThrow("needs reconciliation");
  });
});
