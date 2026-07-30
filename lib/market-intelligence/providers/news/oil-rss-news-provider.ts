import {
  OIL_RSS_FEEDS,
  isFlashHotText,
  isOilRelevantText,
  type OilRssFeed,
} from "@/lib/market-intelligence/config/oil-rss-feeds";
import { normalizeNewsItem } from "@/lib/market-intelligence/services/news-normalizer";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import type { NewsProvider } from "@/lib/market-intelligence/providers/news/news-provider-types";
import type {
  NewsSearchAroundTimestampParams,
  NewsSearchParams,
} from "@/lib/market-intelligence/services/news-provider";
import type { NormalizedNewsItem, NewsProviderHealthInfo } from "@/lib/types/market";

const seenIds = new Set<string>();
const FLASH_WINDOW_MS = 45 * 60_000;
let feedCache: { at: number; items: NormalizedNewsItem[] } | null = null;
const CACHE_TTL_MS = 30_000;

/**
 * Free multi-source oil news via public RSS.
 * Only title / summary / link — no paid NewsAPI required.
 */
export class OilRssNewsProvider implements NewsProvider {
  readonly id = "oil-rss";
  readonly name = "Oil RSS (Free)";

  async searchLatest(params?: NewsSearchParams): Promise<NormalizedNewsItem[]> {
    const items = await this.fetchAll(params?.limit ?? 40);
    if (!params?.keywords?.length) return items;
    return filterByKeywords(items, params.keywords);
  }

  async searchByKeywords(
    keywords: string[],
    params?: NewsSearchParams,
  ): Promise<NormalizedNewsItem[]> {
    return this.searchLatest({ ...params, keywords });
  }

  async searchAroundTimestamp(
    params: NewsSearchAroundTimestampParams,
  ): Promise<NormalizedNewsItem[]> {
    const items = await this.searchLatest({
      keywords: params.keywords,
      limit: params.limit ?? 40,
    });
    const center = new Date(params.timestamp).getTime();
    const before = (params.beforeMinutes ?? 60) * 60_000;
    const after = (params.afterMinutes ?? 30) * 60_000;
    return items.filter((item) => {
      const t = new Date(item.publishedAt).getTime();
      return t >= center - before && t <= center + after;
    });
  }

  async getBreakingNews(limit = 12): Promise<NormalizedNewsItem[]> {
    const items = await this.fetchAll(60);
    const now = Date.now();

    const ranked = items
      .map((item) => {
        const age = now - new Date(item.publishedAt).getTime();
        const isNew = !seenIds.has(item.id);
        const hot = isFlashHotText(`${item.title} ${item.summary}`);
        const fresh = age >= 0 && age <= FLASH_WINDOW_MS;
        let score = 0;
        if (isNew) score += 40;
        if (hot) score += 35;
        if (fresh) score += 25;
        if (item.isOfficialSource) score += 15;
        if (age < 15 * 60_000) score += 20;
        return { item, score, isNew, hot, fresh };
      })
      .filter((r) => r.fresh || r.isNew || r.hot)
      .sort((a, b) => b.score - a.score);

    for (const r of ranked) {
      seenIds.add(r.item.id);
    }
    // Cap memory
    if (seenIds.size > 2_000) {
      const keep = [...seenIds].slice(-1_000);
      seenIds.clear();
      for (const id of keep) seenIds.add(id);
    }

    return ranked.slice(0, limit).map((r) => ({
      ...r.item,
      // Mark flash via category + entities for downstream UI
      categories: r.hot || r.isNew ? (["GEOPOLITICAL"] as const) : r.item.categories,
      entities: [
        ...(r.item.entities ?? []),
        ...(r.isNew || r.hot ? ["FLASH"] : []),
        ...(r.hot ? ["HOT"] : []),
      ],
    }));
  }

  async getProviderHealth(): Promise<NewsProviderHealthInfo> {
    try {
      const items = await this.fetchAll(5);
      return {
        providerId: this.id,
        status: items.length > 0 ? "ONLINE" : "DEGRADED",
        lastUpdate: new Date().toISOString(),
        error: items.length === 0 ? "No RSS items returned" : undefined,
      };
    } catch (error) {
      return {
        providerId: this.id,
        status: "OFFLINE",
        lastUpdate: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async fetchAll(limit: number): Promise<NormalizedNewsItem[]> {
    if (feedCache && Date.now() - feedCache.at < CACHE_TTL_MS) {
      return feedCache.items.slice(0, limit);
    }

    const results = await Promise.all(
      OIL_RSS_FEEDS.map(async (feed) => {
        try {
          return await fetchFeed(feed, 15);
        } catch (error) {
          marketLogger.warn("Oil RSS feed failed", {
            feed: feed.id,
            error: error instanceof Error ? error.message : String(error),
          });
          return [] as NormalizedNewsItem[];
        }
      }),
    );

    const merged = dedupeByUrlOrTitle(results.flat())
      .filter((item) => isOilRelevantText(`${item.title} ${item.summary}`))
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      );

    feedCache = { at: Date.now(), items: merged };
    return merged.slice(0, limit);
  }
}

async function fetchFeed(
  feed: OilRssFeed,
  limit: number,
): Promise<NormalizedNewsItem[]> {
  const response = await fetch(feed.url, {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml, */*",
      "User-Agent": "AARYX/1.0 (+https://aaryx.app; oil-intelligence)",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`RSS HTTP ${response.status}`);
  }

  const xml = await response.text();
  return parseRss(xml, feed, limit);
}

function parseRss(
  xml: string,
  feed: OilRssFeed,
  limit: number,
): NormalizedNewsItem[] {
  const items: NormalizedNewsItem[] = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null && items.length < limit) {
    const block = match[1];
    const title = decodeXml(extractTag(block, "title") ?? "");
    const link =
      extractTag(block, "link") ??
      extractTag(block, "guid") ??
      null;
    const pubDate = extractTag(block, "pubDate") ?? extractTag(block, "published");
    const description = decodeXml(
      extractTag(block, "description") ?? extractTag(block, "summary") ?? "",
    );

    if (!title) continue;

    const url = cleanUrl(link);
    const publishedAt = pubDate
      ? new Date(pubDate).toISOString()
      : new Date().toISOString();

    items.push(
      normalizeNewsItem(
        {
          id: `oil-rss-${hashId(`${feed.id}:${url ?? title}`)}`,
          title: title.slice(0, 220),
          summary: stripHtml(description).slice(0, 280),
          source: feed.name,
          sourceName: feed.name,
          sourceDomain: url ? safeHostname(url) : undefined,
          publishedAt,
          url: url ?? undefined,
          categories: ["GEOPOLITICAL"],
          isOfficialSource: feed.sourceType.startsWith("OFFICIAL"),
          sourceType: feed.sourceType,
          dataAvailability: "LIVE",
          language: feed.id.includes("de") ? "de" : "en",
        },
        "oil-rss",
      ),
    );
  }

  // Atom fallback
  if (items.length === 0) {
    const entryRegex = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) !== null && items.length < limit) {
      const block = match[1];
      const title = decodeXml(extractTag(block, "title") ?? "");
      const link =
        extractHref(block) ?? extractTag(block, "id") ?? extractTag(block, "link");
      const pubDate =
        extractTag(block, "updated") ?? extractTag(block, "published");
      const description = decodeXml(
        extractTag(block, "summary") ?? extractTag(block, "content") ?? "",
      );
      if (!title) continue;
      const url = cleanUrl(link);
      items.push(
        normalizeNewsItem(
          {
            id: `oil-rss-${hashId(`${feed.id}:${url ?? title}`)}`,
            title: title.slice(0, 220),
            summary: stripHtml(description).slice(0, 280),
            source: feed.name,
            publishedAt: pubDate
              ? new Date(pubDate).toISOString()
              : new Date().toISOString(),
            url: url ?? undefined,
            categories: ["GEOPOLITICAL"],
            isOfficialSource: feed.sourceType.startsWith("OFFICIAL"),
            sourceType: feed.sourceType,
            dataAvailability: "LIVE",
          },
          "oil-rss",
        ),
      );
    }
  }

  return items;
}

function filterByKeywords(
  items: NormalizedNewsItem[],
  keywords: string[],
): NormalizedNewsItem[] {
  const lower = keywords.map((k) => k.toLowerCase());
  return items.filter((item) => {
    const text = `${item.title} ${item.summary}`.toLowerCase();
    return lower.some((k) => text.includes(k));
  });
}

function dedupeByUrlOrTitle(items: NormalizedNewsItem[]): NormalizedNewsItem[] {
  const seen = new Set<string>();
  const out: NormalizedNewsItem[] = [];
  for (const item of items) {
    const key = (item.url ?? item.title).toLowerCase().slice(0, 160);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function extractTag(block: string, tag: string): string | undefined {
  const match = block.match(
    new RegExp(
      `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
      "i",
    ),
  );
  return (match?.[1] ?? match?.[2])?.trim();
}

function extractHref(block: string): string | undefined {
  const match = block.match(/<link[^>]+href=["']([^"']+)["']/i);
  return match?.[1];
}

function extractAttr(
  block: string,
  tag: string,
  attr: string,
): string | undefined {
  const match = block.match(
    new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["'][^>]*>`, "i"),
  );
  return match?.[1];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeXml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function cleanUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("http")) return trimmed;
  try {
    // Google News often wraps urls — keep as-is for click-through
    return trimmed;
  } catch {
    return trimmed;
  }
}

function safeHostname(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

function hashId(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}
