/**
 * HealthRouter – Phase 4.4
 *
 * GET  /api/health        – liveness + readiness
 * GET  /api/health/queue  – BullMQ queue sizes
 * GET  /api/metrics       – Prometheus text output
 */
import { Router } from "express";
import type { Request, Response } from "express";
import os from "node:os";
import { statfs } from "node:fs/promises";
import fs from "fs-extra";
import path from "path";
import type { Config } from "../../config";
import { createRenderQueue, createPublishQueue, getRedisConnection, testRedisConnection } from "../../workers/QueueManager";
import { logger } from "../../logger";
import { RenderJobStore } from "../../db/RenderJobStore";
import { PublishJobStore } from "../../db/PublishJobStore";
import { AiLearningStore, type LearningEvent } from "../../db/AiLearningStore";
import { readiness } from "../readiness";
import { getAuthenticatedTenantId, requireAuth } from "../auth";

export class HealthRouter {
  public router: Router;
  private startedAt = Date.now();
  private renderJobStore: RenderJobStore;
  private publishJobStore: PublishJobStore;
  private aiLearningStore: AiLearningStore;

  constructor(private config: Config) {
    this.router = Router();
    this.renderJobStore = new RenderJobStore(config.dataDirPath);
    this.publishJobStore = new PublishJobStore(config.dataDirPath);
    this.aiLearningStore = new AiLearningStore(config.dataDirPath);
    this.registerRoutes();
  }

  private registerRoutes(): void {
    this.router.get("/", (req: Request, res: Response) => this.getHealth(req, res));
    this.router.get("/queue", (req: Request, res: Response) => this.getQueueStats(req, res));
    this.router.get("/queue/states", (req: Request, res: Response) => this.getQueueStates(req, res));
    this.router.get("/dashboard", requireAuth, (req: Request, res: Response) => this.getDashboard(req, res));
    this.router.get("/metrics", (req: Request, res: Response) => this.getMetrics(req, res));
  }

  private async getHealth(_req: Request, res: Response): Promise<void> {
    const redisOk = this.config.redisEnabled
      ? await testRedisConnection(this.config).catch(() => false)
      : null;

    const uptimeSeconds = Math.floor((Date.now() - this.startedAt) / 1000);
    const freeMb = Math.floor(os.freemem() / 1024 / 1024);
    const totalMb = Math.floor(os.totalmem() / 1024 / 1024);

    const redisHealthy = !this.config.redisEnabled || redisOk === true;
    const videoEngineHealthy = !readiness.videoEngineError;

    const healthy = redisHealthy && videoEngineHealthy;

    res.status(healthy ? 200 : 503).json({
      status: readiness.videoEngineError
        ? "degraded"
        : readiness.videoEngineReady
          ? "ok"
          : "initializing",
      uptime: uptimeSeconds,
      redis: this.config.redisEnabled ? (redisOk ? "ok" : "error") : "disabled",
      videoEngine: readiness.videoEngineError
        ? "error"
        : readiness.videoEngineReady
          ? "ready"
          : "initializing",
      memory: { freeMb, totalMb, usedPercent: Math.round((1 - freeMb / totalMb) * 100) },
      version: process.env.npm_package_version ?? "unknown",
    });
  }

  private async getQueueStats(_req: Request, res: Response): Promise<void> {
    if (!this.config.redisEnabled) {
      res.json({ redis: "disabled", queues: {} });
      return;
    }
    try {
      const renderQueue = createRenderQueue(this.config);
      const publishQueue = createPublishQueue(this.config);

      const [renderCounts, publishCounts] = await Promise.all([
        renderQueue.getJobCounts("active", "waiting", "completed", "failed", "delayed", "paused"),
        publishQueue.getJobCounts("active", "waiting", "completed", "failed", "delayed", "paused"),
      ]);

      res.json({
        render: renderCounts,
        publish: publishCounts,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err: message }, "Failed to fetch queue stats");
      res.status(500).json({ error: message });
    }
  }

  private async getQueueStates(_req: Request, res: Response): Promise<void> {
    try {
      const [renderJobs, publishJobs] = await Promise.all([
        this.renderJobStore.list(),
        this.publishJobStore.listJobs(),
      ]);

      const summarize = (records: Array<{ status: string }>) =>
        records.reduce<Record<string, number>>((acc, record) => {
          acc[record.status] = (acc[record.status] ?? 0) + 1;
          return acc;
        }, {});

      res.json({
        renderStates: summarize(renderJobs),
        publishStates: summarize(publishJobs),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err: message }, "Failed to fetch queue state visibility");
      res.status(500).json({ error: message });
    }
  }

  private async getDashboard(req: Request, res: Response): Promise<void> {
    const tenantId = getAuthenticatedTenantId(req);
    if (!tenantId) { res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" }); return; }
    try {
      const redisOk = this.config.redisEnabled
        ? await testRedisConnection(this.config).catch(() => false)
        : false;

      const [queueStats, queueStates, database, redis, system, events] = await Promise.all([
        this.buildQueueStats(redisOk),
        this.buildQueueStates(),
        this.buildDatabaseHealth(tenantId),
        this.buildRedisHealth(redisOk),
        this.buildSystemHealth(),
        this.aiLearningStore.listEventsForTenant(tenantId, 500),
      ]);

      const errors = this.buildErrorSummary(events);
      const slowRequests = this.buildSlowRequests(events);
      const workers = this.buildWorkerStatus(queueStats);
      const alerts = this.buildAlerts({
        redisStatus: redis.status,
        databaseStatus: database.status,
        queueStats,
        workers,
        system,
        errors,
      });

      const healthy = alerts.every((alert) => alert.severity !== "critical");

      res.json({
        status: healthy ? "ok" : "degraded",
        generatedAt: new Date().toISOString(),
        uptime: Math.floor((Date.now() - this.startedAt) / 1000),
        version: process.env.npm_package_version ?? "unknown",
        queue: queueStats,
        queueStates,
        workers,
        database,
        redis,
        system,
        errors,
        slowRequests,
        alerts,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ err: message }, "Failed to build health dashboard snapshot");
      res.status(500).json({ error: message });
    }
  }

  private async getMetrics(_req: Request, res: Response): Promise<void> {
    const uptimeSeconds = Math.floor((Date.now() - this.startedAt) / 1000);
    const freeMb = Math.floor(os.freemem() / 1024 / 1024);
    const totalMb = Math.floor(os.totalmem() / 1024 / 1024);
    const usedMem = process.memoryUsage();

    const lines = [
      `# HELP process_uptime_seconds Process uptime in seconds`,
      `process_uptime_seconds ${uptimeSeconds}`,
      `# HELP node_heap_used_bytes Heap memory used`,
      `node_heap_used_bytes ${usedMem.heapUsed}`,
      `# HELP node_heap_total_bytes Total heap allocated`,
      `node_heap_total_bytes ${usedMem.heapTotal}`,
      `# HELP os_free_memory_bytes OS free memory`,
      `os_free_memory_bytes ${freeMb * 1024 * 1024}`,
      `# HELP os_total_memory_bytes OS total memory`,
      `os_total_memory_bytes ${totalMb * 1024 * 1024}`,
    ];

    res.setHeader("Content-Type", "text/plain; version=0.0.4");
    res.send(lines.join("\n") + "\n");
  }

  private async buildQueueStats(redisOk: boolean) {
    const emptyCounts = { active: 0, waiting: 0, completed: 0, failed: 0, delayed: 0, paused: 0 };

    if (!this.config.redisEnabled || !redisOk) {
      return {
        redisEnabled: false,
        totals: {
          active: 0,
          waiting: 0,
          failed: 0,
          delayed: 0,
        },
        queues: [
          { id: "render", label: "Render", counts: emptyCounts },
          { id: "publish", label: "Publish", counts: emptyCounts },
        ],
      };
    }

    const renderQueue = createRenderQueue(this.config);
    const publishQueue = createPublishQueue(this.config);
    const [renderCounts, publishCounts] = await Promise.all([
      renderQueue.getJobCounts("active", "waiting", "completed", "failed", "delayed", "paused"),
      publishQueue.getJobCounts("active", "waiting", "completed", "failed", "delayed", "paused"),
    ]);

    return {
      redisEnabled: true,
      totals: {
        active: renderCounts.active + publishCounts.active,
        waiting: renderCounts.waiting + publishCounts.waiting,
        failed: renderCounts.failed + publishCounts.failed,
        delayed: renderCounts.delayed + publishCounts.delayed,
      },
      queues: [
        { id: "render", label: "Render", counts: renderCounts },
        { id: "publish", label: "Publish", counts: publishCounts },
      ],
    };
  }

  private async buildQueueStates() {
    const [renderJobs, publishJobs] = await Promise.all([
      this.renderJobStore.list(),
      this.publishJobStore.listJobs(),
    ]);

    const summarize = (records: Array<{ status: string }>) =>
      records.reduce<Record<string, number>>((acc, record) => {
        acc[record.status] = (acc[record.status] ?? 0) + 1;
        return acc;
      }, {});

    return {
      renderStates: summarize(renderJobs),
      publishStates: summarize(publishJobs),
    };
  }

  private async buildDatabaseHealth(tenantId: string) {
    const startedAt = Date.now();
    await Promise.all([
      this.renderJobStore.list(),
      this.publishJobStore.listJobs(),
      this.aiLearningStore.listEventsForTenant(tenantId, 50),
    ]);
    const latencyMs = Math.max(1, Date.now() - startedAt);
    const sizeBytes = await this.getDirectorySize(this.config.dataDirPath);

    return {
      status: latencyMs > 200 ? "degraded" : "ok",
      engine: "file-store",
      connections: {
        active: 1,
        max: 1,
      },
      latencyMs,
      sizeBytes,
      files: [
        path.join(this.config.dataDirPath, "renderJobs.json"),
        path.join(this.config.dataDirPath, "publishJobs.json"),
        path.join(this.config.dataDirPath, "ai-learning-events.json"),
      ],
    };
  }

  private async buildRedisHealth(redisOk: boolean) {
    if (!this.config.redisEnabled) {
      return {
        status: "disabled",
        enabled: false,
        latencyMs: null,
        memoryUsedBytes: null,
        memoryPeakBytes: null,
        hitRate: null,
        keyCount: 0,
      };
    }

    if (!redisOk) {
      return {
        status: "error",
        enabled: true,
        latencyMs: null,
        memoryUsedBytes: null,
        memoryPeakBytes: null,
        hitRate: null,
        keyCount: 0,
      };
    }

    const connection = getRedisConnection(this.config);
    const pingStartedAt = Date.now();
    await connection.ping();
    const latencyMs = Math.max(1, Date.now() - pingStartedAt);
    const [memoryInfo, statsInfo, keyCount] = await Promise.all([
      connection.info("memory"),
      connection.info("stats"),
      connection.dbsize(),
    ]);

    const memory = this.parseRedisInfo(memoryInfo);
    const stats = this.parseRedisInfo(statsInfo);
    const hits = Number(stats.keyspace_hits ?? 0);
    const misses = Number(stats.keyspace_misses ?? 0);
    const totalLookups = hits + misses;

    return {
      status: latencyMs > 50 ? "degraded" : "ok",
      enabled: true,
      latencyMs,
      memoryUsedBytes: Number(memory.used_memory ?? 0),
      memoryPeakBytes: Number(memory.used_memory_peak ?? 0),
      hitRate: totalLookups > 0 ? hits / totalLookups : 1,
      keyCount,
    };
  }

  private async buildSystemHealth() {
    const memoryPercent = Math.round((1 - os.freemem() / os.totalmem()) * 100);
    const cpuPercent = await this.sampleCpuPercent();
    const disk = await statfs(this.config.dataDirPath);
    const totalBlocks = Number(disk.blocks || 0);
    const availableBlocks = Number(disk.bavail || 0);
    const diskPercent = totalBlocks > 0
      ? Math.round((1 - availableBlocks / totalBlocks) * 100)
      : 0;

    return {
      cpuPercent,
      memoryPercent,
      diskPercent,
      loadAverage: os.loadavg().map((value) => Number(value.toFixed(2))),
    };
  }

  private buildErrorSummary(events: LearningEvent[]) {
    const now = Date.now();
    const last24h = events.filter((event) => now - new Date(event.createdAt).getTime() <= 24 * 60 * 60 * 1000);
    const failures = last24h.filter((event) => event.outcome === "failed");
    const bucketHours = 4;
    const buckets = Array.from({ length: 6 }, (_, index) => {
      const bucketEnd = now - (5 - index) * bucketHours * 60 * 60 * 1000;
      const bucketStart = bucketEnd - bucketHours * 60 * 60 * 1000;
      const count = failures.filter((event) => {
        const createdAt = new Date(event.createdAt).getTime();
        return createdAt > bucketStart && createdAt <= bucketEnd;
      }).length;

      return {
        label: new Date(bucketEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        count,
      };
    });

    return {
      last24h: failures.length,
      trend: buckets,
      recent: failures.slice(0, 8).map((event) => ({
        id: event.id,
        phase: event.phase,
        errorCode: event.errorCode ?? "unknown",
        createdAt: event.createdAt,
        latencyMs: event.latencyMs,
      })),
    };
  }

  private buildSlowRequests(events: LearningEvent[]) {
    return events
      .filter((event) => event.latencyMs > 1000)
      .sort((a, b) => b.latencyMs - a.latencyMs)
      .slice(0, 10)
      .map((event) => ({
        id: event.id,
        label: `${event.phase} job ${event.jobId}`,
        phase: event.phase,
        status: event.outcome,
        latencyMs: event.latencyMs,
        createdAt: event.createdAt,
        jobId: event.jobId,
      }));
  }

  private buildWorkerStatus(queueStats: Awaited<ReturnType<HealthRouter["buildQueueStats"]>>) {
    const definitions = [
      { id: "ingest", label: "Ingest Worker", queue: "ingest_queue", capacity: 5, currentJobs: 0 },
      { id: "planning", label: "Planning Worker", queue: "planning_queue", capacity: 3, currentJobs: 0 },
      { id: "render", label: "Render Worker", queue: "render_queue", capacity: this.config.renderWorkerConcurrency, currentJobs: queueStats.queues.find((queue) => queue.id === "render")?.counts.active ?? 0 },
      { id: "publish", label: "Publish Worker", queue: "publish_queue", capacity: this.config.publishWorkerConcurrency, currentJobs: queueStats.queues.find((queue) => queue.id === "publish")?.counts.active ?? 0 },
      { id: "deadletter", label: "Dead-letter Worker", queue: "deadletter_queue", capacity: 1, currentJobs: 0 },
    ];

    const workers = definitions.map((worker) => {
      const online = this.config.redisEnabled ? queueStats.redisEnabled : true;
      return {
        ...worker,
        online,
        status: online ? (worker.currentJobs >= worker.capacity && worker.capacity > 0 ? "busy" : "online") : "offline",
      };
    });

    return {
      online: workers.filter((worker) => worker.online).length,
      total: workers.length,
      capacity: workers.reduce((sum, worker) => sum + worker.capacity, 0),
      currentJobs: workers.reduce((sum, worker) => sum + worker.currentJobs, 0),
      items: workers,
    };
  }

  private buildAlerts(params: {
    redisStatus: string;
    databaseStatus: string;
    queueStats: Awaited<ReturnType<HealthRouter["buildQueueStats"]>>;
    workers: ReturnType<HealthRouter["buildWorkerStatus"]>;
    system: Awaited<ReturnType<HealthRouter["buildSystemHealth"]>>;
    errors: ReturnType<HealthRouter["buildErrorSummary"]>;
  }) {
    const alerts: Array<{ id: string; severity: "info" | "warning" | "critical"; title: string; description: string }> = [];

    if (params.redisStatus === "error") {
      alerts.push({
        id: "redis-down",
        severity: "critical",
        title: "Redis is unavailable",
        description: "BullMQ-backed queue metrics and worker orchestration are degraded until Redis reconnects.",
      });
    }

    if (params.databaseStatus !== "ok") {
      alerts.push({
        id: "db-latency",
        severity: "warning",
        title: "Database latency is elevated",
        description: "The file-backed data store is responding slower than expected. Review disk performance and file growth.",
      });
    }

    if (params.queueStats.totals.failed > 0) {
      alerts.push({
        id: "queue-failures",
        severity: params.queueStats.totals.failed > 5 ? "critical" : "warning",
        title: "Failed jobs detected",
        description: `${params.queueStats.totals.failed} jobs are currently marked failed across render and publish queues.`,
      });
    }

    if (params.errors.last24h > 10) {
      alerts.push({
        id: "error-rate",
        severity: "warning",
        title: "Error rate spiked in the last 24 hours",
        description: `${params.errors.last24h} failed operations were recorded in the latest 24-hour window.`,
      });
    }

    if (params.system.cpuPercent > 85 || params.system.memoryPercent > 85 || params.system.diskPercent > 90) {
      alerts.push({
        id: "resource-pressure",
        severity: "critical",
        title: "System resource pressure is high",
        description: `CPU ${params.system.cpuPercent}%, memory ${params.system.memoryPercent}%, disk ${params.system.diskPercent}%.`,
      });
    }

    if (params.workers.online === 0) {
      alerts.push({
        id: "workers-offline",
        severity: "critical",
        title: "No workers are online",
        description: "Queue processing is stalled because no queue workers are reporting online capacity.",
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        id: "stable",
        severity: "info",
        title: "No critical system alerts",
        description: "Queues, resources, and persisted job telemetry are within expected operating ranges.",
      });
    }

    return alerts;
  }

  private parseRedisInfo(info: string) {
    return info.split("\n").reduce<Record<string, string>>((acc, line) => {
      if (!line || line.startsWith("#") || !line.includes(":")) {
        return acc;
      }
      const [key, ...rest] = line.trim().split(":");
      acc[key] = rest.join(":");
      return acc;
    }, {});
  }

  private async sampleCpuPercent(sampleMs = 150): Promise<number> {
    const first = this.readCpuTotals();
    await new Promise((resolve) => setTimeout(resolve, sampleMs));
    const second = this.readCpuTotals();
    const idleDelta = second.idle - first.idle;
    const totalDelta = second.total - first.total;

    if (totalDelta <= 0) {
      return 0;
    }

    return Math.round((1 - idleDelta / totalDelta) * 100);
  }

  private readCpuTotals() {
    return os.cpus().reduce(
      (acc, cpu) => {
        const total = Object.values(cpu.times).reduce((sum, value) => sum + value, 0);
        acc.idle += cpu.times.idle;
        acc.total += total;
        return acc;
      },
      { idle: 0, total: 0 },
    );
  }

  private async getDirectorySize(targetPath: string): Promise<number> {
    const stat = await fs.stat(targetPath);
    if (stat.isFile()) {
      return stat.size;
    }

    const entries = await fs.readdir(targetPath);
    const sizes = await Promise.all(entries.map((entry) => this.getDirectorySize(path.join(targetPath, entry))));
    return sizes.reduce((sum, size) => sum + size, 0);
  }
}
