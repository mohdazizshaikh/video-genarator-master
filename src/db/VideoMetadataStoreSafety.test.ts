import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { VideoMetadataStore } from "./VideoMetadataStore";
let directory: string;
const input = (videoId = "video-1", tenantId = "A") => ({ videoId, tenantId, scenes: [{ text: "A metadata scene", searchTerms: ["topic"] }], signature: "same-signature" });
beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), "video-metadata-safety-")); });
afterEach(() => { vi.restoreAllMocks(); fs.removeSync(directory); });

it.each(["", "{private-broken", "{}", "[null]", "[[]]", '[{"videoId":""}]', '[{"videoId":"v","tenantId":""}]', '[{"videoId":"v","tenantId":"A"},{"videoId":"v","tenantId":"A"}]'])("preserves invalid metadata and fails closed: %j", async (content) => {
  const store = new VideoMetadataStore(directory), file = path.join(directory, "videoMetadata.json");
  fs.writeFileSync(file, content);
  new VideoMetadataStore(directory);
  expect(() => store.getSync("video-1", "A")).toThrow();
  expect(() => store.upsertFromScenesSync(input())).toThrow();
  await expect(store.upsertFromScenes(input())).rejects.toThrow();
  expect(fs.readFileSync(file, "utf8")).toBe(content);
  try { await store.listForTenant("A"); } catch (error) { expect(String(error)).not.toContain("private-broken"); }
});
it("retains overlapping writes from async and sync clients in independent instances", async () => {
  const first = new VideoMetadataStore(directory), second = new VideoMetadataStore(directory);
  const pending = first.upsertFromScenes(input("one"));
  second.upsertFromScenesSync(input("two"));
  await Promise.all([pending, first.upsertFromScenes(input("three")), second.upsertFromScenes(input("four", "B"))]);
  expect((await first.listForTenant("A")).map((row) => row.videoId)).toEqual(["one", "two", "three"]);
  expect(await second.listForTenant("B")).toHaveLength(1);
});
it("updates one owned identity while preserving other workspaces and ownerless legacy rows", async () => {
  const first = new VideoMetadataStore(directory), second = new VideoMetadataStore(directory), file = path.join(directory, "videoMetadata.json");
  const legacy = { videoId: "legacy", signature: "same-signature", privateField: "preserved" };
  fs.writeJsonSync(file, [legacy]);
  await Promise.all([first.upsertFromScenes(input()), second.upsertFromScenes(input("video-1", "B"))]);
  await first.upsertFromScenes({ ...input(), category: "Updated" });
  expect(await second.get("video-1", "A")).toMatchObject({ category: "Updated" });
  expect(await second.get("video-1", "B")).toMatchObject({ category: null });
  expect(fs.readJsonSync(file)[0]).toEqual(legacy);
  expect(first.findBySignatureSync("same-signature")).toBeUndefined();
  expect(await first.get("legacy", "A")).toBeUndefined();
});
it("preserves the prior store and removes staging after atomic replacement fails", async () => {
  const store = new VideoMetadataStore(directory), file = path.join(directory, "videoMetadata.json");
  await store.upsertFromScenes(input()); const before = fs.readFileSync(file);
  vi.spyOn(fs, "renameSync").mockImplementation(() => { throw new Error("replacement failed"); });
  await expect(store.upsertFromScenes(input("lost"))).rejects.toThrow("replacement failed");
  expect(fs.readFileSync(file)).toEqual(before);
  expect(fs.readdirSync(directory)).toEqual(["videoMetadata.json"]);
});
it("requires ownership for writes and creates private metadata files", async () => {
  const store = new VideoMetadataStore(directory), file = path.join(directory, "videoMetadata.json"), before = fs.readFileSync(file);
  await expect(store.upsertFromScenes({ ...input(), tenantId: undefined })).rejects.toThrow("workspace");
  expect(() => store.upsertFromScenesSync(input(""))).toThrow("identity");
  expect(fs.readFileSync(file)).toEqual(before);
  expect(fs.statSync(file).mode & 0o777).toBe(0o600);
  await store.upsertFromScenes(input());
  expect(fs.statSync(file).mode & 0o777).toBe(0o600);
});
