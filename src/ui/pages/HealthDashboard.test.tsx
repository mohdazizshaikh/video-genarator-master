import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { HealthDashboardData } from "../hooks/useHealthDashboard";

const useHealthDashboardMock = vi.fn();

vi.mock("../hooks/useHealthDashboard", () => ({
  useHealthDashboard: () => useHealthDashboardMock(),
}));

import HealthDashboard from "./HealthDashboard";

const dashboardFixture: HealthDashboardData = {
  status: "degraded",
  generatedAt: "2026-03-26T12:00:00.000Z",
  uptime: 10800,
  version: "1.3.4",
  queue: {
    redisEnabled: true,
    totals: { active: 4, waiting: 6, failed: 2, delayed: 1 },
    queues: [
      {
        id: "render",
        label: "Render",
        counts: { active: 2, waiting: 3, completed: 11, failed: 1, delayed: 0, paused: 0 },
      },
      {
        id: "publish",
        label: "Publish",
        counts: { active: 2, waiting: 3, completed: 9, failed: 1, delayed: 1, paused: 0 },
      },
    ],
  },
  queueStates: {
    renderStates: { queued: 3, completed: 11 },
    publishStates: { processing: 2, failed: 1 },
  },
  workers: {
    online: 4,
    total: 5,
    capacity: 13,
    currentJobs: 4,
    items: [
      {
        id: "render",
        label: "Render Worker",
        queue: "render_queue",
        capacity: 1,
        currentJobs: 1,
        online: true,
        status: "busy",
      },
    ],
  },
  database: {
    status: "degraded",
    engine: "file-store",
    connections: { active: 1, max: 1 },
    latencyMs: 250,
    sizeBytes: 1048576,
    files: ["renderJobs.json"],
  },
  redis: {
    status: "error",
    enabled: true,
    latencyMs: null,
    memoryUsedBytes: null,
    memoryPeakBytes: null,
    hitRate: null,
    keyCount: 0,
  },
  system: {
    cpuPercent: 87,
    memoryPercent: 73,
    diskPercent: 64,
    loadAverage: [1.1, 1.3, 1.5],
  },
  errors: {
    last24h: 7,
    trend: [
      { label: "08:00", count: 1 },
      { label: "12:00", count: 3 },
    ],
    recent: [{ id: "err-1", phase: "publish", errorCode: "timeout", createdAt: "2026-03-26T11:00:00.000Z", latencyMs: 4200 }],
  },
  slowRequests: [
    { id: "slow-1", label: "publish job job-1", phase: "publish", status: "failed", latencyMs: 4200, createdAt: "2026-03-26T11:00:00.000Z", jobId: "job-1" },
  ],
  alerts: [
    { id: "redis-down", severity: "critical", title: "Redis is unavailable", description: "BullMQ-backed queue metrics and worker orchestration are degraded until Redis reconnects." },
  ],
};

describe("HealthDashboard", () => {
  it("renders the main dashboard sections from hook data", () => {
    useHealthDashboardMock.mockReturnValue({
      data: dashboardFixture,
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    const markup = renderToStaticMarkup(<HealthDashboard />);

    expect(markup).toContain("System Health Dashboard");
    expect(markup).toContain("Queue stats");
    expect(markup).toContain("Worker status");
    expect(markup).toContain("Database health");
    expect(markup).toContain("Redis health");
    expect(markup).toContain("Slow requests log");
    expect(markup).toContain("Redis is unavailable");
    expect(markup).toContain("Degraded");
    expect(markup).not.toContain("Loading system health...");
  });

  it("renders loading and error states from the hook", () => {
    useHealthDashboardMock.mockReturnValue({
      data: null,
      loading: true,
      error: "health endpoint unavailable",
      refresh: vi.fn(),
    });

    const markup = renderToStaticMarkup(<HealthDashboard />);

    expect(markup).toContain("Loading system health...");
    expect(markup).toContain("health endpoint unavailable");
  });
});

it("renders workspace telemetry without operational resources or invented capacity", () => {
  useHealthDashboardMock.mockReturnValue({ data: { ...dashboardFixture, scope: "workspace", uptime: null, version: null, workers: null, database: null, redis: null, system: null, alerts: [] }, loading: false, error: null, refresh: vi.fn() });
  const markup = renderToStaticMarkup(<HealthDashboard />);
  expect(markup).toContain("Counts and events are limited to this workspace");
  expect(markup).toContain("Persisted jobs");
  expect(markup).not.toContain("Worker status"); expect(markup).not.toContain("Database health"); expect(markup).not.toContain("System resources");
});
