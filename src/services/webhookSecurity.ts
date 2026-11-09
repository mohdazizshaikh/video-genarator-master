/**
 * Webhook URL policy and error sanitization.
 *
 * Outgoing webhooks are user-controlled server-side requests, so they are an
 * SSRF boundary. Policy:
 *   - https only, no embedded credentials, no URL fragments abuse
 *   - hostname must resolve (DNS) and every resolved address must be public
 *   - the validated address is pinned for the actual request (DNS-rebinding
 *     and redirect protection); redirects are disabled by the transport
 *
 * Provider URLs (Slack/Discord) additionally require the provider host and
 * path prefix. Custom webhooks may target any public https host.
 */
import dns from "node:dns/promises";
import net from "node:net";

export type DnsLookupResult = { address: string; family: number };
export type DnsResolver = (hostname: string) => Promise<DnsLookupResult[]>;

export interface PreparedWebhookUrl {
  /** Parsed original URL (used for provider checks). */
  url: URL;
  /** URL whose hostname is replaced by the validated IP address. */
  pinnedUrl: string;
  /** Original Host header (hostname[:port]) for the pinned request. */
  hostHeader: string;
  /** TLS SNI/verification name; undefined for literal-IP URLs. */
  servername?: string;
}

export class WebhookValidationError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "WebhookValidationError";
  }
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "metadata",
  "metadata.google.internal",
  "instance-data",
]);

const DEFAULT_DNS_TIMEOUT_MS = 3000;

export const defaultDnsResolver: DnsResolver = async (hostname) => {
  const results = await dns.lookup(hostname, { all: true, verbatim: true });
  return results.map((entry) => ({ address: entry.address, family: entry.family }));
};

function parseIpv4(address: string): number[] | null {
  const parts = address.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return null;
  return octets;
}

function isBlockedIpv4(octets: number[]): boolean {
  const [a, b, c] = octets;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // IETF protocol / TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
  if (a === 192 && b === 88 && c === 99) return true; // Deprecated relay range
  if (a >= 224) return true; // multicast, reserved, broadcast
  return false;
}

function ipv6ToBytes(input: string): number[] | null {
  let value = input.toLowerCase();
  const zone = value.indexOf("%");
  if (zone >= 0) value = value.slice(0, zone);

  const lastColon = value.lastIndexOf(":");
  const tail = value.slice(lastColon + 1);
  if (net.isIP(tail) === 4) {
    const v4 = parseIpv4(tail);
    if (!v4) return null;
    value = `${value.slice(0, lastColon + 1)}${((v4[0] << 8) | v4[1]).toString(16)}:${((v4[2] << 8) | v4[3]).toString(16)}`;
  }

  const halves = value.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tailParts = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tailParts.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const parts = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...tailParts];
  if (parts.length !== 8) return null;

  const bytes: number[] = [];
  for (const part of parts) {
    if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
    const valuePart = parseInt(part, 16);
    bytes.push((valuePart >> 8) & 0xff, valuePart & 0xff);
  }
  return bytes;
}

function isBlockedIpv6(bytes: number[]): boolean {
  const allZeroThrough = (end: number) => bytes.slice(0, end).every((byte) => byte === 0);
  const isMapped = allZeroThrough(10) && bytes[10] === 0xff && bytes[11] === 0xff;
  const isCompatible = allZeroThrough(12) && bytes.slice(12).some((byte) => byte !== 0);
  const isNat64 = bytes[0] === 0x00 && bytes[1] === 0x64 && bytes[2] === 0xff && bytes[3] === 0x9b && bytes.slice(4, 12).every((byte) => byte === 0);
  if (isMapped || isCompatible || isNat64) return true; // Transition addresses are not direct public destinations.
  if ((bytes[0] & 0xe0) !== 0x20) return true; // Only global-unicast 2000::/3.
  if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] <= 1) return true; // Special-purpose 2001::/23.

  if (allZeroThrough(16)) return true; // ::
  if (allZeroThrough(15) && bytes[15] === 1) return true; // ::1
  if ((bytes[0] & 0xfe) === 0xfc) return true; // fc00::/7 unique local
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true; // fe80::/10 link-local
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0xc0) return true; // fec0::/10 site-local
  if (bytes[0] === 0xff) return true; // multicast
  if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x0d && bytes[3] === 0xb8) return true; // 2001:db8::/32
  if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00) return true; // Teredo 2001::/32
  if (bytes[0] === 0x20 && bytes[1] === 0x02) return true; // 6to4 2002::/16
  return false;
}

/** True for loopback, private, link-local, CGNAT, documentation, multicast, and reserved addresses. */
export function isBlockedIp(address: string): boolean {
  const family = net.isIP(address);
  if (family === 4) {
    const octets = parseIpv4(address);
    return octets ? isBlockedIpv4(octets) : true;
  }
  if (family === 6) {
    const bytes = ipv6ToBytes(address);
    return bytes ? isBlockedIpv6(bytes) : true;
  }
  return true;
}

function bareHostname(url: URL): string {
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  return hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("DNS resolution timed out")), timeoutMs);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

/**
 * Validate a user-supplied webhook URL and return the pinned request target.
 * Fails closed: any DNS failure or any private/reserved address is rejected.
 */
export async function prepareWebhookUrl(
  raw: string,
  resolver: DnsResolver = defaultDnsResolver,
  timeoutMs: number = DEFAULT_DNS_TIMEOUT_MS,
): Promise<PreparedWebhookUrl> {
  if (typeof raw !== "string" || raw.length === 0) throw new WebhookValidationError("Webhook URL is required", "invalid_url");
  if (raw.length > 2048) throw new WebhookValidationError("Webhook URL is too long", "invalid_url");

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new WebhookValidationError("Webhook URL is invalid", "invalid_url");
  }
  if (url.protocol !== "https:") throw new WebhookValidationError("Webhook URLs must use https", "https_required");
  if (url.username || url.password) throw new WebhookValidationError("Webhook URLs must not contain embedded credentials", "credentials_not_allowed");

  if (url.hash) throw new WebhookValidationError("URL fragments are not allowed", "invalid_url");
  const hostname = bareHostname(url);
  if (!hostname) throw new WebhookValidationError("Webhook URL hostname is required", "invalid_url");
  if (BLOCKED_HOSTNAMES.has(hostname)) throw new WebhookValidationError("Webhook URL host is not allowed", "host_not_allowed");

  const literalFamily = net.isIP(hostname);
  let addresses: DnsLookupResult[];
  if (literalFamily) {
    addresses = [{ address: hostname, family: literalFamily }];
  } else {
    try {
      addresses = await withTimeout(resolver(hostname), timeoutMs);
    } catch {
      throw new WebhookValidationError("Webhook URL hostname could not be resolved", "dns_failed");
    }
  }
  if (!Array.isArray(addresses) || addresses.length === 0) throw new WebhookValidationError("Webhook URL hostname could not be resolved", "dns_failed");
  if (addresses.some((entry) => net.isIP(entry.address) !== entry.family || isBlockedIp(entry.address))) {
    throw new WebhookValidationError("Webhook URL resolves to a non-public address", "private_address");
  }

  const chosen = addresses[0];
  const pinned = new URL(url.href);
  const port = url.port ? `:${url.port}` : "";
  pinned.host = `${chosen.family === 6 ? `[${chosen.address}]` : chosen.address}${port}`;

  return {
    url,
    pinnedUrl: pinned.href,
    hostHeader: url.host,
    servername: literalFamily ? undefined : hostname,
  };
}

/** Slack/Discord URLs must point at the provider's own webhook host. */
export function assertProviderWebhookUrl(channel: "slack" | "discord", url: URL): void {
  if (channel === "slack") {
    if (url.hostname !== "hooks.slack.com" || !url.pathname.startsWith("/services/")) {
      throw new WebhookValidationError("Slack webhook URL must point to hooks.slack.com/services/...", "provider_url_invalid");
    }
    return;
  }
  const allowedHost = url.hostname === "discord.com" || url.hostname === "discordapp.com" || url.hostname.endsWith(".discord.com") || url.hostname.endsWith(".discordapp.com");
  if (!allowedHost || !url.pathname.startsWith("/api/webhooks/")) {
    throw new WebhookValidationError("Discord webhook URL must point to discord.com/api/webhooks/...", "provider_url_invalid");
  }
}

/**
 * Remove credential material from provider/transport errors before they reach
 * API responses, logs, or the notification log store.
 */
export function sanitizeWebhookError(message: string, secrets: Array<string | undefined> = []): string {
  let sanitized = typeof message === "string" ? message : "Notification failed";
  for (const secret of secrets) {
    if (typeof secret === "string" && secret.length >= 4) sanitized = sanitized.split(secret).join("[redacted]");
  }
  sanitized = sanitized
    .replace(/bot\d+:[A-Za-z0-9_-]+/gi, "bot[redacted]")
    .replace(/https?:\/\/hooks\.slack\.com\/services\/\S+/gi, "[redacted-url]")
    .replace(/https?:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\S+/gi, "[redacted-url]")
    .replace(/(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 [redacted]")
    .replace(/([?&](?:token|key|secret|sig|signature|auth)=)[^&\s]+/gi, "$1[redacted]");
  return sanitized.slice(0, 300);
}
