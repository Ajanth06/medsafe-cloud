import {
  OIL_RSS_FEEDS,
  classifyFlashTopic,
  isAlJazeeraRelevantText,
  topicEntity,
  type OilRssFeed,
} from "@/lib/market-intelligence/config/oil-rss-feeds";
import {
  dedupeFlashItems,
  isFlashCandidate,
  isNoiseFlashText,
  scoreFlashItem,
  sortFlashByTopicThenTime,
} from "@/lib/market-intelligence/services/flash-relevance";
import { applyCachedTranslationsAndPrefetch } from "@/lib/market-intelligence/services/news-translate";
import { normalizeNewsItem } from "@/lib/market-intelligence/services/news-normalizer";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import type { NewsProvider } from "@/lib/market-intelligence/providers/news/news-provider-types";
import type {
  NewsSearchAroundTimestampParams,
  NewsSearchParams,
} from "@/lib/market-intelligence/services/news-provider";
import type { NormalizedNewsItem, NewsProviderHealthInfo } from "@/lib/types/market";

const seenIds = new Set<string>();
let feedCache: { at: number; items: NormalizedNewsItem[] } | null = null;
/** Longer cache = fewer RSS storms; Flash poll is ~60–90s anyway. */
const CACHE_TTL_MS = 90_000;
const FEED_TIMEOUT_MS = 4_000;

function feedWeightForItem(item: NormalizedNewsItem): number {
  const feed = OIL_RSS_FEEDS.find(
    (f) => f.name === item.sourceName || f.name === item.source,
  );
  return feed?.weight ?? 70;
}

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

  async getBreakingNews(limit = 30): Promise<NormalizedNewsItem[]> {
    const items = await this.fetchAll(100);

    const ranked = items
      .filter((item) => isFlashCandidate(item))
      .map((item) => {
        const isNew = !seenIds.has(item.id);
        const scored = scoreFlashItem({
          item,
          isNew,
          feedWeight: feedWeightForItem(item),
        });
        return {
          item,
          ...scored,
          isNew,
          publishedAt: item.publishedAt,
        };
      });

    for (const r of ranked) {
      seenIds.add(r.item.id);
    }
    if (seenIds.size > 2_000) {
      const keep = [...seenIds].slice(-1_000);
      seenIds.clear();
      for (const id of keep) seenIds.add(id);
    }

    // Keep topic diversity but don't starve the feed (up to 8 per topic)
    const picked: typeof ranked = [];
    const perTopic = new Map<string, number>();
    const byScore = [...ranked].sort((a, b) => b.score - a.score);
    for (const r of byScore) {
      const count = perTopic.get(r.topic) ?? 0;
      if (count >= 8) continue;
      perTopic.set(r.topic, count + 1);
      picked.push(r);
      if (picked.length >= limit) break;
    }
    if (picked.length < limit) {
      const pickedIds = new Set(picked.map((p) => p.item.id));
      for (const r of byScore) {
        if (pickedIds.has(r.item.id)) continue;
        picked.push(r);
        if (picked.length >= limit) break;
      }
    }

    // Final order: topic groups (Iran, Öl, OPEC…) then newest — like the tabs
    const ordered = sortFlashByTopicThenTime(picked);

    // Cache-only translations (instant). Missing DE fills in background for next poll.
    const toTranslate = ordered
      .filter((r) => {
        const src = `${r.item.source} ${r.item.sourceName ?? ""}`.toLowerCase();
        return (
          r.item.language === "en" ||
          src.includes("al jazeera") ||
          src.includes("reuters")
        );
      })
      .slice(0, 16)
      .map((r) => ({
        id: r.item.id,
        title: r.item.title,
        summary: r.item.summary,
        language: r.item.language,
      }));

    const translations = applyCachedTranslationsAndPrefetch(toTranslate);

    return ordered.map((r) => {
      const tr = translations.get(r.item.id);
      const title = tr?.translated ? tr.title : r.item.title;
      const summary = tr?.translated ? tr.summary : r.item.summary;
      const src = `${r.item.source} ${r.item.sourceName ?? ""}`.toLowerCase();
      const isReuters = src.includes("reuters");
      const isAj = src.includes("al jazeera");
      return {
        ...r.item,
        title,
        summary,
        language: tr?.translated ? "de" : r.item.language,
        categories: r.hot || r.fresh ? (["GEOPOLITICAL"] as const) : r.item.categories,
        entities: [
          ...(r.item.entities ?? []).filter((e) => !e.startsWith("TOPIC_")),
          topicEntity(r.topic),
          "FLASH",
          ...(r.hot ? ["HOT"] : []),
          ...(tr?.translated ? ["TRANSLATED"] : []),
          ...(isAj ? ["ALJAZEERA"] : []),
          ...(isReuters ? ["REUTERS"] : []),
        ],
      };
    });
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
          const limit =
            feed.id === "aljazeera" || feed.id.startsWith("reuters")
              ? 40
              : 20;
          return await fetchFeed(feed, limit);
        } catch (error) {
          marketLogger.warn("Oil RSS feed failed", {
            feed: feed.id,
            error: error instanceof Error ? error.message : String(error),
          });
          return [] as NormalizedNewsItem[];
        }
      }),
    );

    const merged = dedupeFlashItems(
      results
        .flat()
        .filter((item) => {
          const text = `${item.title} ${item.summary}`;
          return (
            isFlashCandidate(item) ||
            (item.isOfficialSource && !isNoiseFlashText(text))
          );
        }),
    ).sort((a, b) => {
      const langBoost =
        (a.language === "de" ? 1 : 0) - (b.language === "de" ? 1 : 0);
      if (langBoost !== 0) return -langBoost;
      return (
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    });

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
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
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

    const summary = stripHtml(description).slice(0, 280);
    const text = `${title} ${summary}`;
    if (feed.id === "aljazeera" && !isAlJazeeraRelevantText(text)) {
      continue;
    }
    const cleanTitle = title
      .replace(/\s*-\s*Reuters\s*$/i, "")
      .replace(/\s*\|\s*Reuters\s*$/i, "")
      .slice(0, 220);
    const topic = classifyFlashTopic(`${cleanTitle} ${summary}`);
    items.push(
      normalizeNewsItem(
        {
          id: `oil-rss-${hashId(`${feed.id}:${url ?? cleanTitle}`)}`,
          title: cleanTitle,
          summary,
          source: feed.name,
          sourceName: feed.name,
          sourceDomain: url ? safeHostname(url) : undefined,
          publishedAt,
          url: url ?? undefined,
          categories: ["GEOPOLITICAL"],
          isOfficialSource: feed.sourceType.startsWith("OFFICIAL"),
          sourceType: feed.sourceType,
          dataAvailability: "LIVE",
          language: feed.language,
          entities: [topicEntity(topic)],
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
      const summary = stripHtml(description).slice(0, 280);
      const topic = classifyFlashTopic(`${title} ${summary}`);
      items.push(
        normalizeNewsItem(
          {
            id: `oil-rss-${hashId(`${feed.id}:${url ?? title}`)}`,
            title: title.slice(0, 220),
            summary,
            source: feed.name,
            sourceName: feed.name,
            publishedAt: pubDate
              ? new Date(pubDate).toISOString()
              : new Date().toISOString(),
            url: url ?? undefined,
            categories: ["GEOPOLITICAL"],
            isOfficialSource: feed.sourceType.startsWith("OFFICIAL"),
            sourceType: feed.sourceType,
            dataAvailability: "LIVE",
            language: feed.language,
            entities: [topicEntity(topic)],
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
