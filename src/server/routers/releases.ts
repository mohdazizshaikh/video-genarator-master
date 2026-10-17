import { Router, json } from "express";
import type { Request, Response } from "express";
import type { Config } from "../../config";
import { ConnectorStore } from "../../db/ConnectorStore";
import { ReleaseStore } from "../../db/ReleaseStore";
import { PublishJobStore } from "../../db/PublishJobStore";
import { ContentVersionStore } from "../../db/ContentVersionStore";
import { createQueue, QUEUE_NAMES } from "../../workers/QueueManager";
import { getAuthenticatedTenantId, requireAuth } from "../auth";

interface ClaimsRequest extends Request {
  auth?: { tenantId?: string; permissions?: string[]; name?: string };
}

function tenantIdFrom(req: ClaimsRequest): string {
  const tenantId = getAuthenticatedTenantId(req);
  if (!tenantId) throw new Error("Authenticated workspace is required");
  return tenantId;
}

function canApprove(req: ClaimsRequest): boolean {
  const permissions = req.auth?.permissions || [];
  return permissions.includes("release:approve") || permissions.includes("workspace:admin") || permissions.includes("admin");
}

export class ReleasesRouter {
  public readonly router: Router;
  private readonly releases: ReleaseStore;
  private readonly connectors: ConnectorStore;
  private readonly publishJobs: PublishJobStore;
  private readonly contentVersions: ContentVersionStore;
  private readonly config: Config;

  constructor(config: Config) {
    this.router = Router();
    this.router.use(json());
    this.config = config;
    this.releases = new ReleaseStore(config.dataDirPath);
    this.connectors = new ConnectorStore(config.dataDirPath);
    this.publishJobs = new PublishJobStore(config.dataDirPath);
    this.contentVersions = new ContentVersionStore(config.dataDirPath);
    this.register();
  }

  private register(): void {
    this.router.use(requireAuth);

    this.router.get("/", (req: ClaimsRequest, res: Response) => {
      res.json({ releases: this.releases.listReleases(tenantIdFrom(req)) });
    });

    this.router.post("/", (req: ClaimsRequest, res: Response) => {
      try {
        const workspaceId = tenantIdFrom(req);
        const { contentVersionId } = req.body || {};
        if (!contentVersionId || typeof contentVersionId !== "string") return res.status(400).json({ error: "contentVersionId is required" });
        const contentVersion = this.contentVersions.getForWorkspace(workspaceId, contentVersionId);
        if (!contentVersion) return res.status(404).json({ error: "Content version not found for workspace" });
        if (contentVersion.status === "archived" || contentVersion.status === "failed") return res.status(409).json({ error: "Content version is not releaseable" });
        const release = this.releases.createRelease({ workspaceId, contentVersionId, approvalStatus: "pending" });
        return res.status(201).json({ release });
      } catch (error) {
        return res.status(400).json({ error: error instanceof Error ? error.message : "release creation failed" });
      }
    });

    this.router.get("/:releaseId", (req: ClaimsRequest, res: Response) => {
      const workspaceId = tenantIdFrom(req);
      const release = this.releases.getRelease(workspaceId, req.params.releaseId);
      if (!release) return res.status(404).json({ error: "Release not found" });
      return res.json({ release, targets: this.releases.listTargets(workspaceId, release.id) });
    });

    this.router.post("/:releaseId/approve", (req: ClaimsRequest, res: Response) => {
      if (!canApprove(req)) return res.status(403).json({ error: "Release approval permission required" });
      try {
        const workspaceId = tenantIdFrom(req);
        const release = this.releases.approveRelease(workspaceId, req.params.releaseId, req.auth?.name || workspaceId);
        return res.json({ release });
      } catch (error) {
        return res.status(404).json({ error: error instanceof Error ? error.message : "release not found" });
      }
    });

    this.router.post("/:releaseId/queue", async (req: ClaimsRequest, res: Response) => {
      try {
        const workspaceId = tenantIdFrom(req);
        const { targetId, renderOutputPath, title, description = "", tags = [], category = "general", language = "en", thumbnailPath, scheduleAt } = req.body || {};
        const target = this.releases.getTarget(workspaceId, targetId);
        if (!target || target.releaseId !== req.params.releaseId) return res.status(404).json({ error: "Release target not found" });
        if (target.status !== "queued") return res.status(409).json({ error: "Release target is not queueable" });
        const connector = this.connectors.getConnector(workspaceId, target.connectorId);
        const destination = connector ? this.connectors.listDestinations(workspaceId, connector.id).find((candidate) => candidate.id === target.destinationId) : undefined;
        const release = this.releases.getRelease(workspaceId, req.params.releaseId);
        if (!release || release.approvalStatus !== "approved") return res.status(409).json({ error: "Approved release is required" });
        if (!connector || connector.status !== "connected" || !destination || destination.status !== "verified") return res.status(409).json({ error: "Connected connector and verified destination are required" });
        if (!renderOutputPath || !title || !Array.isArray(tags)) return res.status(400).json({ error: "renderOutputPath, title, and tags are required" });
        const job = await this.publishJobs.createJob({ tenantId: workspaceId, renderOutputPath, platform: connector.platform === "twitter" ? "x" : connector.platform, channelId: destination.externalDestinationId, title, description, tags, category, language, thumbnailPath, scheduleAt });
        const queue = createQueue(QUEUE_NAMES.PUBLISH, this.config);
        await queue.add("publish-release-target", { ...job, tenantId: workspaceId, publishJobId: job.id, releaseTargetId: target.id, connectorId: connector.id, destinationId: destination.id }, { jobId: `release-target-${target.id}` });
        return res.status(202).json({ jobId: job.id, targetId: target.id, queued: true });
      } catch (error) {
        return res.status(409).json({ error: error instanceof Error ? error.message : "release queue failed" });
      }
    });

    this.router.post("/:releaseId/targets", (req: ClaimsRequest, res: Response) => {
      try {
        const workspaceId = tenantIdFrom(req);
        const { connectorId, destinationId, idempotencyKey } = req.body || {};
        if (!connectorId || !destinationId || !idempotencyKey) return res.status(400).json({ error: "connectorId, destinationId, and idempotencyKey are required" });
        const connector = this.connectors.getConnector(workspaceId, connectorId);
        if (!connector) return res.status(404).json({ error: "Connector not found" });
        const destination = this.connectors.listDestinations(workspaceId, connectorId).find((candidate) => candidate.id === destinationId);
        if (!destination || destination.status !== "verified") return res.status(409).json({ error: "Verified destination is required" });
        const target = this.releases.createTarget({ workspaceId, releaseId: req.params.releaseId, connectorId, destinationId, idempotencyKey });
        return res.status(201).json({ target });
      } catch (error) {
        return res.status(409).json({ error: error instanceof Error ? error.message : "release target creation failed" });
      }
    });
  }
}
