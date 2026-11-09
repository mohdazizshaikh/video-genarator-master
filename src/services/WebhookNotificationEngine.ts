import { sendWebhook } from "./WebhookTransport";
import { z } from "zod";
import { WebhookValidationError, prepareWebhookUrl, assertProviderWebhookUrl, type DnsResolver, sanitizeWebhookError } from "./webhookSecurity";
import fs from "fs-extra";
import path from "path";
import crypto from "node:crypto";
import { CryptoService } from "./CryptoService";
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

export class WebhookNotFoundError extends Error {}
export class WebhookStorageUnavailableError extends Error {}

const webhookSchema = z.object({
  tenantId: z.string().min(1).max(200),
  name: z.string().trim().min(1).max(200),
  channel: z.enum(["telegram", "slack", "discord", "custom"]),
  enabled: z.boolean(),
  events: z.array(z.enum(["video.ready", "video.published", "video.failed", "trend.detected", "cost.alert", "shadowban.detected", "recycle.ready", "queue.complete", "system.error"])).min(1).max(9),
  telegramBotToken: z.string().max(500).optional(),
  telegramChatId: z.string().max(200).optional(),
  slackWebhookUrl: z.string().max(2048).optional(),
  discordWebhookUrl: z.string().max(2048).optional(),
  customUrl: z.string().max(2048).optional(),
  customHeaders: z.record(z.string(), z.string().max(2000)).refine((headers) => Object.keys(headers).length <= 20).optional(),
  customMethod: z.enum(["POST", "PUT", "PATCH"]).optional(),
});

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

  constructor(dataDirPath: string, private resolver?: DnsResolver) {
    this.dataPath = path.join(dataDirPath, "webhooks.json");
    this.logPath = path.join(dataDirPath, "webhook-logs.json");
    this.load();
  }

  private cipher(): CryptoService {
    const key = process.env.TENANT_KEYS_SECRET;
    if (!key) throw new WebhookStorageUnavailableError("Webhook secret storage is unavailable");
    return new CryptoService(key);
  }

  private load() {
    if (fs.existsSync(this.dataPath)) {
      const stored = fs.readJsonSync(this.dataPath);
      // Legacy arrays are read for compatibility and encrypted on the next save.
      const records = Array.isArray(stored) ? stored : stored?.schemaVersion === 1 && typeof stored.encrypted === "string"
        ? JSON.parse(this.cipher().decrypt(stored.encrypted)) : null;
      if (!Array.isArray(records)) throw new Error("Invalid webhook store");
      this.webhooks = records;
    }
    if (fs.existsSync(this.logPath)) {
      const logs = fs.readJsonSync(this.logPath);
      if (!Array.isArray(logs)) throw new Error("Invalid webhook log store");
      this.logs = logs.slice(-500);
    }
  }

  private atomicWrite(file: string, value: unknown) {
    fs.ensureDirSync(path.dirname(file));
    const temporary = `${file}.${crypto.randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, JSON.stringify(value, null, 2), { mode: 0o600, flag: "wx" });
      fs.renameSync(temporary, file);
    } finally { fs.removeSync(temporary); }
  }

  private save() {
    // Encrypt before writing anything; missing/wrong keys never reset the store.
    const encrypted = this.cipher().encrypt(JSON.stringify(this.webhooks));
    this.atomicWrite(this.dataPath, { schemaVersion: 1, encrypted });
    this.atomicWrite(this.logPath, this.logs.slice(-500));
  }

  private generateId(): string {
    return `wh_${crypto.randomUUID()}`;
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

    await sendWebhook(
      `https://api.telegram.org/bot${webhook.telegramBotToken}/sendMessage`,
      { chat_id: webhook.telegramChatId, text, parse_mode: "Markdown" },
      { resolver: this.resolver, timeout: 10000 },
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

    await sendWebhook(
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
      { resolver: this.resolver, timeout: 10000, provider: "slack" },
    );
  }

  // ── Discord ───────────────────────────────────────────────────────────────

  private async sendDiscord(webhook: WebhookConfig, payload: NotificationPayload): Promise<void> {
    if (!webhook.discordWebhookUrl) throw new Error("Discord webhook URL is required");
    const emoji = EVENT_EMOJIS[payload.event] || "📢";
    const color = SEVERITY_COLORS[payload.severity || "info"] || SEVERITY_COLORS.info;

    await sendWebhook(
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
      { resolver: this.resolver, timeout: 10000, provider: "discord" },
    );
  }

  // ── Custom HTTP ───────────────────────────────────────────────────────────

  private async sendCustom(webhook: WebhookConfig, payload: NotificationPayload): Promise<void> {
    if (!webhook.customUrl) throw new Error("Custom URL is required");
    const method = webhook.customMethod || "POST";
    await sendWebhook(
      webhook.customUrl,
      { event: payload.event, title: payload.title, message: payload.message, data: payload.data, timestamp: payload.timestamp, severity: payload.severity, source: "ai-content-empire" },
      { resolver: this.resolver, headers: webhook.customHeaders, method, timeout: 10000 },
    );
  }

  // ── Core dispatch ─────────────────────────────────────────────────────────

  async notify(tenantId: string, event: NotificationEvent, title: string, message: string, data?: Record<string, unknown>, severity: NotificationPayload["severity"] = "info", selectedId?: string): Promise<NotificationResult[]> {
    if (!Object.prototype.hasOwnProperty.call(EVENT_EMOJIS, event) || typeof title !== "string" || !title.trim() || title.length > 500 || typeof message !== "string" || !message.trim() || message.length > 10000 || !["info", "warning", "error", "success"].includes(severity)) throw new WebhookValidationError("Invalid notification event or message", "invalid_payload");
    this.cipher();
    const matching = this.webhooks.filter((w) => w.tenantId === tenantId && (selectedId ? w.id === selectedId : w.enabled && w.events.includes(event)));
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
            default: throw new Error("Unsupported webhook channel");
          }
          result.success = true;
          webhook.lastTriggeredAt = result.sentAt;
          webhook.triggerCount = (webhook.triggerCount || 0) + 1;
          logger.info({ webhookId: webhook.id, event, channel: webhook.channel }, "Notification sent");
        } catch (err: unknown) {
          result.error = sanitizeWebhookError((err as Error).message, [webhook.telegramBotToken, webhook.slackWebhookUrl, webhook.discordWebhookUrl, webhook.customUrl, ...Object.values(webhook.customHeaders || {})]);
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

  private validateConfig(config: WebhookConfig | Omit<WebhookConfig, "id" | "createdAt" | "triggerCount">) {
    if (!webhookSchema.safeParse(config).success) throw new WebhookValidationError("Invalid webhook configuration", "invalid_config");
    if (config.telegramBotToken && !/^\d+:[A-Za-z0-9_-]+$/.test(config.telegramBotToken)) throw new WebhookValidationError("Invalid Telegram bot token", "invalid_config");
    for (const [name, value] of Object.entries(config.customHeaders || {})) {
      if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) || /[\r\n]/.test(value) || ["host", "content-length", "transfer-encoding", "connection", "upgrade"].includes(name.toLowerCase())) throw new WebhookValidationError("Invalid or reserved custom header", "invalid_config");
    }
  }

  private async validateDestination(config: WebhookConfig | Omit<WebhookConfig, "id" | "createdAt" | "triggerCount">) {
    const url = config.channel === "slack" ? config.slackWebhookUrl : config.channel === "discord" ? config.discordWebhookUrl : config.channel === "custom" ? config.customUrl : `https://api.telegram.org/bot${config.telegramBotToken || ""}/sendMessage`;
    if (!url || (config.channel === "telegram" && (!config.telegramBotToken || !config.telegramChatId))) throw new WebhookValidationError("Webhook destination is required", "invalid_config");
    const target = await prepareWebhookUrl(url, this.resolver);
    if (config.channel === "slack" || config.channel === "discord") assertProviderWebhookUrl(config.channel, target.url);
  }

  async addWebhook(config: Omit<WebhookConfig, "id" | "createdAt" | "triggerCount">): Promise<WebhookConfig> {
    this.cipher();
    this.validateConfig(config);
    await this.validateDestination(config);
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

  async updateWebhook(tenantId: string, id: string, updates: Partial<WebhookConfig>): Promise<WebhookConfig | null> {
    if (!updates || typeof updates !== "object" || Array.isArray(updates)) throw new WebhookValidationError("Webhook update must be an object", "invalid_config");
    this.cipher();
    const idx = this.webhooks.findIndex((w) => w.id === id && w.tenantId === tenantId);
    if (idx === -1) return null;
    const original = this.webhooks[idx];
    const mutable: Partial<WebhookConfig> = {};
    const allowed = ["name", "channel", "enabled", "events", "telegramBotToken", "telegramChatId", "slackWebhookUrl", "discordWebhookUrl", "customUrl", "customHeaders", "customMethod"] as const;
    for (const key of allowed) {
      if (updates[key] === "[configured]" || (key === "customHeaders" && updates.customHeaders?.["[configured]"])) continue;
      if (Object.prototype.hasOwnProperty.call(updates, key)) Object.assign(mutable, { [key]: updates[key] });
    }
    const candidate = { ...this.webhooks[idx], ...mutable, id, tenantId, createdAt: this.webhooks[idx].createdAt, triggerCount: this.webhooks[idx].triggerCount, lastTriggeredAt: this.webhooks[idx].lastTriggeredAt };
    this.validateConfig(candidate);
    await this.validateDestination(candidate);
    const currentIndex = this.webhooks.findIndex((w) => w.id === id && w.tenantId === tenantId);
    if (currentIndex === -1) return null;
    if (this.webhooks[currentIndex] !== original) throw new Error("Webhook changed during validation; retry update");
    this.webhooks[currentIndex] = candidate;
    this.save();
    return this.toSafeWebhook(candidate);
  }

  deleteWebhook(tenantId: string, id: string): boolean {
    this.cipher();
    const before = this.webhooks.length;
    this.webhooks = this.webhooks.filter((w) => !(w.id === id && w.tenantId === tenantId));
    if (this.webhooks.length < before) { this.save(); return true; }
    return false;
  }

  toggleWebhook(tenantId: string, id: string): WebhookConfig | null {
    this.cipher();
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
    if (!webhook) throw new WebhookNotFoundError("Webhook not found");
    const results = await this.notify(
      tenantId,
      "video.ready",
      "Test Notification",
      `This is a test from AI Content Empire. Webhook "${webhook.name}" is working correctly.`,
      { webhookId: id, test: true },
      "info",
      id,
    );
    return results;
  }
}
