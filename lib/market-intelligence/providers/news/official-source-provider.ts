import { OFFICIAL_SOURCES } from "@/lib/market-intelligence/config/news-sources";
import { normalizeNewsItem } from "@/lib/market-intelligence/services/news-normalizer";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import type { OfficialSourceProvider } from "@/lib/market-intelligence/providers/news/news-provider-types";
import type { NormalizedNewsItem, NewsProviderHealthInfo } from "@/lib/types/market";

/**
 * Official source provider — uses public RSS feeds where available.
 * Falls back gracefully when feeds are unavailable.
 */
export class OfficialSourceProviderImpl implements OfficialSourceProvider {
  readonly id = "official-sources";
  readonly name = "Official Source Monitor";

  async fetchLatest(limit = 20): Promise<NormalizedNewsItem[]> {
    const enabled = OFFICIAL_SOURCES.filter((s) => s.enabled && s.rssUrl);
    const results: NormalizedNewsItem[] = [];

    for (const source of enabled.slice(0, 5)) {
      try {
        const items = await this.fetchRss(source.rssUrl!, source.name, source.sourceType, limit);
        results.push(...items);
      } catch (error) {
        marketLogger.warn("Official RSS fetch failed", {
          source: source.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, limit);
  }

  async searchByKeywords(keywords: string[]): Promise<NormalizedNewsItem[]> {
    const latest = await this.fetchLatest(50);
    const lower = keywords.map((k) => k.toLowerCase());
    return latest.filter((item) => {
      const text = `${item.title} ${item.summary}`.toLowerCase();
      return lower.some((k) => text.includes(k));
    });
  }

  async getProviderHealth(): Promise<NewsProviderHealthInfo> {
    const enabled = OFFICIAL_SOURCES.filter((s) => s.enabled);
    return {
      providerId: this.id,
      status: enabled.length > 0 ? "ONLINE" : "OFFLINE",
      lastUpdate: new Date().toISOString(),
    };
  }

  private async fetchRss(
    url: string,
    sourceName: string,
    sourceType: NormalizedNewsItem["sourceType"],
    limit: number,
  ): Promise<NormalizedNewsItem[]> {
    const response = await fetch(url, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      throw new Error(`RSS HTTP ${response.status}`);
    }

    const xml = await response.text();
    return parseSimpleRss(xml, sourceName, sourceType, limit);
  }
}

/** Minimal RSS parser — no external dependency */
function parseSimpleRss(
  xml: string,
  sourceName: string,
  sourceType: NormalizedNewsItem["sourceType"],
  limit: number,
): NormalizedNewsItem[] {
  const items: NormalizedNewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
    const block = match[1];
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate");
    const description = extractTag(block, "description");

    if (!title) continue;

    items.push(
      normalizeNewsItem(
        {
          id: `official-${sourceName}-${link ?? title}`.replace(/\s+/g, "-").slice(0, 80),
          title,
          summary: stripHtml(description ?? "").slice(0, 280),
          source: sourceName,
          publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          url: link,
          categories: ["REGULATORY"],
          isOfficialSource: true,
          sourceType,
          dataAvailability: "LIVE",
        },
        "official-sources",
      ),
    );
  }

  return items;
}

function extractTag(block: string, tag: string): string | undefined {
  const match = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return (match?.[1] ?? match?.[2])?.trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#x0*a0;/gi, " ")
    .replace(/&#0*160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
