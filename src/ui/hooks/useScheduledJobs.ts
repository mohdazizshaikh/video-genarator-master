/**
 * useScheduledJobs Hook – fetch queue stats and render/publish job lists
 */

import { useState, useEffect, useCallback } from "react";
import { api } from "../services/apiClient";

export interface QueueCounts {
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface QueueStats {
  render: QueueCounts;
  publish: QueueCounts;
  redisEnabled: boolean;
}

export interface RenderJob {
  videoId?: string;
  artifactId?: string;
  contentVersionId?: string;
  executionId?: string;
  error?: string;
  id: string;
  status: "scheduled" | "queued" | "pending" | "processing" | "ready" | "rendered" | "completed" | "failed" | "skipped" | "reconciling";
  category: string;
  orientation: string;
  videoType: string;
  language: string;
  createdAt: string;
  updatedAt?: string;
  namingKey?: string;
}

export interface PublishJob {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  platform: string;
  videoId?: string;
  title?: string;
  scheduledAt?: string;
  publishedAt?: string;
  createdAt: string;
  error?: string;
}

export interface ScheduledJobsData {
  queueStats: QueueStats;
  renderJobs: RenderJob[];
  publishJobs: PublishJob[];
}

const EMPTY_COUNTS: QueueCounts = { active: 0, waiting: 0, completed: 0, failed: 0, delayed: 0, paused: 0 };

function normalizeQueueStats(raw: unknown): QueueStats {
  const d = (raw as Record<string, unknown>) || {};
  if (d.redis === "disabled") {
    return { render: EMPTY_COUNTS, publish: EMPTY_COUNTS, redisEnabled: false };
  }
  const render = (d.render as QueueCounts) || EMPTY_COUNTS;
  const publish = (d.publish as QueueCounts) || EMPTY_COUNTS;
  return { render, publish, redisEnabled: d.redisEnabled !== false };
}

export function normalizeRenderJobs(raw: unknown): RenderJob[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: Record<string, unknown>) => ({
    id: String(item.id || ""),
    status: (item.status as RenderJob["status"]) || "pending",
    videoId: typeof item.videoId === "string" ? item.videoId : undefined,
    artifactId: typeof item.artifactId === "string" ? item.artifactId : undefined,
    contentVersionId: typeof item.contentVersionId === "string" ? item.contentVersionId : undefined,
    executionId: typeof item.executionId === "string" ? item.executionId : undefined,
    error: typeof item.error === "string" ? item.error : undefined,
    category: String(item.category || ""),
    orientation: String(item.orientation || ""),
    videoType: String(item.videoType || "short"),
    language: String(item.language || "en"),
    createdAt: String(item.createdAt || new Date().toISOString()),
    updatedAt: item.updatedAt ? String(item.updatedAt) : undefined,
    namingKey: item.namingKey ? String(item.namingKey) : undefined,
  }));
}

function normalizePublishJobs(raw: unknown): PublishJob[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: Record<string, unknown>) => ({
    id: String(item.id || ""),
    status: (item.status as PublishJob["status"]) || "queued",
    platform: String(item.platform || ""),
    videoId: item.videoId ? String(item.videoId) : undefined,
    title: item.title ? String(item.title) : undefined,
    scheduledAt: item.scheduledAt ? String(item.scheduledAt) : undefined,
    publishedAt: item.publishedAt ? String(item.publishedAt) : undefined,
    createdAt: String(item.createdAt || new Date().toISOString()),
    error: item.error ? String(item.error) : undefined,
  }));
}

/** Read real persisted render executions; do not substitute video-library rows
 * or turn a failed store/API request into a misleading empty scheduler. */
export async function loadScheduledJobs(): Promise<ScheduledJobsData> {
  const [queue, renders, publishes] = await Promise.all([
    api.queue.getStatus(), api.queue.listRenderJobs(), api.publish.list(),
  ]);
  return { queueStats: normalizeQueueStats(queue), renderJobs: normalizeRenderJobs(renders), publishJobs: normalizePublishJobs(publishes) };
}

export interface UseScheduledJobsReturn {
  data: ScheduledJobsData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useScheduledJobs(options: { autoLoad?: boolean } = {}): UseScheduledJobsReturn {
  const { autoLoad = true } = options;
  const [data, setData] = useState<ScheduledJobsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loadScheduledJobs());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load scheduler data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      void fetch();
    }
  }, [autoLoad, fetch]);

  return { data, loading, error, refresh: fetch };
}
