import { describe, expect, it, vi } from "vitest";
import type { Job } from "bullmq";
import { DelayedError } from "bullmq";
import { PublishWorker, type PublishJobPayload } from "./PublishWorker";

describe("publish execution due-time boundary", () => {
  it("defers early execution before touching credentials, records or provider", async () => {
    const dueAt = Date.now() + 60_000;
    const moveToDelayed = vi.fn().mockResolvedValue(undefined);
    const worker = Object.create(PublishWorker.prototype) as {
      processJob(job: Job<PublishJobPayload>, token: string): Promise<void>;
    };
    const job = {
      data: {
        tenantId: "A",
        publishJobId: "job",
        platform: "telegram",
        scheduleAt: new Date(dueAt).toISOString(),
      },
      moveToDelayed,
    } as unknown as Job<PublishJobPayload>;
    // No worker stores/providers exist on this fixture: touching them before
    // deferral would fail the test rather than quietly dispatching a message.
    await expect(worker.processJob(job, "queue-token")).rejects.toBeInstanceOf(
      DelayedError,
    );
    expect(moveToDelayed).toHaveBeenCalledWith(dueAt, "queue-token");
  });
  it("discards a malformed due time before any publication", async () => {
    const discard = vi.fn();
    const worker = Object.create(PublishWorker.prototype) as {
      processJob(job: Job<PublishJobPayload>, token: string): Promise<void>;
    };
    const job = {
      data: { tenantId: "A", scheduleAt: "not-a-date" },
      discard,
    } as unknown as Job<PublishJobPayload>;
    await expect(worker.processJob(job, "token")).rejects.toThrow(
      "Invalid publish due time",
    );
    expect(discard).toHaveBeenCalledOnce();
  });
});
