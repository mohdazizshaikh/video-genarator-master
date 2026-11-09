import crypto from "node:crypto";

type WorkerProbe = Pick<import("bullmq").Worker, "on" | "isRunning" | "isPaused">;
interface WorkerRecord {
  id: string; label: string; queue: string; capacity: number;
  token: string; heartbeatAt?: number; stopped: boolean; paused: boolean;
}

/** Process-local observations only; never infer workers from queue availability. */
export class WorkerHealthRegistry {
  private records = new Map<string, WorkerRecord>();
  constructor(private now = () => Date.now(), private staleMs = 15000) {}
  register(id: string, label: string, queue: string, capacity: number) {
    const token = crypto.randomUUID();
    this.records.set(id, { id, label, queue, capacity, token, stopped: false, paused: false });
    const current = () => { const row = this.records.get(id); return row?.token === token ? row : undefined; };
    return {
      beat: () => { const row = current(); if (row && !row.stopped && !row.paused) row.heartbeatAt = this.now(); },
      pause: () => { const row = current(); if (row) row.paused = true; },
      resume: () => { const row = current(); if (row && !row.stopped) { row.paused = false; row.heartbeatAt = undefined; } },
      stop: () => { const row = current(); if (row) { row.stopped = true; row.heartbeatAt = undefined; } },
    };
  }
  snapshot(redisAvailable: boolean) {
    const items = [...this.records.values()].map(({ token: _token, stopped, paused, heartbeatAt, ...row }) => {
      void _token;
      const online = redisAvailable && !stopped && !paused && heartbeatAt !== undefined && this.now() - heartbeatAt < this.staleMs;
      return { ...row, heartbeatAt: heartbeatAt === undefined ? null : new Date(heartbeatAt).toISOString(), online, status: online ? "online" as const : "offline" as const, currentJobs: null };
    });
    return { online: items.filter((row) => row.online).length, total: items.length, capacity: items.filter((row) => row.online).reduce((sum, row) => sum + row.capacity, 0), currentJobs: null, items };
  }
}
export const workerHealth = new WorkerHealthRegistry();

export function observeWorker(worker: WorkerProbe, id: string, label: string, queue: string, capacity: number, connected: () => boolean) {
  const registration = workerHealth.register(id, label, queue, capacity);
  let ready = false;
  const heartbeat = () => { if (ready && connected() && worker.isRunning?.() && !worker.isPaused?.()) registration.beat(); };
  worker.on("ready", () => { ready = true; heartbeat(); });
  worker.on("paused", () => registration.pause());
  worker.on("resumed", () => { registration.resume(); heartbeat(); });
  worker.on("closed", () => { clearInterval(timer); registration.stop(); });
  const timer = setInterval(heartbeat, 5000); timer.unref();
  return { pause: registration.pause, stop: () => { clearInterval(timer); registration.stop(); } };
}
