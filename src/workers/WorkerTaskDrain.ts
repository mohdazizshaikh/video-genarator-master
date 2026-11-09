import { logger } from "../logger";

/** BullMQ does not await async EventEmitter listeners. Keep their persistence
 * work inside the shutdown barrier and consume rejections explicitly. */
export class WorkerTaskDrain {
  private tasks = new Set<Promise<void>>();
  private failed = false;
  constructor(private name: string) {}

  track(operation: () => void | Promise<void>): void {
    const pending = Promise.resolve().then(operation).catch(() => {
      this.failed = true;
      logger.error({ worker: this.name }, "Worker event persistence failed; reconciliation is required");
    }).finally(() => this.tasks.delete(pending));
    this.tasks.add(pending);
  }

  async drain(): Promise<void> {
    while (this.tasks.size) await Promise.all([...this.tasks]);
    if (this.failed) throw new Error("Worker event persistence did not complete successfully");
  }
}
