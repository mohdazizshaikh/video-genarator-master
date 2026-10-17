import { beforeEach, describe, expect, it, vi } from "vitest";

const authenticatedFetchMock = vi.fn();

vi.mock("./authenticatedFetch", () => ({
  authenticatedFetch: (...args: unknown[]) => authenticatedFetchMock(...args),
}));

import { authenticatedJson, jsonPatch, jsonPost, jsonPut } from "./authenticatedJson";

describe("authenticatedJson", () => {
  beforeEach(() => {
    authenticatedFetchMock.mockReset();
  });

  it("parses JSON responses", async () => {
    authenticatedFetchMock.mockResolvedValue(
      new Response(JSON.stringify({ connectors: [] }), { status: 200 }),
    );
    await expect(authenticatedJson("/api/connectors")).resolves.toEqual({ connectors: [] });
  });

  it("surfaces the server-provided error message", async () => {
    authenticatedFetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Release approval is required" }), { status: 409 }),
    );
    await expect(authenticatedJson("/api/releases/x/targets")).rejects.toThrow(
      "Release approval is required",
    );
  });

  it("falls back to the status for non-JSON error bodies", async () => {
    authenticatedFetchMock.mockResolvedValue(new Response("bad gateway", { status: 502 }));
    await expect(authenticatedJson("/api/connectors")).rejects.toThrow(
      "Request failed with status 502",
    );
  });

  it("builds JSON mutation init objects", () => {
    expect(jsonPost({ a: 1 })).toEqual({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a: 1 }),
    });
    expect(jsonPatch({ b: 2 }).method).toBe("PATCH");
    expect(jsonPut({ c: 3 }).method).toBe("PUT");
  });
});
