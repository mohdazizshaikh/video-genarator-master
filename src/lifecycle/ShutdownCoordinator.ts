export type ShutdownPhase = "stop" | "drain" | "engines" | "cleanup";
type Resource = { name: string; phase: ShutdownPhase; close: () => void | Promise<void> };
export interface ShutdownResult { ok: boolean; timedOut: boolean; failures: string[] }

/** One ordered shutdown, with a total deadline shared across all phases. */
export class ShutdownCoordinator {
  private resources: Resource[] = [];
  private result?: Promise<ShutdownResult>;
  private stopping = false;

  constructor(private timeoutMs = 30000) {
    if (!Number.isFinite(timeoutMs) || timeoutMs < 1) throw new Error("Invalid shutdown deadline");
  }

  get isShuttingDown(): boolean { return this.stopping; }

  register(name: string, phase: ShutdownPhase, close: Resource["close"]): void {
    if (this.stopping) throw new Error("Cannot start a resource during shutdown");
    if (this.resources.some((resource) => resource.name === name)) throw new Error("Shutdown resource already registered");
    this.resources.push({ name, phase, close });
  }

  shutdown(): Promise<ShutdownResult> {
    if (!this.result) {
      this.stopping = true;
      this.result = this.run();
    }
    return this.result;
  }

  private async run(): Promise<ShutdownResult> {
    const deadline = Date.now() + this.timeoutMs;
    const failures: string[] = [];
    let timedOut = false;
    for (const phase of ["stop", "drain", "engines", "cleanup"] as const) {
      const resources = this.resources.filter((resource) => resource.phase === phase);
      if (!resources.length) continue;
      const operations = resources.map(async (resource) => {
        try { await resource.close(); }
        catch { failures.push(resource.name); }
      });
      let timer: ReturnType<typeof setTimeout> | undefined;
      const completed = await Promise.race([
        Promise.all(operations).then(() => true),
        new Promise<false>((resolve) => { timer = setTimeout(() => resolve(false), Math.max(0, deadline - Date.now())); }),
      ]);
      clearTimeout(timer);
      if (!completed) { timedOut = true; failures.push(`${phase}:deadline`); }
    }
    return { ok: !timedOut && failures.length === 0, timedOut, failures: [...failures] };
  }
}

interface SignalRuntime {
  on(signal: "SIGTERM" | "SIGINT", listener: () => void): unknown;
  removeListener(signal: "SIGTERM" | "SIGINT", listener: () => void): unknown;
  exit(code: number): unknown;
}

export function installShutdownHandlers(
  coordinator: ShutdownCoordinator,
  runtime: SignalRuntime,
  report: (result: ShutdownResult) => void,
): () => void {
  let signaled = false;
  const handler = () => {
    if (signaled) return;
    signaled = true;
    void coordinator.shutdown().then((result) => {
      try { report(result); } finally { runtime.exit(result.ok ? 0 : 1); }
    });
  };
  runtime.on("SIGTERM", handler);
  runtime.on("SIGINT", handler);
  return () => { runtime.removeListener("SIGTERM", handler); runtime.removeListener("SIGINT", handler); };
}
