import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import type { Config } from "../../config";
import { ScheduleRouter } from "./schedule";
import { ScheduleStore } from "../../db/ScheduleStore";
import { ArtifactManifestStore } from "../../db/ArtifactManifestStore";
import { ImageEngine } from "../../services/ImageEngine";
import { dispatch } from "../testing/dispatch";
let directory: string, service: ScheduleRouter;
const auth = { tenantId: "A" };
beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), "schedule-output-")); service = new ScheduleRouter({ dataDirPath: directory } as Config); });
afterEach(() => { service.stop(); vi.restoreAllMocks(); fs.removeSync(directory); });
async function create(contentType: string, extra = {}) {
  const result = await dispatch(service.router, "POST", "/", { auth, body: { name: "Persistent asset", contentType, platforms: ["youtube"], categories: ["Tech"], languages: ["en"], publishAt: "2099-01-01T09:00:00Z", recurrence: "once", ...extra } });
  expect(result.status).toBe(201); return (result.body as { schedule: { id: string } }).schedule.id;
}
it.each(["image", "carousel", "banner"])("persists owned %s output with verifiable bytes and restart-visible references", async (contentType) => {
  const id = await create(contentType); const run = await dispatch(service.router, "POST", `/${id}/run`, { auth });
  expect(run.body).toMatchObject({ success: true });
  const record = await new ScheduleStore(directory).getForTenant("A", id);
  expect(record).toMatchObject({ runCount: 1, failureCount: 0, lastOutput: { state: "assets-persisted" } });
  const descriptor = record!.lastOutput!.artifacts[0]; expect(descriptor).toBeDefined();
  const manifests = new ArtifactManifestStore(directory), artifact = manifests.findForTenant("A", descriptor.id)!;
  expect(manifests.findForTenant("B", descriptor.id)).toBeNull();
  const bytes = fs.readFileSync(artifact.localPath); expect(bytes.toString()).toContain("<svg");
  expect(descriptor.checksumSha256).toBe(crypto.createHash("sha256").update(bytes).digest("hex")); expect(descriptor.sizeBytes).toBe(bytes.length);
  expect(fs.statSync(artifact.localPath).mode & 0o777).toBe(0o600);
  expect((await dispatch(service.router, "GET", `/${id}`, { auth: { tenantId: "B" } })).status).toBe(404);
  expect(JSON.stringify((await dispatch(service.router, "GET", `/${id}`, { auth })).body)).not.toContain(directory);
});
it("persists supplementary assets and protects producer references from caller patches", async () => {
  const id = await create("image", { alsoGenerate: { quoteCard: true, thumbnail: true } });
  await dispatch(service.router, "POST", `/${id}/run`, { auth });
  const store = new ScheduleStore(directory), before = (await store.get(id))!.lastOutput;
  expect(before!.artifacts).toHaveLength(3);
  await dispatch(service.router, "PATCH", `/${id}`, { auth, body: { lastOutput: { state: "assets-persisted", artifacts: [{ id: "forged" }] } } });
  expect((await store.get(id))!.lastOutput).toEqual(before);
});
it.each([false, true])("does not record successful generation without actual SVG bytes (success=%s)", async (success) => {
  vi.spyOn(ImageEngine.prototype, "generateQuoteCard").mockReturnValue({ template: "quote_card", success, width: 1, height: 1, description: "no bytes" });
  const id = await create("image");
  expect((await dispatch(service.router, "POST", `/${id}/run`, { auth })).body).toMatchObject({ success: false });
  expect(await new ScheduleStore(directory).get(id)).toMatchObject({ failureCount: 1, status: "failed" });
  expect((await new ScheduleStore(directory).get(id))!.lastOutput).toBeUndefined();
});
it("preserves malformed manifest bytes and records failure instead of claiming an output", async () => {
  const file = path.join(directory, "artifact-manifests.json"), raw = "{PRIVATE-BROKEN-MANIFEST"; fs.writeFileSync(file, raw);
  const id = await create("image"); expect((await dispatch(service.router, "POST", `/${id}/run`, { auth })).body).toMatchObject({ success: false });
  expect(fs.readFileSync(file, "utf8")).toBe(raw); expect((await new ScheduleStore(directory).get(id))!.lastOutput).toBeUndefined();
});
it.each([{ platforms: ["youtube", "instagram"] }, { categories: ["Tech", "Finance"] }, { languages: ["en", "hi"] }])("rejects unsupported multi-scope execution before producing artifacts: %j", async (fields) => {
  const id = await create("image", fields); expect((await dispatch(service.router, "POST", `/${id}/run`, { auth })).body).toMatchObject({ success: false });
  expect(new ArtifactManifestStore(directory).listForTenant("A")).toEqual([]);
});
it("retains unreviewed legacy manifest rows while registering owned output", async () => {
  const legacy = { id: "legacy", localPath: "unassigned", kind: "other" }; fs.writeJsonSync(path.join(directory, "artifact-manifests.json"), [legacy]);
  const id = await create("image"); expect((await dispatch(service.router, "POST", `/${id}/run`, { auth })).body).toMatchObject({ success: true });
  expect(fs.readJsonSync(path.join(directory, "artifact-manifests.json"))[0]).toEqual(legacy);
  expect(new ArtifactManifestStore(directory).listForTenant("A")).toHaveLength(1);
});

it("downloads only bound owned bytes and rejects changed or redirected artifacts", async () => {
  const id = await create("image"); await dispatch(service.router, "POST", `/${id}/run`, { auth });
  const output = (await new ScheduleStore(directory).get(id))!.lastOutput!.artifacts[0];
  const url = `/${id}/outputs/${output.id}`;
  const downloaded = await dispatch(service.router, "GET", url, { auth }); expect(downloaded.status).toBe(200); expect(Buffer.isBuffer(downloaded.body)).toBe(true);
  expect((await dispatch(service.router, "GET", url, { auth: { tenantId: "B" } })).status).toBe(404);
  expect((await dispatch(service.router, "GET", `/${id}/outputs/unbound`, { auth })).status).toBe(404);
  const manifest = new ArtifactManifestStore(directory).findForTenant("A", output.id)!;
  fs.writeFileSync(manifest.localPath, "changed"); expect((await dispatch(service.router, "GET", url, { auth })).status).toBe(409);
  const file = path.join(directory, "artifact-manifests.json"), rows = fs.readJsonSync(file); rows[0].localPath = path.join(directory, "schedules.json"); fs.writeJsonSync(file, rows);
  expect((await dispatch(service.router, "GET", url, { auth })).status).toBe(409);
});
