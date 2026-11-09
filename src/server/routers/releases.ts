import { Router, json } from "express";
import type { Request, Response } from "express";
import type { Config } from "../../config";
import { PublishDeliveryService } from "../../services/PublishDeliveryService";
import { PublishExecutionStore } from "../../db/PublishExecutionStore";
import { ReleaseAuthorization } from "../../services/ReleaseAuthorization";
import { ConnectorStore } from "../../db/ConnectorStore";
import { ConnectorSecretStore } from "../../db/ConnectorSecretStore";
import { ReleaseStore } from "../../db/ReleaseStore";
import { PublishJobStore } from "../../db/PublishJobStore";
import { ContentVersionStore } from "../../db/ContentVersionStore";
import { createPublishQueue } from "../../workers/QueueManager";
import { getAuthenticatedTenantId, requireWorkspace } from "../auth";

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
  return (
    permissions.includes("release:approve") || permissions.includes("workspace:admin") || permissions.includes("admin")
  );
}

export class ReleasesRouter {
  public readonly router: Router;
  private readonly releases: ReleaseStore;
  private readonly connectors: ConnectorStore;
  private readonly secrets?: ConnectorSecretStore;
  private readonly publishJobs: PublishJobStore;
  private readonly contentVersions: ContentVersionStore;
  private readonly config: Config;

  constructor(config: Config) {
    this.router = Router();
    this.router.use(json());
    this.config = config;
    this.releases = new ReleaseStore(config.dataDirPath);
    this.connectors = new ConnectorStore(config.dataDirPath);
    const encryptionSecret = process.env.TENANT_KEYS_SECRET || "";
    if (encryptionSecret.trim()) this.secrets = new ConnectorSecretStore(config.dataDirPath, encryptionSecret,
      );
    this.publishJobs = new PublishJobStore(config.dataDirPath);
    this.contentVersions = new ContentVersionStore(config.dataDirPath);
    this.register();
  }

  private register(): void {
    this.router.use(requireWorkspace);

    this.router.get("/", (req: ClaimsRequest, res: Response) => {
      res.json({ releases: this.releases.listReleases(tenantIdFrom(req)) });
    });

    this.router.post("/", (req: ClaimsRequest, res: Response) => {
      try {
        const workspaceId = tenantIdFrom(req);
        const { contentVersionId } = req.body || {};
        if (!contentVersionId || typeof contentVersionId !== "string") return res.status(400).json({ error: "contentVersionId is required" });
        const contentVersion = this.contentVersions.getForWorkspace(workspaceId, contentVersionId,
        );
        if (!contentVersion) return res.status(404).json({ error: "Content version not found for workspace" });
        if (contentVersion.status === "archived" || contentVersion.status === "failed") return res.status(409).json({ error: "Content version is not releaseable" });
        const release = this.releases.createRelease({ workspaceId, contentVersionId, approvalStatus: "pending",
        });
        return res.status(201).json({ release });
      } catch (error) {
        return res.status(400).json({ error: error instanceof Error ? error.message : "release creation failed",
          });
      }
    });

    this.router.get("/:releaseId", (req: ClaimsRequest, res: Response) => {
      const workspaceId = tenantIdFrom(req);
      const release = this.releases.getRelease(workspaceId, req.params.releaseId,
      );
      if (!release) return res.status(404).json({ error: "Release not found" });
      const executions = new PublishExecutionStore(this.config.dataDirPath);
      return res.json({ release, targets: this.releases.listTargets(workspaceId, release.id).map((target) => {
        const execution = executions.get(workspaceId, target.id);
        return { ...target, execution: execution ? { requestId: execution.requestId, state: execution.state, attempt: execution.attempt, observation: execution.observation } : undefined };
      }),
      });
    });

    this.router.post("/:releaseId/targets/:targetId/confirm-publication", async (req: ClaimsRequest, res: Response) => {
      if (!canApprove(req)) return res.status(403).json({ error: "Release approval permission required" });
      const workspaceId = tenantIdFrom(req);
      const target = this.releases.getTarget(workspaceId, req.params.targetId);
      if (!target || target.releaseId !== req.params.releaseId) return res.status(404).json({ error: "Release target not found" });
      const { requestId, externalId, evidenceReference, verifiedOnProvider } = req.body || {};
      if (verifiedOnProvider !== true || ![requestId, externalId, evidenceReference].every((value) => typeof value === "string" && value.trim())) return res.status(400).json({ error: "Verify the publication on the provider and supply its request ID, publication ID and evidence reference" });
      try {
        const execution = new PublishExecutionStore(this.config.dataDirPath).get(workspaceId, target.id);
        const release = this.releases.getRelease(workspaceId, target.releaseId);
        if (!execution || !release?.approvedContent || execution.contentDigest !== release.approvedContent.contentDigest) return res.status(409).json({ error: "A bound publication checkpoint is required; legacy outcomes remain blocked" });
        const binding = { tenantId: workspaceId, targetId: target.id, releaseId: target.releaseId, connectorId: target.connectorId, destinationId: target.destinationId, platform: execution.platform, contentDigest: release.approvedContent.contentDigest };
        const receipt = await new PublishDeliveryService(this.config.dataDirPath).confirmObservedPublication(binding, execution.publishJobId, requestId, externalId, evidenceReference, req.auth?.name || workspaceId);
        return res.json({ target: this.releases.getTarget(workspaceId, target.id), receipt });
      } catch (error) {
        return res.status(409).json({ error: error instanceof Error ? error.message : "Publication confirmation failed" });
      }
    });

    this.router.post("/:releaseId/approve", (req: ClaimsRequest, res: Response) => {
      if (!canApprove(req)) return res.status(403).json({ error: "Release approval permission required" });
      try {
        const workspaceId = tenantIdFrom(req);
        const existing = this.releases.getRelease(
            workspaceId,
            req.params.releaseId,
          );
          if (!existing)
            return res.status(404).json({ error: "Release not found" });
          const authority = new ReleaseAuthorization(this.config.dataDirPath);
          const approvedDestinations = authority.destinationScope(workspaceId, req.body?.destinations);
          const approvedContent = new ReleaseAuthorization(
            this.config.dataDirPath,
          ).snapshot(workspaceId, existing.contentVersionId);
          const release = this.releases.approveRelease(workspaceId, req.params.releaseId, req.auth?.name || workspaceId,
            approvedContent, approvedDestinations,
          );
        return res.json({ release });
      } catch (error) {
        return res.status(409).json({ error: error instanceof Error ? error.message : "release approval failed",
            });
      }
    },
    );

    this.router.post("/:releaseId/queue", async (req: ClaimsRequest, res: Response) => {
      try {
        const workspaceId = tenantIdFrom(req);
        const { targetId, scheduleAt } = req.body || {};
          if (req.body?.renderOutputPath || req.body?.thumbnailPath)
            return res
              .status(400)
              .json({
                error:
                  "Release publishing resolves the approved artifact; filesystem paths are not accepted",
              });
          if (!this.config.redisEnabled)
            return res
              .status(503)
              .json({ error: "Publishing queue is unavailable" });
          if (
            scheduleAt &&
            (!Number.isFinite(Date.parse(scheduleAt)) ||
              Date.parse(scheduleAt) <= Date.now())
          )
            return res
              .status(400)
              .json({ error: "scheduleAt must be a future date" });
        const target = this.releases.getTarget(workspaceId, targetId);
        if (!target || target.releaseId !== req.params.releaseId) return res.status(404).json({ error: "Release target not found" });
        // Failed targets may be re-queued as an explicit operator recovery of a
        // dead-lettered publish; the reset to "queued" happens only after every
        // approval/credential gate below passes. In-flight states stay rejected.
        if (target.status !== "queued" && target.status !== "failed") return res.status(409).json({ error: "Release target is not queueable" });
        const connector = this.connectors.getConnector(workspaceId, target.connectorId,
          );
        const destination = connector ? this.connectors.listDestinations(workspaceId, connector.id).find((candidate) => candidate.id === target.destinationId) : undefined;
        const release = this.releases.getRelease(workspaceId, req.params.releaseId,
          );
        if (!release || release.approvalStatus !== "approved") return res.status(409).json({ error: "Approved release is required" });
        if (!connector || connector.status !== "connected" || !destination || destination.status !== "verified") return res.status(409).json({ error: "Connected connector and verified destination are required",
              });
        if (!this.secrets) return res.status(503).json({ error: "Connector secret storage is not configured" });
        const credentials = this.secrets.get(workspaceId, connector.id);
        if (!credentials || Object.keys(credentials).length === 0) {
          return res.status(409).json({ error: "Connector credentials are unavailable; store the connector secret before queueing",
              });
        }
          new ReleaseAuthorization(this.config.dataDirPath).authorizeDestination(workspaceId, req.params.releaseId, target.connectorId, target.destinationId);
          const authorized = new ReleaseAuthorization(
            this.config.dataDirPath,
          ).authorize(workspaceId, req.params.releaseId);
          const { title, description, tags, category, language } =
            authorized.snapshot;
          const renderOutputPath = authorized.localPath;
        const checkpoint = new PublishExecutionStore(this.config.dataDirPath).get(workspaceId, target.id);
        if (checkpoint && ["dispatching", "accepted", "reconciling"].includes(checkpoint.state)) return res.status(409).json({ error: "Publication has started or requires reconciliation; automatic upload retry is blocked" });
        const recovering = target.status === "failed";
        if (recovering && !checkpoint && target.retryDisposition !== "not_dispatched") return res.status(409).json({ error: "Legacy failed publication needs provider verification before retrying" });
        let job = await this.publishJobs.createJob({ releaseTargetId: target.id, connectorId: connector.id, destinationId: destination.id, tenantId: workspaceId, renderOutputPath, platform: connector.platform === "twitter" ? "x" : connector.platform, channelId: destination.externalDestinationId, title, description, tags, category, language,
            scheduleAt,
          });
        if (!recovering && job.scheduleAt !== (scheduleAt ?? null)) return res.status(409).json({ error: "This target already has a job with a different due time" });
        const queue = createPublishQueue(this.config);
        if (recovering) {
          // Drop the terminal BullMQ job so the re-add below is not ignored as a duplicate id.
          if (await queue.remove(`release-target-${target.id}`) !== 1) return res.status(409).json({ error: "Existing publish job is locked; retry after it finishes" });
          this.releases.updateTarget(workspaceId, target.id, { status: "queued", lastErrorCode: undefined });
          job = (await this.publishJobs.updateJobStatusForTenant(workspaceId, job.id, "queued", { error: null, scheduleAt: scheduleAt ?? null }))!;
        }
          await queue.add(
            "publish-release-target",
            {
              ...job,
              tenantId: workspaceId,
              publishJobId: job.id,
              releaseTargetId: target.id,
              connectorId: connector.id,
              destinationId: destination.id,
            },
            {
              jobId: `release-target-${target.id}`,
              delay: scheduleAt
                ? Math.max(0, Date.parse(scheduleAt) - Date.now())
                : 0,
            },
          );
          return res
            .status(202)
            .json({ jobId: job.id, targetId: target.id, queued: true });
        } catch (error) {
          return res
            .status(409)
            .json({
              error:
                error instanceof Error ? error.message : "release queue failed",
            });
        }
      },
    );

    this.router.post(
      "/:releaseId/targets",
      (req: ClaimsRequest, res: Response) => {
        try {
          const workspaceId = tenantIdFrom(req);
          const { connectorId, destinationId, idempotencyKey } = req.body || {};
          if (!connectorId || !destinationId || !idempotencyKey)
            return res
              .status(400)
              .json({
                error:
                  "connectorId, destinationId, and idempotencyKey are required",
              });
          const connector = this.connectors.getConnector(
            workspaceId,
            connectorId,
          );
          if (!connector)
            return res.status(404).json({ error: "Connector not found" });
          const destination = this.connectors
            .listDestinations(workspaceId, connectorId)
            .find((candidate) => candidate.id === destinationId);
          if (!destination || destination.status !== "verified")
            return res
              .status(409)
              .json({ error: "Verified destination is required" });
          new ReleaseAuthorization(this.config.dataDirPath).authorizeDestination(workspaceId, req.params.releaseId, connectorId, destinationId);
          const target = this.releases.createTarget({
            workspaceId,
            releaseId: req.params.releaseId,
            connectorId,
            destinationId,
            idempotencyKey,
          });
          return res.status(201).json({ target });
        } catch (error) {
          return res
            .status(409)
            .json({
              error:
                error instanceof Error
                  ? error.message
                  : "release target creation failed",
            });
        }
      },
    );
  }
}
