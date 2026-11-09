import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ContentVersionStore } from "./ContentVersionStore";
let directory: string;
const input = (workspaceId = "A", contentSignature = "sig") => ({ workspaceId, title: "A video", script: "The scene", scenes: [], metadata: {}, sourceUrls: [], contentSignature });
beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), "content-version-safety-")); });
afterEach(() => { vi.restoreAllMocks(); fs.rmSync(directory, { recursive: true, force: true }); });
it.each(["", "{private-broken", "[]", "{}", '{"versions":{}}', '{"versions":[null]}', '{"versions":[{"id":"v"}]}', '{"versions":[{"id":"v","workspaceId":"A"},{"id":"v","workspaceId":"B"}]}'])("preserves invalid versions and blocks writes: %j", (content) => {
  const store = new ContentVersionStore(directory), file = path.join(directory, "content-versions.json"); fs.writeFileSync(file, content);
  new ContentVersionStore(directory);
  expect(() => store.listForWorkspace("A")).toThrow("Invalid content version");
  expect(() => store.create(input())).toThrow("Invalid content version");
  expect(() => store.updateRender("A", "v", { status: "ready" })).toThrow("Invalid content version");
  expect(fs.readFileSync(file, "utf8")).toBe(content);
});
it("preserves unrelated wrapper data and independent-instance writes", () => {
  const first = new ContentVersionStore(directory), second = new ContentVersionStore(directory), file = path.join(directory, "content-versions.json");
  fs.writeFileSync(file, JSON.stringify({ versions: [], legacyReview: { pending: true } }));
  const a = first.create(input()), b = second.create(input("B"));
  first.updateRender("A", a.id, { status: "ready", renderOutputPath: "/owned/a.mp4" });
  expect(second.getForWorkspace("A", a.id)?.status).toBe("ready");
  expect(first.getForWorkspace("B", b.id)).toBeDefined();
  expect(JSON.parse(fs.readFileSync(file, "utf8")).legacyReview).toEqual({ pending: true });
});
it.each(["", "{broken", "{}", '{"releases":[null]}', '{"releases":[{"approvalStatus":"approved"}]}'])("does not bypass approval protection on invalid release data: %j", (content) => {
  const store = new ContentVersionStore(directory), version = store.create(input()), file = path.join(directory, "content-versions.json"), before = fs.readFileSync(file);
  fs.writeFileSync(path.join(directory, "releases.json"), content);
  expect(() => store.updateDraft("A", version.id, input())).toThrow("Invalid release store");
  expect(() => store.updateRender("A", version.id, { status: "ready" })).toThrow("Invalid release store");
  expect(fs.readFileSync(file)).toEqual(before);
});
it("cleans failed replacement staging and preserves the previous private file", () => {
  const store = new ContentVersionStore(directory), version = store.create(input()), file = path.join(directory, "content-versions.json"), before = fs.readFileSync(file);
  vi.spyOn(fs, "renameSync").mockImplementation(() => { throw new Error("rename failed"); });
  expect(() => store.updateRender("A", version.id, { status: "ready" })).toThrow("rename failed");
  expect(fs.readFileSync(file)).toEqual(before);
  expect(fs.readdirSync(directory)).toEqual(["content-versions.json"]);
  expect(fs.statSync(file).mode & 0o777).toBe(0o600);
});
it("does not accept forged ownership, identity or approval state through typed update objects", () => {
  const store = new ContentVersionStore(directory), version = store.create(input());
  const forged = { ...input(), workspaceId: "B", id: "forged", status: "ready" };
  store.updateDraft("A", version.id, forged);
  const forgedRender = { status: "ready" as const, workspaceId: "B", id: "forged" };
  store.updateRender("A", version.id, forgedRender);
  expect(store.getForWorkspace("B", version.id)).toBeUndefined();
  expect(store.getForWorkspace("A", version.id)).toMatchObject({ id: version.id, workspaceId: "A", status: "ready" });
});
