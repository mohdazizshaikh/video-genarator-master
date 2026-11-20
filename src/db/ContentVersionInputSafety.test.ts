import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { ContentVersionStore } from "./ContentVersionStore";

let directory: string;
const input = () => ({ workspaceId: "A", title: "Owned content", script: "A scene", scenes: [], metadata: {}, sourceUrls: [], contentSignature: "signature" });
beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), "content-version-input-")); });
afterEach(() => { fs.rmSync(directory, { recursive: true, force: true }); });
const invalidDrafts: Array<[string, Record<string, unknown>]> = [
  ["empty title", { title: "  " }],
  ["numeric title", { title: 42 }],
  ["empty script", { script: "\t" }],
  ["null script", { script: null }],
  ["empty signature", { contentSignature: " " }],
  ["object signature", { contentSignature: {} }],
  ["non-array scenes", { scenes: {} }],
  ["null scenes", { scenes: null }],
  ["array metadata", { metadata: [] }],
  ["null metadata", { metadata: null }],
  ["date metadata", { metadata: new Date("2026-11-21T00:00:00Z") }],
  ["non-array sources", { sourceUrls: "https://example.test" }],
  ["non-string source", { sourceUrls: [123] }],
  ["empty source", { sourceUrls: ["  "] }],
];
it.each(invalidDrafts)("rejects %s on create and draft edit without changing persisted bytes", (_label, patch) => {
  const store = new ContentVersionStore(directory), record = store.create(input());
  const file = path.join(directory, "content-versions.json"), before = fs.readFileSync(file);
  const invalid = { ...input(), ...patch } as Parameters<ContentVersionStore["create"]>[0];
  expect(() => store.create(invalid)).toThrow();
  expect(() => store.updateDraft("A", record.id, invalid)).toThrow();
  expect(fs.readFileSync(file)).toEqual(before);
  expect(fs.readdirSync(directory)).toEqual(["content-versions.json"]);
});
it.each([undefined, null, "", " ", 42])("rejects invalid workspace %j before persisting", (workspaceId) => {
  const store = new ContentVersionStore(directory), file = path.join(directory, "content-versions.json"), before = fs.readFileSync(file);
  expect(() => store.create({ ...input(), workspaceId } as Parameters<ContentVersionStore["create"]>[0])).toThrow("workspaceId is required");
  expect(fs.readFileSync(file)).toEqual(before);
});
it("retains ownership, wrapper data and approved immutability for valid draft inputs", () => {
  const store = new ContentVersionStore(directory), record = store.create(input()), file = path.join(directory, "content-versions.json");
  const persisted = JSON.parse(fs.readFileSync(file, "utf8")); persisted.review = { pending: true }; fs.writeFileSync(file, JSON.stringify(persisted));
  const valid = { ...input(), title: "Updated", scenes: [{ text: "Next scene" }], sourceUrls: ["https://example.test/source"], metadata: { language: "en" } };
  expect(store.updateDraft("B", record.id, valid)).toBeUndefined();
  expect(store.updateDraft("A", record.id, valid)).toMatchObject({ id: record.id, workspaceId: "A", title: "Updated" });
  expect(JSON.parse(fs.readFileSync(file, "utf8")).review).toEqual({ pending: true });
  fs.writeFileSync(path.join(directory, "releases.json"), JSON.stringify({ releases: [{ workspaceId: "A", contentVersionId: record.id, approvalStatus: "approved" }] }));
  const before = fs.readFileSync(file);
  expect(() => store.updateDraft("A", record.id, valid)).toThrow("Approved content is immutable");
  expect(fs.readFileSync(file)).toEqual(before);
});
