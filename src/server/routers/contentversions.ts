import express, { type Request, type Response, type Router } from "express";
import path from "node:path";
import { ContentVersionStore } from "../../db/ContentVersionStore";
import { getAuthenticatedTenantId } from "../auth";
import type { ContentVersionStatus } from "../../db/ContentVersionStore";

function workspaceIdFrom(req: Request): string {
  const workspaceId = getAuthenticatedTenantId(req);
  if (!workspaceId) throw new Error("Authenticated workspace is required");
  return workspaceId;
}

function safeAssetPath(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) throw new Error("renderOutputPath must be a non-empty string");
  if (!path.isAbsolute(value) || value.includes("\0") || value.split(path.sep).includes("..")) {
    throw new Error("renderOutputPath must be an absolute path without traversal");
  }
  return value;
}

function statusValue(value: unknown): ContentVersionStatus {
  if (value === "draft" || value === "rendering" || value === "ready" || value === "failed" || value === "archived") return value;
  throw new Error("Invalid content version status");
}

export class ContentVersionsRouter {
  public readonly router: Router;

  private readonly store: ContentVersionStore;

  constructor(dataDirPath: string) {
    this.router = express.Router();
    this.store = new ContentVersionStore(dataDirPath);
    this.router.get("/", (req, res) => this.list(req, res));
    this.router.post("/", (req, res) => this.create(req, res));
    this.router.get("/:contentVersionId", (req, res) => this.get(req, res));
    this.router.patch("/:contentVersionId", (req, res) => this.updateDraft(req, res));
    this.router.patch("/:contentVersionId/render", (req, res) => this.updateRender(req, res));
  }

  private list(req: Request, res: Response): void {
    res.json({ versions: this.store.listForWorkspace(workspaceIdFrom(req)) });
  }

  private create(req: Request, res: Response): void {
    try {
      const body = req.body ?? {};
      if (!Array.isArray(body.scenes)) return void res.status(400).json({ error: "scenes must be an array" });
      if (!body.metadata || typeof body.metadata !== "object" || Array.isArray(body.metadata)) return void res.status(400).json({ error: "metadata must be an object" });
      if (!Array.isArray(body.sourceUrls) || body.sourceUrls.some((url: unknown) => typeof url !== "string")) return void res.status(400).json({ error: "sourceUrls must be an array of strings" });
      const workspaceId = workspaceIdFrom(req);
      const version = this.store.create({
        workspaceId,
        title: String(body.title ?? ""),
        script: String(body.script ?? ""),
        scenes: body.scenes,
        metadata: body.metadata,
        sourceUrls: body.sourceUrls,
        contentSignature: String(body.contentSignature ?? ""),
        renderOutputPath: safeAssetPath(body.renderOutputPath),
        renderError: undefined,
        createdBy: typeof body.createdBy === "string" ? body.createdBy : undefined,
      });
      res.status(201).json({ version });
    } catch (error) {
      const message = error instanceof Error ? error.message : "content version creation failed";
      res.status(message.startsWith("Duplicate") ? 409 : 400).json({ error: message });
    }
  }

  private get(req: Request, res: Response): void {
    const version = this.store.getForWorkspace(workspaceIdFrom(req), req.params.contentVersionId);
    if (!version) return void res.status(404).json({ error: "Content version not found" });
    res.json({ version });
  }

  private updateDraft(req: Request, res: Response): void {
    try {
      const body = req.body ?? {};
      if (!Array.isArray(body.scenes)) return void res.status(400).json({ error: "scenes must be an array" });
      if (!body.metadata || typeof body.metadata !== "object" || Array.isArray(body.metadata)) return void res.status(400).json({ error: "metadata must be an object" });
      if (!Array.isArray(body.sourceUrls) || body.sourceUrls.some((url: unknown) => typeof url !== "string")) return void res.status(400).json({ error: "sourceUrls must be an array of strings" });
      const version = this.store.updateDraft(workspaceIdFrom(req), req.params.contentVersionId, {
        title: String(body.title ?? ""),
        script: String(body.script ?? ""),
        scenes: body.scenes,
        metadata: body.metadata,
        sourceUrls: body.sourceUrls,
        contentSignature: String(body.contentSignature ?? ""),
      });
      if (!version) return void res.status(404).json({ error: "Content version not found" });
      res.json({ version });
    } catch (error) {
      const message = error instanceof Error ? error.message : "content version update failed";
      res.status(message.startsWith("Duplicate") ? 409 : 400).json({ error: message });
    }
  }

  private updateRender(req: Request, res: Response): void {
    try {
      const updates = {
        status: statusValue(req.body?.status),
        renderOutputPath: safeAssetPath(req.body?.renderOutputPath),
        renderError: typeof req.body?.renderError === "string" ? req.body.renderError.slice(0, 500) : undefined,
      };
      const version = this.store.updateRender(workspaceIdFrom(req), req.params.contentVersionId, updates);
      if (!version) return void res.status(404).json({ error: "Content version not found" });
      res.json({ version });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "render update failed" });
    }
  }
}
