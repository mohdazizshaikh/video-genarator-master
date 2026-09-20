/* eslint-disable @remotion/deterministic-randomness */

import axios from "axios";
import fs from "fs-extra";
import path from "path";
import { logger } from "../logger";

export type NotificationEvent =
  | "video.ready"
  | "video.published"
  | "video.failed"
  | "trend.detected"
  | "cost.alert"
  | "shadowban.detected"
  | "recycle.ready"
  | "queue.complete"
  | "system.error";

export type WebhookChannel = "telegram" | "slack" | "discord" | "custom";

export interface WebhookConfig {
  /** Workspace owner; legacy records without this field are quarantined. */
  tenantId: string;
  id: string;
  name: string;
  channel: WebhookChannel;
  enabled: boolean;
  events: NotificationEvent[];
  createdAt: string;
  lastTriggeredAt?: string;
  triggerCount: number;
  // Telegram
  telegramBotToken?: string;
  telegramChatId?: string;
  // Slack
  slackWebhookUrl?: string;
  // Discord
  discordWebhookUrl?: string;
  // Custom
  customUrl?: string;
  customHeaders?: Record<string, string>;
  customMethod?: "POST" | "PUT" | "PATCH";
}

export interface NotificationPayload {
  event: NotificationEvent;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
  severity?: "info" | "warning" | "error" | "success";
}

export interface NotificationResult {
  webhookId: string;
  webhookName: string;
  channel: WebhookChannel;
  event: NotificationEvent;
  success: boolean;
  error?: string;
  sentAt: string;
}

export interface NotificationLog {
  tenantId: string;
  id: string;
  webhookId: string;
  webhookName: string;
  channel: WebhookChannel;
  event: NotificationEvent;
  title: string;
  success: boolean;
  error?: string;
  sentAt: string;
}

const EVENT_EMOJIS: Record<NotificationEvent, string> = {
  "video.ready": "🎬",
  "video.published": "✅",
  "video.failed": "❌",
  "trend.detected": "🔥",
  "cost.alert": "💰",
  "shadowban.detected": "⚠️",
  "recycle.ready": "♻️",
  "queue.complete": "✔️",
  "system.error": "🚨",
};

const SEVERITY_COLORS: Record<string, number> = {
  info: 0x6366f1,
  success: 0x22c55e,
  warning: 0xf59e0b,
  error: 0xef4444,
};

export class WebhookNotificationEngine {
  private dataPath: string;
  private logPath: string;
  private webhooks: WebhookConfig[] = [];
  private logs: NotificationLog[] = [];

  constructor(dataDirPath: string) {
    this.dataPath = path.join(dataDirPath, "webhooks.json");
    this.logPath = path.join(dataDirPath, "webhook-logs.json");
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.dataPath)) {
        this.webhooks = fs.readJsonSync(this.dataPath);
      }
      if (fs.existsSync(this.logPath)) {
        this.logs = fs.readJsonSync(this.logPath);
        // Keep last 500 logs
        if (this.logs.length > 500) this.logs = this.logs.slice(-500);
      }
    } catch { this.webhooks = []; this.logs = []; }
  }

  private save() {
    try {
      fs.ensureFileSync(this.dataPath);
      fs.writeJsonSync(this.dataPath, this.webhooks, { spaces: 2 });
      fs.ensureFileSync(this.logPath);
      fs.writeJsonSync(this.logPath, this.logs.slice(-500), { spaces: 2 });
    } catch (err) { logger.error({ err }, "Failed to save webhook data"); }
  }

  private generateId(): string {
    return `wh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  // ── Telegram ──────────────────────────────────────────────────────────────

  private async sendTelegram(webhook: WebhookConfig, payload: NotificationPayload): Promise<void> {
    if (!webhook.telegramBotToken || !webhook.telegramChatId) {
      throw new Error("Telegram bot token and chat ID are required");
    }
    const emoji = EVENT_EMOJIS[payload.event] || "📢";
    const severityLabel = payload.severity === "error" ? "🔴" : payload.severity === "warning" ? "🟡" : payload.severity === "success" ? "🟢" : "🔵";
    const text = [
      `${emoji} *${this.escapeMarkdown(payload.title)}*`,
      `${severityLabel} ${this.escapeMarkdown(payload.message)}`,
      ``,
      `🕐 ${new Date(payload.timestamp).toLocaleString()}`,
      payload.data ? `📊 \`${JSON.stringify(payload.data).slice(0, 200)}\`` : "",
      ``,
      `_AI Content Empire_`,
    ].filter(Boolean).join("\n");

    await axios.post(
      `https://api.telegram.org/bot${webhook.telegramBotToken}/sendMessage`,
      { chat_id: webhook.telegramChatId, text, parse_mode: "Markdown" },
      { timeout: 10000 },
    );
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
  }

  // ── Slack ─────────────────────────────────────────────────────────────────

  private async sendSlack(webhook: WebhookConfig, payload: NotificationPayload): Promise<void> {
    if (!webhook.slackWebhookUrl) throw new Error("Slack webhook URL is required");
    const emoji = EVENT_EMOJIS[payload.event] || ":bell:";
    const color = payload.severity === "error" ? "danger" : payload.severity === "warning" ? "warning" : "good";

    await axios.post(
      webhook.slackWebhookUrl,
      {
        text: `${emoji} *${payload.title}*`,
        attachments: [{
          color,
          fields: [
            { title: "Message", value: payload.message, short: false },
            { title: "Event", value: payload.event, short: true },
            { title: "Time", value: new Date(payload.timestamp).toLocaleString(), short: true },
            ...(payload.data ? [{ title: "Data", value: `\`\`\`${JSON.stringify(payload.data, null, 2).slice(0, 300)}\`\`\``, short: false }] : []),
          ],
          footer: "AI Content Empire v11.0",
        }],
      },
      { timeout: 10000 },
    );
  }

  // ── Discord ───────────────────────────────────────────────────────────────

  private async sendDiscord(webhook: WebhookConfig, payload: NotificationPayload): Promise<void> {
    if (!webhook.discordWebhookUrl) throw new Error("Discord webhook URL is required");
    const emoji = EVENT_EMOJIS[payload.event] || "📢";
    const color = SEVERITY_COLORS[payload.severity || "info"] || SEVERITY_COLORS.info;

    await axios.post(
      webhook.discordWebhookUrl,
      {
        username: "AI Content Empire",
        embeds: [{
          title: `${emoji} ${payload.title}`,
          description: payload.message,
          color,
          fields: [
            { name: "Event", value: payload.event, inline: true },
            { name: "Severity", value: payload.severity || "info", inline: true },
            ...(payload.data ? [{ name: "Data", value: `\`\`\`json\n${JSON.stringify(payload.data, null, 2).slice(0, 500)}\n\`\`\``, inline: false }] : []),
          ],
          timestamp: payload.timestamp,
          footer: { text: "AI Viral Content Empire v11.0" },
        }],
      },
      { timeout: 10000 },
    );
  }

  // ── Custom HTTP ───────────────────────────────────────────────────────────

  private async sendCustom(webhook: WebhookConfig, payload: NotificationPayload): Promise<void> {
    if (!webhook.customUrl) throw new Error("Custom URL is required");
    const method = (webhook.customMethod || "POST").toLowerCase() as "post" | "put" | "patch";
    await axios[method](
      webhook.customUrl,
      { event: payload.event, title: payload.title, message: payload.message, data: payload.data, timestamp: payload.timestamp, severity: payload.severity, source: "ai-content-empire" },
      { headers: { "Content-Type": "application/json", ...(webhook.customHeaders || {}) }, timeout: 10000 },
    );
  }

  // ── Core dispatch ─────────────────────────────────────────────────────────

  async notify(tenantId: string, event: NotificationEvent, title: string, message: string, data?: Record<string, unknown>, severity: NotificationPayload["severity"] = "info"): Promise<NotificationResult[]> {
    const matching = this.webhooks.filter((w) => w.tenantId === tenantId && w.enabled && w.events.includes(event));
    if (!matching.length) return [];

    const payload: NotificationPayload = { event, title, message, data, timestamp: new Date().toISOString(), severity };
    const results: NotificationResult[] = [];

    await Promise.allSettled(
      matching.map(async (webhook) => {
        const result: NotificationResult = {
          webhookId: webhook.id,
          webhookName: webhook.name,
          channel: webhook.channel,
          event,
          success: false,
          sentAt: new Date().toISOString(),
        };
        try {
          switch (webhook.channel) {
            case "telegram": await this.sendTelegram(webhook, payload); break;
            case "slack": await this.sendSlack(webhook, payload); break;
            case "discord": await this.sendDiscord(webhook, payload); break;
            case "custom": await this.sendCustom(webhook, payload); break;
          }
          result.success = true;
          webhook.lastTriggeredAt = result.sentAt;
          webhook.triggerCount = (webhook.triggerCount || 0) + 1;
          logger.info({ webhookId: webhook.id, event, channel: webhook.channel }, "Notification sent");
        } catch (err: unknown) {
          result.error = (err as Error).message;
          logger.warn({ webhookId: webhook.id, event, err: result.error }, "Notification failed");
        }
        results.push(result);

        this.logs.push({
          tenantId,
          id: this.generateId(),
          webhookId: webhook.id,
          webhookName: webhook.name,
          channel: webhook.channel,
          event,
          title,
          success: result.success,
          error: result.error,
          sentAt: result.sentAt,
        });
      }),
    );

    this.save();
    return results;
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  addWebhook(config: Omit<WebhookConfig, "id" | "createdAt" | "triggerCount">): WebhookConfig {
    const webhook: WebhookConfig = {
      ...config,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      triggerCount: 0,
    };
    this.webhooks.push(webhook);
    this.save();
    return this.toSafeWebhook(webhook);
  }

  private toSafeWebhook(webhook: WebhookConfig): WebhookConfig {
    return {
      ...webhook,
      telegramBotToken: webhook.telegramBotToken ? "[configured]" : undefined,
      slackWebhookUrl: webhook.slackWebhookUrl ? "[configured]" : undefined,
      discordWebhookUrl: webhook.discordWebhookUrl ? "[configured]" : undefined,
      customUrl: webhook.customUrl ? "[configured]" : undefined,
      customHeaders: webhook.customHeaders ? { "[configured]": "[configured]" } : undefined,
    };
  }

  updateWebhook(tenantId: string, id: string, updates: Partial<WebhookConfig>): WebhookConfig | null {
    const idx = this.webhooks.findIndex((w) => w.id === id && w.tenantId === tenantId);
    if (idx === -1) return null;
    this.webhooks[idx] = { ...this.webhooks[idx], ...updates, id };
    this.save();
    return this.toSafeWebhook(this.webhooks[idx]);
  }

  deleteWebhook(tenantId: string, id: string): boolean {
    const before = this.webhooks.length;
    this.webhooks = this.webhooks.filter((w) => !(w.id === id && w.tenantId === tenantId));
    if (this.webhooks.length < before) { this.save(); return true; }
    return false;
  }

  toggleWebhook(tenantId: string, id: string): WebhookConfig | null {
    const w = this.webhooks.find((w) => w.id === id && w.tenantId === tenantId);
    if (!w) return null;
    w.enabled = !w.enabled;
    this.save();
    return this.toSafeWebhook(w);
  }

  getWebhooks(tenantId: string): WebhookConfig[] { return this.webhooks.filter((w) => w.tenantId === tenantId).map((w) => this.toSafeWebhook(w)); }

  getLogs(tenantId: string, limit = 100): NotificationLog[] { return this.logs.filter((log) => log.tenantId === tenantId).slice(-limit).reverse(); }

  getStats(tenantId: string) {
    const webhooks = this.webhooks.filter((w) => w.tenantId === tenantId);
    const logs = this.logs.filter((log) => log.tenantId === tenantId);
    return {
      total: webhooks.length,
      enabled: webhooks.filter((w) => w.enabled).length,
      byChannel: {
        telegram: webhooks.filter((w) => w.channel === "telegram").length,
        slack: webhooks.filter((w) => w.channel === "slack").length,
        discord: webhooks.filter((w) => w.channel === "discord").length,
        custom: webhooks.filter((w) => w.channel === "custom").length,
      },
      recentLogs: logs.slice(-20).reverse(),
      successRate: logs.length
        ? Math.round((logs.filter((l) => l.success).length / logs.length) * 100)
        : 100,
    };
  }

  async testWebhook(tenantId: string, id: string): Promise<NotificationResult[]> {
    const webhook = this.webhooks.find((w) => w.id === id && w.tenantId === tenantId);
    if (!webhook) throw new Error(`Webhook ${id} not found`);
    const original = webhook.enabled;
    webhook.enabled = true;
    const results = await this.notify(
      tenantId,
      "video.ready",
      "Test Notification",
      `This is a test from AI Content Empire. Webhook "${webhook.name}" is working correctly.`,
      { webhookId: id, test: true },
      "info",
    );
    webhook.enabled = original;
    return results;
  }
}
