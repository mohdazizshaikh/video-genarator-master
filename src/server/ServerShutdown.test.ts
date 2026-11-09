import { afterEach, describe, expect, it, vi } from "vitest";
import { Server } from "./server";
import { MCPRouter } from "./routers/mcp";
import type { ShortCreator } from "../short-creator/ShortCreator";
import { readiness } from "./readiness";
import { dispatch } from "./testing/dispatch";

afterEach(() => { readiness.shuttingDown = false; });
describe("HTTP and MCP shutdown", () => {
  it("stops the persistent schedule runner and awaits HTTP connections", async () => {
    let finish!: () => void;
    const stop = vi.fn();
    const idle = vi.fn();
    const sessions = vi.fn(async () => undefined);
    const server = Object.assign(Object.create(Server.prototype) as Server, {
      httpServer: { listening: true, close: vi.fn((callback: () => void) => { finish = callback; }), closeIdleConnections: idle },
      scheduleRouter: { stop }, mcpRouter: { close: sessions },
    });
    server.stopAccepting();
    expect(stop).toHaveBeenCalledOnce();
    expect(sessions).toHaveBeenCalledOnce();
    expect(readiness.shuttingDown).toBe(true);
    let closed = false;
    const drain = server.drain().then(() => { closed = true; });
    await Promise.resolve();
    expect(closed).toBe(false);
    expect(idle).toHaveBeenCalledOnce();
    finish(); await drain;
    expect(closed).toBe(true);
    expect(() => server.start()).toThrow("current state");
  });
  it("closes all MCP sessions once and refuses new streams", async () => {
    const router = new MCPRouter({} as ShortCreator);
    const sessions = (router as unknown as { sessions: Map<string, { server: { close(): Promise<void> } }> }).sessions;
    const first = vi.fn(async () => undefined), second = vi.fn(async () => undefined);
    sessions.set("one", { server: { close: first } }); sessions.set("two", { server: { close: second } });
    const close = router.close();
    expect(router.close()).toBe(close);
    await close;
    expect(first).toHaveBeenCalledOnce(); expect(second).toHaveBeenCalledOnce();
    expect(sessions.size).toBe(0);
    expect((await dispatch(router.router, "GET", "/sse", { auth: { tenantId: "a" } })).status).toBe(503);
  });
});
