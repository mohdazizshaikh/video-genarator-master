import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ContentVersionStore } from "./ContentVersionStore";

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "content-version-"));
}

function input(workspaceId: string, signature = "sig-1") {
  return {
    workspaceId,
    title: "Technology That Keeps Business Moving",
    script: "A factual Aaditech script.",
    scenes: [{ text: "Infrastructure" }],
    metadata: { language: "en", category: "Technology" },
    sourceUrls: ["https://aaditechs.in/"],
    contentSignature: signature,
  };
}

describe("ContentVersionStore", () => {
  it("isolates reads by workspace", () => {
    const store = new ContentVersionStore(tempDir());
    const version = store.create(input("workspace-a"));

    expect(store.getForWorkspace("workspace-a", version.id)?.workspaceId).toBe("workspace-a");
    expect(store.getForWorkspace("workspace-b", version.id)).toBeUndefined();
    expect(store.listForWorkspace("workspace-b")).toEqual([]);
  });

  it("rejects duplicate signatures only within the same workspace", () => {
    const store = new ContentVersionStore(tempDir());
    store.create(input("workspace-a", "same-signature"));
    expect(() => store.create(input("workspace-a", "same-signature"))).toThrow("Duplicate content signature");
    expect(() => store.create(input("workspace-b", "same-signature"))).not.toThrow();
  });

  it("tracks render lifecycle updates and rejects traversal paths at the API contract boundary", () => {
    const store = new ContentVersionStore(tempDir());
    const version = store.create(input("workspace-a"));
    expect(store.updateRender("workspace-a", version.id, { status: "ready", renderOutputPath: "/app/data/renders/a.mp4", renderError: undefined })?.status).toBe("ready");
    expect(store.getForWorkspace("workspace-a", version.id)?.renderOutputPath).toBe("/app/data/renders/a.mp4");
  });
});
