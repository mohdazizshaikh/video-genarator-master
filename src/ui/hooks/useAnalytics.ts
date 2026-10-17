/**
 * useAnalytics Hook - Fetch and manage analytics data
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../services/apiClient";

export type DateRange = "7d" | "30d" | "90d" | "custom";

export interface VideoAnalytics {
  videoId: string;
  title: string;
  platform: string;
  views: number;
  likes: number;
  shares: number;
  comments: number;
  ctr: number;
  watchTime: number;
  date: string;
}

export interface TimeSeriesPoint {
  date: string;
  views: number;
  engagement: number;
  likes: number;
  shares: number;
}

export interface PlatformMetrics {
  platform: string;
  views: number;
  likes: number;
  shares: number;
  comments: number;
  ctr: number;
}

export interface KPIsummary {
  totalViews: number;
  totalEngagement: number;
  avgCTR: number;
  trendingScore: number;
  viewsChange: number;        // % change vs previous period
  engagementChange: number;   // % change vs previous period
  ctrChange: number;          // % change vs previous period
  trendingChange: number;     // % change vs previous period
}

export interface AnalyticsDashboardData {
  kpis: KPIsummary;
  timeSeries: TimeSeriesPoint[];
  platformMetrics: PlatformMetrics[];
  topVideos: VideoAnalytics[];
  heatmapData: { day: number; hour: number; value: number }[];
}

interface UseAnalyticsState {
  data: AnalyticsDashboardData | null;
  loading: boolean;
  error: string | null;
  dateRange: DateRange;
  customStart: string;
  customEnd: string;
}

interface UseAnalyticsReturn extends UseAnalyticsState {
  setDateRange: (range: DateRange) => void;
  setCustomStart: (date: string) => void;
  setCustomEnd: (date: string) => void;
  refresh: () => void;
  exportCSV: () => void;
}

function getDateRangeDates(range: DateRange, customStart?: string, customEnd?: string) {
  const end = new Date();
  const start = new Date();

  if (range === "7d") start.setDate(end.getDate() - 7);
  else if (range === "30d") start.setDate(end.getDate() - 30);
  else if (range === "90d") start.setDate(end.getDate() - 90);
  else if (range === "custom" && customStart && customEnd) {
    return { start: customStart, end: customEnd };
  }

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

/** Build mock analytics data from raw API responses (API may return partial data) */
function normalizeAnalyticsData(raw: unknown): AnalyticsDashboardData {
  const data = (raw as Record<string, unknown>) || {};

  const videos: VideoAnalytics[] = (data.videos as VideoAnalytics[]) || [];
  const timeSeries: TimeSeriesPoint[] = (data.timeSeries as TimeSeriesPoint[]) || [];
  const platforms: PlatformMetrics[] = (data.platformMetrics as PlatformMetrics[]) || [];

  const totalViews = videos.reduce((s, v) => s + (v.views || 0), 0);
  const totalLikes = videos.reduce((s, v) => s + (v.likes || 0), 0);
  const totalShares = videos.reduce((s, v) => s + (v.shares || 0), 0);
  const totalEngagement = totalLikes + totalShares;
  const avgCTR = videos.length > 0 ? videos.reduce((s, v) => s + (v.ctr || 0), 0) / videos.length : 0;

  const kpis: KPIsummary = (data.kpis as KPIsummary) || {
    totalViews,
    totalEngagement,
    avgCTR: Math.round(avgCTR * 100) / 100,
    trendingScore: Math.min(100, Math.round((totalEngagement / Math.max(1, totalViews)) * 1000)),
    viewsChange: 0,
    engagementChange: 0,
    ctrChange: 0,
    trendingChange: 0,
  };

  // Build heatmap data (day x hour) if not provided
  const heatmapData = (data.heatmapData as { day: number; hour: number; value: number }[]) || [];

  // Sort top videos by views desc
  const topVideos = [...videos]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 20);

  return { kpis, timeSeries, platformMetrics: platforms, topVideos, heatmapData };
}

export function useAnalytics(): UseAnalyticsReturn {
  const [state, setState] = useState<UseAnalyticsState>({
    data: null,
    loading: false,
    error: null,
    dateRange: "30d",
    customStart: "",
    customEnd: "",
  });

  const fetchAnalytics = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const { start, end } = getDateRangeDates(
        state.dateRange,
        state.customStart,
        state.customEnd,
      );

      // Try dashboard endpoint first, fall back to videos endpoint
      let raw: unknown;
      try {
        raw = await apiClient.get(`/api/marketing/dashboard?start=${start}&end=${end}`);
      } catch {
        // Fallback: get video analytics
        raw = await apiClient.get(`/api/marketing/analytics?start=${start}&end=${end}`);
      }

      const normalized = normalizeAnalyticsData(raw);
      setState((prev) => ({ ...prev, data: normalized, loading: false }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load analytics";
      setState((prev) => ({ ...prev, error: message, loading: false }));
    }
  }, [state.dateRange, state.customStart, state.customEnd]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const exportCSV = useCallback(() => {
    if (!state.data) return;

    const headers = ["Video ID", "Title", "Platform", "Views", "Likes", "Shares", "Comments", "CTR", "Date"];
    const rows = state.data.topVideos.map((v) => [
      v.videoId,
      `"${(v.title || "").replace(/"/g, '""')}"`,
      v.platform,
      v.views,
      v.likes,
      v.shares,
      v.comments,
      v.ctr,
      v.date,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [state.data]);

  return {
    ...state,
    setDateRange: (range) => setState((prev) => ({ ...prev, dateRange: range })),
    setCustomStart: (date) => setState((prev) => ({ ...prev, customStart: date })),
    setCustomEnd: (date) => setState((prev) => ({ ...prev, customEnd: date })),
    refresh: fetchAnalytics,
    exportCSV,
  };
}

export default useAnalytics;
