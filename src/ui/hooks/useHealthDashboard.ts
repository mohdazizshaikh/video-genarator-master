import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../services/apiClient";
import useAuthStore from "../store/authStore";

export interface QueueCounts {
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

export interface HealthDashboardData {
  status: "ok" | "degraded";
  generatedAt: string;
  scope?: "workspace" | "operations";
  uptime: number | null;
  version: string | null;
  queue: {
    redisEnabled: boolean;
    totals: {
      active: number;
      waiting: number;
      failed: number;
      delayed: number;
    };
    queues: Array<{
      id: string;
      label: string;
      counts: QueueCounts;
    }>;
  };
  queueStates: {
    renderStates: Record<string, number>;
    publishStates: Record<string, number>;
  };
  workers: {
    online: number;
    total: number;
    capacity: number;
    currentJobs: number | null;
    items: Array<{
      id: string;
      label: string;
      queue: string;
      capacity: number;
      currentJobs: number | null;
      online: boolean;
      status: "online" | "offline" | "busy";
    }>;
  } | null;
  database: {
    status: "ok" | "degraded";
    engine: string;
    connections: {
      active: number | null;
      max: number | null;
    };
    latencyMs: number;
    sizeBytes: number;
    files: string[];
  } | null;
  redis: {
    status: "ok" | "degraded" | "error" | "disabled";
    enabled: boolean;
    latencyMs: number | null;
    memoryUsedBytes: number | null;
    memoryPeakBytes: number | null;
    hitRate: number | null;
    keyCount: number;
  } | null;
  system: {
    cpuPercent: number;
    memoryPercent: number;
    diskPercent: number;
    loadAverage: number[];
  } | null;
  errors: {
    last24h: number;
    trend: Array<{
      label: string;
      count: number;
    }>;
    recent: Array<{
      id: string;
      phase: string;
      errorCode: string;
      createdAt: string;
      latencyMs: number;
    }>;
  };
  slowRequests: Array<{
    id: string;
    label: string;
    phase: string;
    status: string;
    latencyMs: number;
    createdAt: string;
    jobId: string;
  }>;
  alerts: Array<{
    id: string;
    severity: "info" | "warning" | "critical";
    title: string;
    description: string;
  }>;
}

export async function executeHealthDashboardFetch(
  fetchDashboard: () => Promise<HealthDashboardData>,
): Promise<{ data: HealthDashboardData | null; error: string | null }> {
  try {
    const data = await fetchDashboard();
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to load health dashboard",
    };
  }
}

export function useHealthDashboard(options: { autoLoad?: boolean } = {}) {
  const { autoLoad = true } = options;
  const [data, setData] = useState<HealthDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = useAuthStore((state) => Boolean(state.token && state.user));

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setData(null);
      setError("Authentication required");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const result = await executeHealthDashboardFetch(async () => {
        const response = await apiClient.getAxiosInstance().get<HealthDashboardData>("/api/health/dashboard");
        return response.data;
      });

      setData(result.data);
      setError(result.error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (autoLoad && isAuthenticated) {
      void refresh();
    }
  }, [autoLoad, isAuthenticated, refresh]);

  return {
    data,
    loading,
    error,
    refresh,
  };
}

export default useHealthDashboard;
