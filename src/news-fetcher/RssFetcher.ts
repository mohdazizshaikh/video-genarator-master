import Parser from "rss-parser";
import path from "path";
import { CustomNewsSourceStore, type CustomNewsSourceRecord } from "../db/CustomNewsSourceStore";

export interface NewsSourceDefinition {
  id: string;
  name: string;
  url: string;
  category: string;
  subCategory?: string;
  custom?: boolean;
}

export const NEWS_SOURCES: NewsSourceDefinition[] = [
  { id: "bbc", name: "BBC News", url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "World", subCategory: "General" },
  { id: "cnn", name: "CNN International", url: "http://rss.cnn.com/rss/edition_world.rss", category: "World", subCategory: "General" },
  { id: "reuters", name: "Reuters World", url: "https://www.reuters.com/arc/outboundfeeds/v1/article?size=10&content=world", category: "World", subCategory: "Politics" },
  { id: "aljazeera", name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", category: "World", subCategory: "Politics" },
  { id: "googlenews", name: "Google News (World)", url: "https://news.google.com/rss", category: "World", subCategory: "General" },
  { id: "bbc_gen", name: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml", category: "General" },
  { id: "reuters_gen", name: "Reuters", url: "https://www.reuters.com/arc/outboundfeeds/v1/article?size=10", category: "General" },
  { id: "espncricinfo", name: "ESPNcricinfo", url: "https://www.espncricinfo.com/rss/content/story/feeds/0.xml", category: "Cricket" },
  { id: "icc", name: "ICC News", url: "https://www.icc-cricket.com/rss/news", category: "Cricket" },
  { id: "nba", name: "NBA.com", url: "https://www.nba.com/rss/nba_rss.xml", category: "NBA" },
  { id: "espn_nba", name: "ESPN NBA", url: "https://www.espn.com/espn/rss/nba/news", category: "NBA" },
  { id: "theverge", name: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: "Technology", subCategory: "Gadgets" },
  { id: "techcrunch", name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "Technology", subCategory: "Startups" },
  { id: "wired", name: "Wired", url: "https://www.wired.com/feed/rss", category: "Technology", subCategory: "Reviews" },
  { id: "engadget", name: "Engadget", url: "https://www.engadget.com/rss.xml", category: "Technology", subCategory: "Gadgets" },
  { id: "ft", name: "Financial Times", url: "https://www.ft.com/?format=rss", category: "Business", subCategory: "Finance" },
  { id: "forbes", name: "Forbes", url: "https://www.forbes.com/real-time/feed2/", category: "Business", subCategory: "Wealth" },
  { id: "bloomberg", name: "Bloomberg", url: "https://www.bloomberg.com/feeds/bview/rss", category: "Business", subCategory: "Markets" },
  { id: "espn", name: "ESPN General", url: "https://www.espn.com/espn/rss/news", category: "Sports", subCategory: "All Sports" },
  { id: "bbcsport", name: "BBC Sport", url: "http://feeds.bbci.co.uk/sport/rss.xml", category: "Sports", subCategory: "International" },
  { id: "nasa", name: "NASA News", url: "https://www.nasa.gov/rss/dyn/breaking_news.rss", category: "Science", subCategory: "Space" },
  { id: "sciencedaily", name: "ScienceDaily", url: "https://www.sciencedaily.com/rss/all.xml", category: "Science", subCategory: "General" },
  { id: "physorg", name: "Phys.org", url: "https://phys.org/rss-feed/", category: "Science", subCategory: "Physics" },
];

export interface NewsStory {
  title: string;
  content: string;
  link: string;
  pubDate: string;
  sourceId?: string;
  sourceName?: string;
  sourceWeight?: number;
}

const sourceTrustScores: Record<string, number> = {
  bbc: 10,
  bbc_gen: 10,
  reuters: 10,
  reuters_gen: 10,
  cnn: 8,
  aljazeera: 8,
  googlenews: 6,
  ft: 9,
  bloomberg: 9,
  forbes: 7,
  theverge: 8,
  techcrunch: 8,
  wired: 8,
  engadget: 7,
  espncricinfo: 10,
  icc: 8,
  nba: 8,
  espn_nba: 8,
  espn: 8,
  bbcsport: 9,
  nasa: 10,
  sciencedaily: 8,
  physorg: 8,
};

const categorySourceLimits: Record<string, number> = {
  World: 4,
  General: 4,
  Business: 4,
  Technology: 4,
  Science: 4,
  Sports: 4,
  Cricket: 3,
  NBA: 3,
};

const fingerprintStopWords = new Set([
  "the", "a", "an", "and", "or", "for", "to", "of", "in", "on", "at", "with",
  "from", "after", "before", "over", "under", "amid", "into", "as", "by",
]);

export class RssFetcher {
  private parser: Parser;
  private customSourceStore: CustomNewsSourceStore;

  constructor(
    basePath: string = process.env.DATA_DIR_PATH || path.join(process.cwd(), "data"),
    private tenantId?: string,
  ) {
    this.parser = new Parser();
    this.customSourceStore = new CustomNewsSourceStore(basePath);
  }

  public listSourcesSync(): NewsSourceDefinition[] {
    const customSources = this.customSourceStore.listSync(this.tenantId).map((source) => this.mapCustomSource(source));
    return [...NEWS_SOURCES, ...customSources]
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }

  private mapCustomSource(source: CustomNewsSourceRecord): NewsSourceDefinition {
    return {
      id: source.id,
      name: source.name,
      url: source.url,
      category: source.category,
      subCategory: source.subCategory,
      custom: true,
    };
  }

  private findSource(sourceId: string): NewsSourceDefinition | undefined {
    return this.listSourcesSync().find((source) => source.id === sourceId);
  }

  public async validateFeedUrl(feedUrl: string): Promise<{ ok: true; itemCount: number } | { ok: false; reason: string }> {
    try {
      const feed = await this.parser.parseURL(feedUrl);
      const itemCount = feed.items?.filter((item) => (item.title || item.contentSnippet || item.content || "").trim()).length || 0;
      if (itemCount === 0) {
        return { ok: false, reason: "Feed is reachable but contains no usable items" };
      }
      return { ok: true, itemCount };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown feed parsing error";
      return { ok: false, reason: message };
    }
  }

  private getSourceTrustScore(source: NewsSourceDefinition): number {
    if (source.custom) {
      return 5;
    }
    return sourceTrustScores[source.id] || 6;
  }

  private selectSourcesForAggregation(sourceIds: string[]): NewsSourceDefinition[] {
    const uniqueSourceIds = Array.from(new Set(sourceIds.filter(Boolean)));
    const availableSources = uniqueSourceIds
      .map((sourceId) => this.findSource(sourceId))
      .filter((source): source is NewsSourceDefinition => Boolean(source));

    if (availableSources.length <= 1) {
      return availableSources;
    }

    const categoryCounts = new Map<string, number>();
    for (const source of availableSources) {
      categoryCounts.set(source.category, (categoryCounts.get(source.category) || 0) + 1);
    }

    const dominantCategory = Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    const maxSources = categorySourceLimits[dominantCategory || ""] || 4;
    return availableSources
      .sort((a, b) => {
        const categoryBoostA = a.category === dominantCategory ? 2 : 0;
        const categoryBoostB = b.category === dominantCategory ? 2 : 0;
        const scoreA = this.getSourceTrustScore(a) + categoryBoostA;
        const scoreB = this.getSourceTrustScore(b) + categoryBoostB;
        return scoreB - scoreA || a.name.localeCompare(b.name);
      })
      .slice(0, maxSources);
  }

  private buildStoryFingerprint(story: NewsStory): string {
    const title = (story.title || "").toLowerCase().replace(/[^\w\s]/g, " ");
    const tokens = title
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 2 && !fingerprintStopWords.has(token))
      .slice(0, 10);
    return tokens.join(" ");
  }

  private calculateFreshnessScore(pubDate: string): number {
    const publishedAt = Date.parse(pubDate || "");
    if (!publishedAt) {
      return 5;
    }
    const hoursOld = Math.max(0, (Date.now() - publishedAt) / (1000 * 60 * 60));
    if (hoursOld <= 6) {
      return 60;
    }
    if (hoursOld <= 24) {
      return 45;
    }
    if (hoursOld <= 48) {
      return 30;
    }
    if (hoursOld <= 96) {
      return 15;
    }
    return 5;
  }

  async fetchStories(sourceId: string): Promise<NewsStory[]> {
    const source = this.findSource(sourceId);
    if (!source) {
      throw new Error(`Source ${sourceId} not found`);
    }

    try {
      console.log(`[RssFetcher] Parsing feed URL: ${source.url}`);
      const feed = await this.parser.parseURL(source.url);
      console.log(`[RssFetcher] Fetched ${feed.items?.length || 0} stories from ${source.id}`);
      const stories = (feed.items || []).slice(0, 5).map((item) => ({
        title: item.title || "",
        content: item.contentSnippet || item.content || "",
        link: item.link || "",
        pubDate: item.pubDate || "",
        sourceId: source.id,
        sourceName: source.name,
        sourceWeight: this.getSourceTrustScore(source),
      })).filter((story) => (story.title || story.content).trim().length > 0);

      if (stories.length === 0) {
        throw new Error(`Source ${source.id} returned no usable stories`);
      }

      return stories;
    } catch (error) {
      console.error(`[RssFetcher] Error fetching from ${source.id}:`, error);
      throw error;
    }
  }

  async fetchStoriesFromSources(sourceIds: string[]): Promise<NewsStory[]> {
    const selectedSources = this.selectSourcesForAggregation(sourceIds);
    if (selectedSources.length === 0) {
      return [];
    }

    const settled = await Promise.allSettled(
      selectedSources.map((source) => this.fetchStories(source.id)),
    );

    const mergedStories = settled.flatMap((result) => (
      result.status === "fulfilled" ? result.value : []
    ));

    const deduped = Array.from(new Map(
      mergedStories.map((story) => {
        const key = (story.link || story.title).trim().toLowerCase();
        return [key, story];
      }),
    ).values());

    const fingerprintCoverage = new Map<string, number>();
    for (const story of deduped) {
      const fingerprint = this.buildStoryFingerprint(story);
      if (!fingerprint) {
        continue;
      }
      fingerprintCoverage.set(fingerprint, (fingerprintCoverage.get(fingerprint) || 0) + 1);
    }

    return deduped
      .sort((a, b) => {
        const aFingerprint = this.buildStoryFingerprint(a);
        const bFingerprint = this.buildStoryFingerprint(b);
        const aCoverage = fingerprintCoverage.get(aFingerprint) || 1;
        const bCoverage = fingerprintCoverage.get(bFingerprint) || 1;
        const aScore = this.calculateFreshnessScore(a.pubDate) + ((a.sourceWeight || 5) * 10) + (aCoverage * 20);
        const bScore = this.calculateFreshnessScore(b.pubDate) + ((b.sourceWeight || 5) * 10) + (bCoverage * 20);
        return bScore - aScore;
      })
      .slice(0, 12);
  }
}
