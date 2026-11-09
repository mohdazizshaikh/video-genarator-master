import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { api, apiClient } from "./apiClient";
import { useAuthStore } from "../store/authStore";
import { isApiOrigin } from "./apiOrigin";
const http = apiClient.getAxiosInstance();
function login(id: string) {
  useAuthStore.getState().login({ id, tenantId: id }, `token-${id}`);
}
function result(config: InternalAxiosRequestConfig, data: unknown) {
  return { status: 200, statusText: "OK", data, headers: {}, config };
}
beforeEach(() => {
  apiClient.clearCache();
  useAuthStore.getState().logout();
});
afterEach(() => {
  vi.restoreAllMocks();
  useAuthStore.getState().logout();
});

describe("API credential and session boundary", () => {
  it("compares origins rather than URL prefixes", () => {
    expect(
      isApiOrigin(
        "https://trusted.example.attacker.invalid/data",
        "https://trusted.example",
      ),
    ).toBe(false);
    expect(isApiOrigin("//attacker.invalid/data")).toBe(false);
    expect(isApiOrigin("https://attacker.invalid/data")).toBe(false);
    expect(isApiOrigin("/api/data")).toBe(true);
  });
  it("never attaches an app token to absolute external requests with an empty base URL", async () => {
    login("A");
    let sent: unknown;
    http.defaults.adapter = (async (config) => {
      sent = config.headers.get("Authorization");
      return result(config, {});
    }) as AxiosAdapter;
    await apiClient.get("https://attacker.invalid/data");
    expect(sent).toBeUndefined();
  });
  it("does not reuse A cached responses after a login to B", async () => {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
      result(config, { owner: config.headers.get("Authorization") }),
    );
    http.defaults.adapter = adapter;
    login("A");
    expect(await apiClient.get("/api/private")).toEqual({
      owner: "Bearer token-A",
    });
    login("B");
    expect(await apiClient.get("/api/private")).toEqual({
      owner: "Bearer token-B",
    });
    expect(adapter).toHaveBeenCalledTimes(2);
  });
  it("does not conflate different query parameters", async () => {
    const adapter = vi.fn(async (config: InternalAxiosRequestConfig) =>
      result(config, config.params),
    );
    http.defaults.adapter = adapter;
    login("A");
    expect(
      await apiClient.get("/api/private", { params: { page: 1 } }),
    ).toEqual({ page: 1 });
    expect(
      await apiClient.get("/api/private", { params: { page: 2 } }),
    ).toEqual({ page: 2 });
    expect(adapter).toHaveBeenCalledTimes(2);
  });
  it("rejects late A results instead of putting them into B state", async () => {
    let finish!: (value: ReturnType<typeof result>) => void;
    let request!: InternalAxiosRequestConfig;
    http.defaults.adapter = (config) => {
      request = config;
      return new Promise((resolve) => {
        finish = resolve;
      });
    };
    login("A");
    const pending = apiClient.get("/api/private");
    const assertion = expect(pending).rejects.toThrow("Session changed");
    await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    login("B");
    finish(result(request, { private: "A" }));
    await assertion;
    expect(useAuthStore.getState().user?.id).toBe("B");
  });
});

it("loads scheduler counts from the scoped dashboard rather than admin queue metrics", async () => {
  login("A");
  const urls: string[] = [];
  http.defaults.adapter = (async (config) => { urls.push(config.url || ""); return result(config, { queue: { redisEnabled: false, queues: [{ id: "render", counts: { waiting: 2 } }, { id: "publish", counts: { completed: 1 } }] } }); }) as AxiosAdapter;
  expect(await api.queue.getStatus()).toMatchObject({ redisEnabled: false, render: { waiting: 2 }, publish: { completed: 1 } });
  expect(urls).toEqual(["/api/health/dashboard"]);
});
