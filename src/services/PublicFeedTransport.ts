import http from "node:http";
import https from "node:https";
import { prepareWebhookUrl, type DnsResolver } from "./webhookSecurity";

/** RSS permits public HTTP feeds; validation uses the same public-IP policy as webhooks.
 * No redirects, proxies, decompression or secondary hostname lookup. */
export async function fetchPublicFeed(url: string, resolver?: DnsResolver): Promise<string> {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Feed URL must use HTTP or HTTPS");
  const secure = new URL(parsed.href);
  secure.protocol = "https:";
  // Changing protocol may normalize the default port, so restore explicit HTTP ports below.
  const target = await prepareWebhookUrl(secure.href, resolver);
  const pinned = new URL(target.pinnedUrl);
  pinned.protocol = parsed.protocol;
  pinned.port = parsed.port;
  return new Promise<string>((resolve, reject) => {
    const request = (parsed.protocol === "https:" ? https : http).request(pinned, {
      method: "GET", agent: false, servername: target.servername,
      headers: { Host: parsed.host, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml", "Accept-Encoding": "identity" },
    }, (response) => {
      const chunks: Buffer[] = [];
      let size = 0;
      response.on("error", reject);
      if (response.statusCode !== 200 || (response.headers["content-encoding"] && response.headers["content-encoding"] !== "identity")) {
        response.resume();
        request.destroy(new Error("Feed returned an unsupported response"));
        return;
      }
      response.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > 2 * 1024 * 1024) request.destroy(new Error("Feed exceeds size limit"));
        else chunks.push(Buffer.from(chunk));
      });
      response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
    const timer = setTimeout(() => request.destroy(new Error("Feed request timed out")), 10000);
    request.on("close", () => clearTimeout(timer));
    request.on("error", reject);
    request.end();
  });
}
