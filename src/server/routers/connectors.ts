/**
 * Workspace-owned connector metadata routes.
 *
 * This compatibility API deliberately accepts credential references only. It
 * does not accept or return provider tokens, and it never marks a destination
 * verified without a separate provider verification flow.
 */
import { Router, json } from "express";
import axios from "axios";
import type { Request, Response } from "express";
import type { Config } from "../../config";
import { ConnectorStore } from "../../db/ConnectorStore";
import { ConnectorSecretStore } from "../../db/ConnectorSecretStore";
import { getAuthenticatedTenantId } from "../auth";
import type { ConnectorPlatform, ConnectorStatus } from "../../types/ownership";

function tenantIdFrom(req: Request): string {
  const tenantId = getAuthenticatedTenantId(req);
  if (!tenantId) throw new Error("Authenticated workspace is required");
  return tenantId;
}

const PLATFORMS: ConnectorPlatform[] = ["telegram", "youtube", "instagram", "facebook", "linkedin", "twitter"];
const STATUSES: ConnectorStatus[] = ["pending", "connected", "reauthorization_required", "disabled", "error"];

export class ConnectorsRouter {
  public readonly router: Router;
  private readonly store: ConnectorStore;
  private readonly secrets?: ConnectorSecretStore;

  constructor(config: Config) {
    this.router = Router();
    this.router.use(json());
    this.store = new ConnectorStore(config.dataDirPath);
    const encryptionSecret = process.env.TENANT_KEYS_SECRET || "";
    if (encryptionSecret.trim()) this.secrets = new ConnectorSecretStore(config.dataDirPath, encryptionSecret);
    this.register();
  }

  private register(): void {
    this.router.get("/", (req, res) => {
      res.json({ connectors: this.store.listConnectors(tenantIdFrom(req)) });
    });

    this.router.post("/", (req: Request, res: Response) => {
      try {
        const workspaceId = tenantIdFrom(req);
        const { platform, displayName, credentialRef, externalAccountId, capabilities = {} } = req.body || {};
        if (!PLATFORMS.includes(platform)) return res.status(400).json({ error: "valid platform is required" });
        if (!displayName || typeof displayName !== "string") return res.status(400).json({ error: "displayName is required" });
        if (!credentialRef || typeof credentialRef !== "string" || !credentialRef.startsWith("secret://")) {
          return res.status(400).json({ error: "credentialRef must reference managed secret storage" });
        }
        const connector = this.store.createConnector({
          workspaceId,
          platform,
          displayName,
          status: "pending",
          credentialRef,
          externalAccountId: typeof externalAccountId === "string" ? externalAccountId : undefined,
          capabilities: typeof capabilities === "object" && capabilities !== null ? capabilities : {},
        });
        return res.status(201).json({ connector });
      } catch (error) {
        return res.status(409).json({ error: error instanceof Error ? error.message : "connector creation failed" });
      }
    });

    this.router.patch("/:connectorId", (req: Request, res: Response) => {
      const workspaceId = tenantIdFrom(req);
      const updates = req.body || {};
      if (updates.status !== undefined && !STATUSES.includes(updates.status)) {
        return res.status(400).json({ error: "invalid connector status" });
      }
      const connector = this.store.updateConnector(workspaceId, req.params.connectorId, {
        displayName: typeof updates.displayName === "string" ? updates.displayName : undefined,
        status: updates.status,
        capabilities: typeof updates.capabilities === "object" && updates.capabilities !== null ? updates.capabilities : undefined,
        externalAccountId: typeof updates.externalAccountId === "string" ? updates.externalAccountId : undefined,
      });
      if (!connector) return res.status(404).json({ error: "Connector not found" });
      return res.json({ connector });
    });

    this.router.put("/:connectorId/secret", (req: Request, res: Response) => {
      const workspaceId = tenantIdFrom(req);
      if (!this.store.getConnector(workspaceId, req.params.connectorId)) return res.status(404).json({ error: "Connector not found" });
      if (!this.secrets) return res.status(503).json({ error: "Connector secret storage is not configured" });
      const secret = req.body?.secret;
      if (!secret || typeof secret !== "object" || Array.isArray(secret) || Object.values(secret).some((value) => typeof value !== "string" || !value.trim())) {
        return res.status(400).json({ error: "non-empty secret values are required" });
      }
      this.secrets.put(workspaceId, req.params.connectorId, secret as Record<string, string>);
      return res.json({ connectorId: req.params.connectorId, secretStored: true });
    });

    this.router.post("/:connectorId/destinations/:destinationId/verify", async (req: Request, res: Response) => {
      const workspaceId = tenantIdFrom(req);
      const connector = this.store.getConnector(workspaceId, req.params.connectorId);
      const destination = connector ? this.store.listDestinations(workspaceId, connector.id).find((candidate) => candidate.id === req.params.destinationId) : undefined;
      if (!connector || !destination) return res.status(404).json({ error: "Connector or destination not found" });
      if (connector.platform !== "telegram") return res.status(400).json({ error: "Verification is not implemented for this platform" });
      if (!this.secrets) return res.status(503).json({ error: "Connector secret storage is not configured" });
      const secret = this.secrets.get(workspaceId, connector.id);
      const botToken = secret?.botToken;
      if (!botToken) return res.status(409).json({ error: "Telegram bot credential is not configured" });
      try {
        const base = `https://api.telegram.org/bot${botToken}`;
        const bot = await axios.get(`${base}/getMe`, { timeout: 10000 });
        const chat = await axios.get(`${base}/getChat`, { params: { chat_id: destination.externalDestinationId }, timeout: 10000 });
        if (bot.data?.ok !== true || chat.data?.ok !== true) throw new Error("provider verification failed");
        const verified = this.store.updateDestination(workspaceId, destination.id, {
          status: "verified",
          verificationEvidence: { verifiedAt: new Date().toISOString(), botUsername: String(bot.data.result?.username || ""), chatType: String(chat.data.result?.type || "") },
        });
        this.store.updateConnector(workspaceId, connector.id, { status: "connected" });
        return res.json({ destination: verified, connectorId: connector.id, verified: true });
      } catch {
        this.store.updateDestination(workspaceId, destination.id, { status: "permission_error", verificationEvidence: { lastCheckedAt: new Date().toISOString(), result: "provider_verification_failed" } });
        return res.status(502).json({ error: "Telegram destination verification failed" });
      }
    });

    this.router.get("/:connectorId/destinations", (req: Request, res: Response) => {
      res.json({ destinations: this.store.listDestinations(tenantIdFrom(req), req.params.connectorId) });
    });

    this.router.post("/:connectorId/destinations", (req: Request, res: Response) => {
      try {
        const workspaceId = tenantIdFrom(req);
        const { externalDestinationId, displayName } = req.body || {};
        if (!externalDestinationId || !displayName) return res.status(400).json({ error: "externalDestinationId and displayName are required" });
        const destination = this.store.createDestination({
          workspaceId,
          connectorId: req.params.connectorId,
          externalDestinationId,
          displayName,
          status: "pending_verification",
          verificationEvidence: {},
        });
        return res.status(201).json({ destination });
      } catch (error) {
        return res.status(409).json({ error: error instanceof Error ? error.message : "destination creation failed" });
      }
    });
  }
}
