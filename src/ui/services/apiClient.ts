/**
 * API Client Service
 * Centralized HTTP client for all backend API calls with error handling, caching, and retry logic
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from "axios";
import { isApiOrigin } from "./apiOrigin";
import useAuthStore from "../store/authStore";

/**
 * API Response wrapper type
 */
export interface ApiResponse<T = unknown> {
  status: string;
  data?: T;
  error?: string;
  details?: unknown;
}

/**
 * API Error type
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Normalize a backend response into its payload.
 *
 * Many endpoints return an envelope like `{ status: "ok", data: ... }`, but
 * some return the payload directly (e.g. `{ videoId }` or a plain array).
 * Instead of assuming `.data` always exists, unwrap only when the response is
 * actually an envelope, and pass everything else through untouched.
 */
function unwrap<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    "status" in payload &&
    "data" in payload
  ) {
    return (payload as { data: T }).data as T;
  }
  return payload as T;
}

/**
 * Cache entry for GET requests
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * API Client Service with caching and error handling
 */
class ApiClientService {
  private axiosInstance: AxiosInstance;
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private requestCache: Map<string, Promise<unknown>> = new Map();
  private sessionVersion = 0;
  private readonly DEFAULT_CACHE_TTL = 60000; // 1 minute
  private readonly DEFAULT_REQUEST_TIMEOUT = 900000; // 15 minutes

  constructor() {
    const viteEnv =
      typeof import.meta !== "undefined"
        ? (import.meta as ImportMeta & {
            env?: {
              VITE_API_URL?: string;
              VITE_API_BASE_URL?: string;
            };
          }).env
        : undefined;

    const baseURL =
      viteEnv?.VITE_API_URL ||
      viteEnv?.VITE_API_BASE_URL ||
      process.env.REACT_APP_API_URL ||
      "";

    this.axiosInstance = axios.create({
      baseURL,
      timeout: this.DEFAULT_REQUEST_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
      },
    });

    useAuthStore.subscribe((state, previous) => {
      if (
        state.token !== previous.token ||
        state.user?.tenantId !== previous.user?.tenantId ||
        state.user?.id !== previous.user?.id
      ) {
        this.sessionVersion += 1;
        this.clearCache();
      }
    });

    // Request interceptor: use the single persisted auth source for same-origin API calls.
    // Never forward application credentials to absolute third-party URLs.
    this.axiosInstance.interceptors.request.use((config) => {
      const token = useAuthStore.getState().token;
      const requestUrl = config.url || "";
      if (token && !isApiOrigin(requestUrl, baseURL) &&
        config.headers.get("Authorization") === `Bearer ${token}`
      )
        config.headers.delete("Authorization");
      if (token && isApiOrigin(requestUrl, baseURL)) {
        if (
          config.headers &&
          typeof (config.headers as { set?: unknown }).set === "function"
        ) {
          (
            config.headers as { set: (name: string, value: string) => void }
          ).set("Authorization", `Bearer ${token}`);
        } else {
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${token}`,
          } as typeof config.headers;
        }
      }
      return config;
    });

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiResponse>) => {
        const status = error.response?.status || 500;
        const message =
          error.response?.data?.error || error.message || "Unknown error";
        const details = error.response?.data?.details;

        // A persisted token can outlive its JWT. Clear it only after a protected
        // request actually receives 401; failed login attempts must remain local
        // form errors rather than causing a redirect loop.
        const requestUrl = error.config?.url || "";
        if (
          status === 401 &&
          !requestUrl.includes("/api/system-engines/auth/") &&
          typeof window !== "undefined" &&
          error.config?.headers?.get("Authorization") ===
            `Bearer ${useAuthStore.getState().token}`
        ) {
          useAuthStore.getState().logout();
          window.dispatchEvent(new CustomEvent("auth-expired"));
        }

        throw new ApiError(status, message, details);
      },
    );
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    this.requestCache.clear();
  }

  /**
   * Clear specific cache entry
   */
  clearCacheKey(key: string): void {
    this.cache.delete(key);
    this.requestCache.delete(key);
  }

  /**
   * Get cached data if valid
   */
  private getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cached data
   */
  private setCachedData<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * GET request with caching support
   */
  async get<T = unknown>(
    url: string,
    config?: AxiosRequestConfig & { cacheTTL?: number },
  ): Promise<T> {
    const cacheTTL = config?.cacheTTL ?? this.DEFAULT_CACHE_TTL;
    const sessionVersion = this.sessionVersion;
    const cacheKey = `GET:${sessionVersion}:${this.axiosInstance.getUri({ url, params: config?.params })}:${config?.responseType || "json"}`;

    // Check cache first
    const cachedData = cacheTTL > 0 ? this.getCachedData<T>(cacheKey) : null;
    if (cachedData !== null) {
      return cachedData;
    }

    // Prevent duplicate requests for same endpoint
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey) as Promise<T>;
    }

    // Make the request
    const requestPromise = (async () => {
      try {
        const { data } = await this.axiosInstance.get<ApiResponse<T>>(
          url,
          config,
        );
        const result = unwrap<T>(data);
        if (sessionVersion !== this.sessionVersion)
          throw new ApiError(
            409,
            "Session changed while the request was in flight",
          );
        if (cacheTTL > 0) this.setCachedData(cacheKey, result, cacheTTL);
        this.requestCache.delete(cacheKey);
        return result;
      } catch (error) {
        this.requestCache.delete(cacheKey);
        throw error;
      }
    })();

    this.requestCache.set(cacheKey, requestPromise);
    return requestPromise;
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const { data: responseData } = await this.axiosInstance.post<
      ApiResponse<T>
    >(url, data, config);
    return unwrap<T>(responseData);
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const { data: responseData } = await this.axiosInstance.put<ApiResponse<T>>(
      url,
      data,
      config,
    );
    return unwrap<T>(responseData);
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const { data: responseData } = await this.axiosInstance.patch<
      ApiResponse<T>
    >(url, data, config);
    return unwrap<T>(responseData);
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const { data: responseData } = await this.axiosInstance.delete<
      ApiResponse<T>
    >(url, config);
    return unwrap<T>(responseData);
  }

  /**
   * Get raw axios instance for advanced usage
   */
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

// Export singleton instance
export const apiClient = new ApiClientService();

/**
 * API methods grouped by resource
 */
export const api = {
  // Videos
  videos: {
    create: (data: unknown) => apiClient.post("/api/short-video", data),
    getStatus: (videoId: string) =>
      apiClient.get(`/api/short-video/${videoId}/status`),
    getMetadata: (videoId: string) =>
      apiClient.get(`/api/short-video/${videoId}/metadata`),
    download: (videoId: string) =>
      apiClient.get(`/api/short-video/${videoId}`, { responseType: "blob" }),
    getRenderPath: (videoId: string) =>
      apiClient.get<{ path: string }>(
        `/api/short-video/${videoId}/render-path`,
      ),
    list: () =>
      apiClient.get(`/api/short-videos`).then((raw) => {
        const videos = (raw as { videos?: unknown[] })?.videos;
        return Array.isArray(videos) ? videos : [];
      }),
    delete: (videoId: string) =>
      apiClient.delete(`/api/short-video/${videoId}`),
  },

  // Music & Voices
  music: {
    getTags: () => apiClient.get("/api/music-tags"),
    getVoices: () => apiClient.get("/api/voices"),
    stream: (fileName: string) =>
      apiClient.get(`/api/music/${fileName}`, { responseType: "blob" }),
  },

  // News & Reports
  news: {
    getSources: () => apiClient.get("/api/news-sources"),
    getReports: () => apiClient.get("/api/reports"),
    getReport: (reportId: string) => apiClient.get(`/api/reports/${reportId}`),
    fetch: (sourceId: string) =>
      apiClient.post("/api/reports/fetch", { sourceId }),
    merge: (data: unknown) => apiClient.post("/api/reports/merge", data),
  },

  // Scripts
  scripts: {
    getPlans: () => apiClient.get("/api/script-plans"),
    autoScript: (sourceId: string) =>
      apiClient.post("/api/auto-script", { sourceId }),
  },

  // Queue
  queue: {
    bulkEnqueue: (data: unknown) => apiClient.post("/api/queue/bulk", data),
    listRenderJobs: () => apiClient.get<unknown[]>("/api/queue/render-jobs", { cacheTTL: 0 }),
    getStatus: async () => {
      const snapshot = await apiClient.get<{ queue: { redisEnabled: boolean; queues: Array<{ id: string; counts: unknown }> } }>("/api/health/dashboard", { cacheTTL: 0 });
      return { render: snapshot.queue.queues.find((queue) => queue.id === "render")?.counts, publish: snapshot.queue.queues.find((queue) => queue.id === "publish")?.counts, redisEnabled: snapshot.queue.redisEnabled, source: "workspace_dashboard" };
    },
    getStates: () => apiClient.get("/api/health/queue/states"),
  },

  // Publishing
  publish: {
    enqueue: (data: unknown) => apiClient.post("/api/publish", data),
    getMetadataSuggestions: (data: unknown) =>
      apiClient.post("/api/publish/metadata-suggestions", data),
    list: () => apiClient.get("/api/publish"),
    getJob: (jobId: string) => apiClient.get(`/api/publish/${jobId}`),
  },

  // Health & Metrics
  health: {
    check: () => apiClient.get("/api/health"),
    metrics: () => apiClient.get("/api/health/metrics"),
  },

  // Marketing
  marketing: {
    audience: {
      create: (data: unknown) =>
        apiClient.post("/api/marketing/audience", data),
      list: () => apiClient.get("/api/marketing/audience"),
    },
    analytics: {
      upsert: (data: unknown) =>
        apiClient.post("/api/marketing/analytics", data),
      getByVideo: (videoId: string) =>
        apiClient.get(`/api/marketing/analytics/${videoId}`),
      dashboard: () => apiClient.get("/api/marketing/dashboard"),
    },
    seo: {
      optimize: (data: unknown) =>
        apiClient.post("/api/marketing/seo/optimize", data),
    },
    variants: {
      create: (data: unknown) =>
        apiClient.post("/api/marketing/ab/variants", data),
      list: (videoId: string) =>
        apiClient.get(`/api/marketing/ab/variants/${videoId}`),
      getResults: (testId: string) =>
        apiClient.get(`/api/abtesting/${testId}/analyze`),
      assign: (videoId: string) =>
        apiClient.post(`/api/marketing/ab/assign/${videoId}`, {}),
    },
  },

  // AI
  ai: {
    addEvent: (data: unknown) => apiClient.post("/api/ai/events", data),
    listEvents: (limit?: number) =>
      apiClient.get(`/api/ai/events?limit=${limit || 200}`),
    train: () => apiClient.post("/api/ai/train", {}),
    getModel: () => apiClient.get("/api/ai/model"),
    getSuggestion: (data: unknown) => apiClient.post("/api/ai/suggest", data),
    dashboard: () => apiClient.get("/api/ai/dashboard"),
  },

  // Content
  content: {
    ideate: (data: unknown) => apiClient.post("/api/content/ideation", data),
    getEditingSuggestions: (data: unknown) =>
      apiClient.post("/api/content/editing-primitives", data),
    personalize: (data: unknown) =>
      apiClient.post("/api/content/personalize", data),
    addInteractive: (data: unknown) =>
      apiClient.post("/api/content/interactive", data),
    moderate: (text: string) =>
      apiClient.post("/api/content/moderate", { text }),
    optimizeByTrends: (data: unknown) =>
      apiClient.post("/api/content/trend-optimize", data),
    getAccessibility: (script: string) =>
      apiClient.post("/api/content/accessibility", { script }),
  },

  // Tenants (Multi-tenant)
  tenants: {
    list: () => apiClient.get("/api/tenants"),
    create: (data: unknown) => apiClient.post("/api/tenants", data),
    get: (tenantId: string) => apiClient.get(`/api/tenants/${tenantId}`),
    update: (tenantId: string, data: unknown) =>
      apiClient.put(`/api/tenants/${tenantId}`, data),
    keys: {
      list: (tenantId: string) =>
        apiClient.get(`/api/tenants/${tenantId}/keys`),
      create: (tenantId: string, data: unknown) =>
        apiClient.post(`/api/tenants/${tenantId}/keys`, data),
      update: (tenantId: string, data: unknown) =>
        apiClient.post(`/api/tenants/${tenantId}/keys`, data),
      regenerate: (tenantId: string, data: unknown) =>
        apiClient.post(`/api/tenants/${tenantId}/keys`, data),
      delete: (tenantId: string, keyId: string) =>
        apiClient.delete(`/api/tenants/${tenantId}/keys/${keyId}`),
    },
    billing: {
      get: (tenantId: string, month?: string) =>
        apiClient.get(
          `/api/tenants/${tenantId}/billing${month ? `?month=${month}` : ""}`,
        ),
    },
    quota: {
      get: (tenantId: string) =>
        apiClient.get(`/api/tenants/${tenantId}/quota`),
    },
    logs: {
      write: (tenantId: string, engine: string, data: unknown) =>
        apiClient.post(`/api/tenants/${tenantId}/logs/${engine}`, data),
    },
  },

  // Temp files
  files: {
    getTempFile: (fileName: string) =>
      apiClient.get(`/api/tmp/${fileName}`, { responseType: "blob" }),
  },

  // Channel configuration
  channels: {
    list: () => apiClient.get("/api/channel-configs"),
    create: (data: unknown) => apiClient.post("/api/channel-configs", data),
    remove: (id: string) => apiClient.delete(`/api/channel-configs/${id}`),
  },
};

export default apiClient;
