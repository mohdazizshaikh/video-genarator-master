import https from "node:https";
import { prepareWebhookUrl, assertProviderWebhookUrl, type DnsResolver } from "./webhookSecurity";

/** Validate again on every dispatch and connect directly to the validated IP.
 * Native HTTPS has no environment proxy or automatic redirect behavior. */
export async function sendWebhook(
  url: string,
  payload: unknown,
  options: { headers?: Record<string, string>; timeout?: number; method?: string; provider?: "slack" | "discord"; resolver?: DnsResolver } = {},
): Promise<void> {
  const target = await prepareWebhookUrl(url, options.resolver);
  if (options.provider) assertProviderWebhookUrl(options.provider, target.url);
  const body = JSON.stringify(payload);
  if (Buffer.byteLength(body) > 1024 * 1024) throw new Error("Notification payload exceeds limit");
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(options.headers || {})) {
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(key) || /[\r\n]/.test(value)) throw new Error("Invalid webhook header");
    if (["host", "content-length", "transfer-encoding", "connection", "upgrade"].includes(key.toLowerCase())) throw new Error("Reserved webhook header");
    headers[key] = value;
  }
  const method = options.method || "POST";
  if (!["POST", "PUT", "PATCH"].includes(method)) throw new Error("Invalid webhook method");
  await new Promise<void>((resolve, reject) => {
    const request = https.request(target.pinnedUrl, {
      method, servername: target.servername, agent: false,
      headers: { ...headers, Host: target.hostHeader, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    }, (response) => {
      let size = 0;
      response.on("error", reject);
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > 1024 * 1024) request.destroy(new Error("Webhook response exceeds limit"));
      });
      response.on("end", () => {
        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) resolve();
        else reject(new Error(`Webhook returned HTTP ${response.statusCode || 0}`));
      });
    });
    const timer = setTimeout(() => request.destroy(new Error("Webhook request timed out")), options.timeout || 10000);
    request.on("close", () => clearTimeout(timer));
    request.on("error", reject);
    request.end(body);
  });
}
