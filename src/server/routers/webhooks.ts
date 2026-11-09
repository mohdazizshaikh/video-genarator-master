import { Router } from "express";
import type { Request, Response } from "express";
import type { Config } from "../../config";
import { WebhookNotificationEngine, WebhookNotFoundError, WebhookStorageUnavailableError } from "../../services/WebhookNotificationEngine";
import { WebhookValidationError } from "../../services/webhookSecurity";
import { logger } from "../../logger";
import { getAuthenticatedTenantId, requireWorkspace } from "../auth";

function tenantIdFrom(req: Request): string {
  const tenantId = getAuthenticatedTenantId(req);
  if (!tenantId) throw new Error("Authenticated workspace is required");
  return tenantId;
}

export class WebhooksRouter {
  readonly router: Router;
  private engine: WebhookNotificationEngine;

  constructor(config: Config, engine?: WebhookNotificationEngine) {
    this.router = Router();
    this.engine = engine ?? new WebhookNotificationEngine(config.dataDirPath);
    this.registerRoutes();
  }

  private sendError(res: Response, error: unknown, fallback: string) {
    if (error instanceof WebhookValidationError) return res.status(400).json({ error: error.message, code: error.code });
    if (error instanceof WebhookNotFoundError) return res.status(404).json({ error: "Webhook not found" });
    if (error instanceof WebhookStorageUnavailableError) return res.status(503).json({ error: "Webhook secret storage is unavailable" });
    logger.error({ errorType: error instanceof Error ? error.name : "unknown" }, fallback);
    return res.status(500).json({ error: fallback });
  }

  private registerRoutes() {
    this.router.use(requireWorkspace);

    // GET /api/webhooks — list all webhooks
    this.router.get("/", (req, res) => {
      try {
        res.json({ webhooks: this.engine.getWebhooks(tenantIdFrom(req)) });
      } catch (err) {
        logger.error({ err }, "GET /webhooks failed");
        res.status(500).json({ error: "Failed to fetch webhooks" });
      }
    });

    // GET /api/webhooks/stats — stats + recent logs
    this.router.get("/stats", (req, res) => {
      try {
        res.json(this.engine.getStats(tenantIdFrom(req)));
      } catch (err) {
        logger.error({ err }, "GET /webhooks/stats failed");
        res.status(500).json({ error: "Failed to fetch stats" });
      }
    });

    // GET /api/webhooks/logs — recent notification logs
    this.router.get("/logs", (req, res) => {
      try {
        const limit = Number(req.query.limit) || 100;
        res.json({ logs: this.engine.getLogs(tenantIdFrom(req), limit) });
      } catch (err) {
        logger.error({ err }, "GET /webhooks/logs failed");
        res.status(500).json({ error: "Failed to fetch logs" });
      }
    });

    // POST /api/webhooks — create webhook
    this.router.post("/", async (req, res) => {
      try {
        if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) return res.status(400).json({ error: "Webhook configuration must be an object" });
        const { name, channel, events, telegramBotToken, telegramChatId, slackWebhookUrl, discordWebhookUrl, customUrl, customHeaders, customMethod } = req.body;
        if (!name || !channel || !events?.length) {
          return res.status(400).json({ error: "name, channel, and events are required" });
        }
        const webhook = await this.engine.addWebhook({
          tenantId: tenantIdFrom(req),
          name,
          channel,
          enabled: true,
          events,
          telegramBotToken,
          telegramChatId,
          slackWebhookUrl,
          discordWebhookUrl,
          customUrl,
          customHeaders,
          customMethod,
        });
        res.status(201).json({ webhook });
      } catch (err) {
        this.sendError(res, err, "Failed to create webhook");
      }
    });

    // PUT /api/webhooks/:id — update webhook
    this.router.put("/:id", async (req, res) => {
      try {
        const updated = await this.engine.updateWebhook(tenantIdFrom(req), req.params.id, req.body);
        if (!updated) return res.status(404).json({ error: "Webhook not found" });
        res.json({ webhook: updated });
      } catch (err) {
        this.sendError(res, err, "Failed to update webhook");
      }
    });

    // DELETE /api/webhooks/:id — delete webhook
    this.router.delete("/:id", (req, res) => {
      try {
        const ok = this.engine.deleteWebhook(tenantIdFrom(req), req.params.id);
        if (!ok) return res.status(404).json({ error: "Webhook not found" });
        res.json({ success: true });
      } catch (err) {
        logger.error({ err }, "DELETE /webhooks/:id failed");
        res.status(500).json({ error: "Failed to delete webhook" });
      }
    });

    // PATCH /api/webhooks/:id/toggle — enable/disable
    this.router.patch("/:id/toggle", (req, res) => {
      try {
        const updated = this.engine.toggleWebhook(tenantIdFrom(req), req.params.id);
        if (!updated) return res.status(404).json({ error: "Webhook not found" });
        res.json({ webhook: updated });
      } catch (err) {
        logger.error({ err }, "PATCH /webhooks/:id/toggle failed");
        res.status(500).json({ error: "Failed to toggle webhook" });
      }
    });

    // POST /api/webhooks/:id/test — send test notification
    this.router.post("/:id/test", async (req, res) => {
      try {
        const results = await this.engine.testWebhook(tenantIdFrom(req), req.params.id);
        res.json({ results });
      } catch (err) {
        this.sendError(res, err, "Webhook test failed");
      }
    });

    // POST /api/webhooks/notify — manually trigger event
    this.router.post("/notify", async (req, res) => {
      try {
        const { event, title, message, data, severity } = req.body;
        if (!event || !title || !message) {
          return res.status(400).json({ error: "event, title, and message are required" });
        }
        const results = await this.engine.notify(tenantIdFrom(req), event, title, message, data, severity);
        res.json({ results, count: results.length });
      } catch (err) {
        this.sendError(res, err, "Failed to dispatch notification");
      }
    });
  }
}
