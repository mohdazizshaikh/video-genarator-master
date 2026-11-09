import express, { type Request, type Response, type Router } from "express";
import { ArtifactManifestStore } from "../../db/ArtifactManifestStore";
import { ContentVersionStore } from "../../db/ContentVersionStore";
import { getAuthenticatedTenantId, requireAuth,
  requireWorkspace,
} from "../auth";
import type { ContentVersionStatus } from "../../db/ContentVersionStore";

function workspaceIdFrom(req: Request): string {
  const workspaceId = getAuthenticatedTenantId(req);
  if (!workspaceId) throw new Error("Authenticated workspace is required");
  return workspaceId;
}

function statusValue(value: unknown): ContentVersionStatus {
  if (value === "draft" || value === "rendering" || value === "ready" || value === "failed" || value === "archived") return value;
  throw new Error("Invalid content version status");
}

function isProducerSignature(signature: string): boolean {
  return signature.startsWith("render:");
}

export class ContentVersionsRouter {
  public readonly router: Router;

  private readonly store: ContentVersionStore;
  private readonly manifests: ArtifactManifestStore;

  constructor(dataDirPath: string) {
    this.router = express.Router();
    this.store = new ContentVersionStore(dataDirPath);
    this.manifests = new ArtifactManifestStore(dataDirPath);
    this.router.use(requireAuth, requireWorkspace);
    this.router.get("/", (req, res) => this.list(req, res));
    this.router.post("/", (req, res) => this.create(req, res));
    this.router.get("/:contentVersionId", (req, res) => this.get(req, res));
    this.router.patch("/:contentVersionId", (req, res) => this.updateDraft(req, res),
    );
    this.router.patch("/:contentVersionId/render", (req, res) => this.updateRender(req, res),
    );
  }

  private ownedRenderPath(
    workspaceId: string,
    body: Record<string, unknown>,
  ): string | undefined {
    if (body.renderOutputPath !== undefined)
      throw new Error("Use an owned artifactId instead of a filesystem path");
    if (body.artifactId === undefined) {
      if (body.status === "ready")
        throw new Error("A ready version requires an owned video artifact");
      return undefined;
    }
    if (typeof body.artifactId !== "string")
      throw new Error("Invalid artifactId");
    const artifact = this.manifests.findForTenant(workspaceId, body.artifactId);
    if (!artifact || artifact.mimeType !== "video/mp4")
      throw new Error("Owned video artifact not found");
    return artifact.localPath;
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
      const contentSignature = String(body.contentSignature ?? "");
      if (isProducerSignature(contentSignature) || body.createdBy === "render") return void res.status(400).json({ error: "Render producer identity is reserved" });
      const version = this.store.create({
        workspaceId,
        title: String(body.title ?? ""),
        script: String(body.script ?? ""),
        scenes: body.scenes,
        metadata: body.metadata,
        sourceUrls: body.sourceUrls,
        contentSignature,
        renderOutputPath: this.ownedRenderPath(workspaceId, body),
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
    const version = this.store.getForWorkspace(workspaceIdFrom(req), req.params.contentVersionId,
    );
    if (!version) return void res.status(404).json({ error: "Content version not found" });
    res.json({ version });
  }

  private updateDraft(req: Request, res: Response): void {
    try {
      const body = req.body ?? {};
      if (!Array.isArray(body.scenes)) return void res.status(400).json({ error: "scenes must be an array" });
      if (!body.metadata || typeof body.metadata !== "object" || Array.isArray(body.metadata)) return void res.status(400).json({ error: "metadata must be an object" });
      if (!Array.isArray(body.sourceUrls) || body.sourceUrls.some((url: unknown) => typeof url !== "string")) return void res.status(400).json({ error: "sourceUrls must be an array of strings" });
      const workspace = workspaceIdFrom(req), id = req.params.contentVersionId;
      const contentSignature = String(body.contentSignature ?? "");
      if (isProducerSignature(contentSignature)) return void res.status(400).json({ error: "Render producer identity is reserved" });
      if (!this.canEdit(workspace, id, res)) return;
      const version = this.store.updateDraft(workspace, id, {
        title: String(body.title ?? ""),
        script: String(body.script ?? ""),
        scenes: body.scenes,
        metadata: body.metadata,
        sourceUrls: body.sourceUrls,
        contentSignature,
      },
      );
      if (!version) return void res.status(404).json({ error: "Content version not found" });
      res.json({ version });
    } catch (error) {
      const message = error instanceof Error ? error.message : "content version update failed";
      res.status(message.startsWith("Duplicate") ? 409 : 400).json({ error: message });
    }
  }

  private canEdit(workspace: string, id: string, res: Response): boolean {
    const version = this.store.getForWorkspace(workspace, id);
    if (!version) { res.status(404).json({ error: "Content version not found" }); return false; }
    if (version.createdBy === "render" || isProducerSignature(version.contentSignature)) {
      res.status(409).json({ error: "Render producer versions cannot be modified through this endpoint" }); return false;
    }
    return true;
  }

  private updateRender(req: Request, res: Response): void {
    try {
      if (!this.canEdit(workspaceIdFrom(req), req.params.contentVersionId, res)) return;
      const updates = {
        status: statusValue(req.body?.status),
        renderOutputPath: this.ownedRenderPath(
          workspaceIdFrom(req),
          req.body ?? {},
        ),
        renderError: typeof req.body?.renderError === "string" ? req.body.renderError.slice(0, 500) : undefined,
      };
      const version = this.store.updateRender(workspaceIdFrom(req), req.params.contentVersionId, updates,
      );
      if (!version) return void res.status(404).json({ error: "Content version not found" });
      res.json({ version });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "render update failed",
        });
    }
  }
}
