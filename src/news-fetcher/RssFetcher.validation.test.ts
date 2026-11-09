import nock from "nock";
import { fetchPublicFeed } from "../services/PublicFeedTransport";
import { afterEach, describe, expect, test } from "vitest";

import { RssFetcher } from "./RssFetcher";

afterEach(() => {
  nock.cleanAll();
});

describe("RssFetcher feed validation", () => {
  test("accepts a valid feed with usable items", async () => {
    nock("https://8.8.8.8")
      .get("/rss.xml")
      .reply(200, `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Example Feed</title>
            <item>
              <title>Valid story</title>
              <description>Story body</description>
              <link>https://example.com/story</link>
              <pubDate>Sat, 28 Mar 2026 04:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>`);

    const fetcher = new RssFetcher(undefined, undefined, (url) => fetchPublicFeed(url, async () => [{ address: "8.8.8.8", family: 4 }]));
    const result = await fetcher.validateFeedUrl("https://example.com/rss.xml");

    expect(result).toEqual({ ok: true, itemCount: 1 });
  });

  test("rejects an empty feed", async () => {
    nock("https://8.8.8.8")
      .get("/empty.xml")
      .reply(200, `<?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Empty Feed</title>
          </channel>
        </rss>`);

    const fetcher = new RssFetcher(undefined, undefined, (url) => fetchPublicFeed(url, async () => [{ address: "8.8.8.8", family: 4 }]));
    const result = await fetcher.validateFeedUrl("https://example.com/empty.xml");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("no usable items");
    }
  });
  test("rejects loopback and metadata feeds before connecting", async () => {
    for (const url of ["http://127.0.0.1/private", "https://169.254.169.254/latest", "https://[::1]/"]) {
      const result = await new RssFetcher().validateFeedUrl(url);
      expect(result.ok).toBe(false);
    }
  });
  test("rejects redirect to an internal address", async () => {
    nock("https://8.8.8.8").get("/redirect").reply(302, "", { Location: "http://127.0.0.1/private" });
    await expect(fetchPublicFeed("https://example.com/redirect", async () => [{ address: "8.8.8.8", family: 4 }])).rejects.toThrow();
  });

});
