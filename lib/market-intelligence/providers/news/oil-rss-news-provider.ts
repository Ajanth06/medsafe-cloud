import {
  OIL_RSS_FEEDS,
  classifyFlashTopic,
  isWorldFeedIranRelevantText,
  topicEntity,
  type OilRssFeed,
} from "@/lib/market-intelligence/config/oil-rss-feeds";
import {
  dedupeFlashItems,
  isFlashCandidate,
  isNoiseFlashText,
  scoreFlashItem,
  sortFlashByTopicThenTime,
  sortForFlashDedupe,
} from "@/lib/market-intelligence/services/flash-relevance";
import {
  ensureNewsTranslations,
  needsLocaleTranslation,
} from "@/lib/market-intelligence/services/news-translate";
import type { AppLocale } from "@/lib/i18n/locales";
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
/** Serve stale up to 10m while a background refresh runs. */
const STALE_MAX_MS = 10 * 60_000;
const FEED_TIMEOUT_MS = 1_600;
/** Cold start: feeds that actually ship photos + Iran wires. */
const FAST_FEED_IDS = new Set([
  "tagesschau-ausland",
  "bbc-middle-east",
  "aljazeera-iran-gn",
  "google-iran-en",
  "presstv-iran",
]);

const BROAD_FEED_IDS = new Set(["aljazeera", "bbc-middle-east"]);

let refreshInFlight: Promise<void> | null = null;

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

  async getBreakingNews(
    limit = 30,
    targetLocale: AppLocale = "de",
  ): Promise<NormalizedNewsItem[]> {
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

    // Keep topic + brand diversity (AJ / Iranian / Google must stay visible)
    const picked: typeof ranked = [];
    const perTopic = new Map<string, number>();
    const perSource = new Map<string, number>();
    const byScore = [...ranked].sort((a, b) => b.score - a.score);
    const pickedIds = new Set<string>();

    function sourceKey(item: NormalizedNewsItem): string {
      const s = `${item.sourceName ?? item.source}`.toLowerCase();
      if (s.includes("al jazeera")) return "aljazeera";
      if (/press tv|tehran times|\birna\b/.test(s)) return "iranian";
      if (s.includes("google news")) return "google";
      if (s.includes("bbc")) return "bbc";
      if (s.includes("reuters")) return "reuters";
      if (s.includes("cnn")) return "cnn";
      if (s.includes("ap ·") || s.includes("associated press")) return "ap";
      if (s.includes("nyt") || s.includes("new york times")) return "nyt";
      if (s.includes("tagesschau")) return "tagesschau";
      return s.slice(0, 24);
    }

    function tryPick(r: (typeof ranked)[number], maxPerSource = 5): boolean {
      if (pickedIds.has(r.item.id)) return false;
      const topicCap = r.topic === "iran" ? 14 : 8;
      const count = perTopic.get(r.topic) ?? 0;
      if (count >= topicCap) return false;
      const sk = sourceKey(r.item);
      const sc = perSource.get(sk) ?? 0;
      if (sc >= maxPerSource) return false;
      perTopic.set(r.topic, count + 1);
      perSource.set(sk, sc + 1);
      pickedIds.add(r.item.id);
      picked.push(r);
      return true;
    }

    // Reserve: photo sources first, then AJ / Iranian / Google text
    const brandMinimums: { brand: string; min: number }[] = [
      { brand: "tagesschau", min: 6 },
      { brand: "bbc", min: 4 },
      { brand: "aljazeera", min: 2 },
      { brand: "iranian", min: 2 },
      { brand: "google", min: 2 },
      { brand: "reuters", min: 2 },
    ];
    for (const { brand, min } of brandMinimums) {
      let n = 0;
      for (const r of byScore) {
        if (n >= min || picked.length >= limit) break;
        if (sourceKey(r.item) !== brand) continue;
        if (tryPick(r, 8)) n += 1;
      }
    }

    // Guarantee enough photo cards for the visual strip
    const photoTarget = Math.min(14, Math.floor(limit * 0.55));
    let photoCount = picked.filter((r) => r.item.imageUrl).length;
    if (photoCount < photoTarget) {
      for (const r of byScore) {
        if (picked.length >= limit || photoCount >= photoTarget) break;
        if (!r.item.imageUrl) continue;
        if (tryPick(r, 10)) photoCount += 1;
      }
    }

    for (const r of byScore) {
      if (picked.length >= limit) break;
      tryPick(r, 5);
    }
    if (picked.length < limit) {
      for (const r of byScore) {
        if (pickedIds.has(r.item.id)) continue;
        picked.push(r);
        pickedIds.add(r.item.id);
        if (picked.length >= limit) break;
      }
    }

    // Final order: topic groups (Iran, Öl, OPEC…) then newest — like the tabs
    const ordered = sortFlashByTopicThenTime(picked);

    // UI language: translate headlines into de / en / ta
    const toTranslate = ordered
      .filter((r) => needsLocaleTranslation(r.item, targetLocale))
      .map((r) => ({
        id: r.item.id,
        title: r.item.title,
        summary: r.item.summary,
        language: r.item.language,
      }));

    const translations = await ensureNewsTranslations(toTranslate, {
      maxAwaitMs: 4_800,
      maxItems: 20,
      target: targetLocale,
    });

    return ordered.map((r) => {
      const tr = translations.get(r.item.id);
      const translated = Boolean(tr?.translated);
      const title = translated && tr ? tr.title : r.item.title;
      const summary = translated && tr ? tr.summary : r.item.summary;
      const src = `${r.item.source} ${r.item.sourceName ?? ""}`.toLowerCase();
      const isReuters = src.includes("reuters");
      const isAj = src.includes("al jazeera");
      const isBbc = src.includes("bbc");
      const isIranian = /press tv|tehran times|\birna\b/.test(src);
      const isGoogle = src.includes("google news");
      const isUsWire =
        /\bcnn\b|\bap ·|associated press|nyt ·|new york times|google news us/.test(
          src,
        );
      return {
        ...r.item,
        title,
        summary,
        language: translated ? targetLocale : r.item.language,
        categories: r.hot || r.fresh ? (["GEOPOLITICAL"] as const) : r.item.categories,
        entities: [
          ...(r.item.entities ?? []).filter((e) => !e.startsWith("TOPIC_")),
          topicEntity(r.topic),
          "FLASH",
          ...(r.hot ? ["HOT"] : []),
          ...(translated ? ["TRANSLATED"] : []),
          ...(isAj ? ["ALJAZEERA"] : []),
          ...(isBbc ? ["BBC"] : []),
          ...(isIranian ? ["IRANIAN_MEDIA"] : []),
          ...(isGoogle ? ["GOOGLE_NEWS"] : []),
          ...(isUsWire ? ["US_MEDIA"] : []),
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
    const now = Date.now();
    if (feedCache) {
      const age = now - feedCache.at;
      if (age < CACHE_TTL_MS) {
        return feedCache.items.slice(0, limit);
      }
      // Stale-while-revalidate: paint instantly, refresh in background
      if (age < STALE_MAX_MS) {
        void this.refreshFeedsInBackground();
        return feedCache.items.slice(0, limit);
      }
    }

    // Cold start: never block >800ms on RSS — return what we have, finish in bg
    if (!refreshInFlight) {
      refreshInFlight = this.refreshFeeds({ fast: true }).finally(() => {
        refreshInFlight = null;
        // After fast snapshot, warm full feed set in background
        void this.refreshFeedsInBackground();
      });
    }
    await Promise.race([
      refreshInFlight,
      new Promise<void>((resolve) => {
        setTimeout(resolve, 800);
      }),
    ]);
    return (feedCache?.items ?? []).slice(0, limit);
  }

  private refreshFeedsInBackground(): void {
    if (refreshInFlight) return;
    refreshInFlight = this.refreshFeeds({ fast: false }).finally(() => {
      refreshInFlight = null;
    });
  }

  private async refreshFeeds(opts: { fast: boolean }): Promise<void> {
    const feeds = opts.fast
      ? OIL_RSS_FEEDS.filter((f) => FAST_FEED_IDS.has(f.id))
      : OIL_RSS_FEEDS;

    const results = await Promise.all(
      feeds.map(async (feed) => {
        try {
          const limit =
            feed.id === "aljazeera" ||
            feed.id === "bbc-middle-east" ||
            feed.id.startsWith("reuters") ||
            feed.id.includes("iran")
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

    const filtered = results.flat().filter((item) => {
      const text = `${item.title} ${item.summary}`;
      return (
        isFlashCandidate(item) ||
        (item.isOfficialSource && !isNoiseFlashText(text))
      );
    });
    // Weight-first so AJ / Iranian / Google win over DE duplicates
    const merged = dedupeFlashItems(
      sortForFlashDedupe(filtered, feedWeightForItem),
    );

    // Keep previous cache if refresh returned nothing (partial outage)
    if (merged.length > 0 || !feedCache) {
      feedCache = { at: Date.now(), items: merged };
    } else {
      feedCache = { ...feedCache, at: Date.now() };
    }
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
      extractTag(block, "description") ??
        extractTag(block, "summary") ??
        extractTag(block, "content:encoded") ??
        "",
    );

    if (!title) continue;

    const url = cleanUrl(link);
    const publishedAt = pubDate
      ? new Date(pubDate).toISOString()
      : new Date().toISOString();

    const summary = stripHtml(description).slice(0, 280);
    const text = `${title} ${summary}`;
    if (BROAD_FEED_IDS.has(feed.id) && !isWorldFeedIranRelevantText(text)) {
      continue;
    }
    const cleanTitle = decodeXml(title)
      .replace(/\s*-\s*Reuters\s*$/i, "")
      .replace(/\s*\|\s*Reuters\s*$/i, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);
    const topic = classifyFlashTopic(`${cleanTitle} ${summary}`);
    const imageUrl = extractRssImage(block, description);
    // Google News RSS often embeds the original publisher in <source>
    const googlePublisher = extractGooglePublisher(block);
    const displaySource =
      feed.id.startsWith("google-") && googlePublisher
        ? `${googlePublisher} · Google`
        : feed.name;
    items.push(
      normalizeNewsItem(
        {
          id: `oil-rss-${hashId(`${feed.id}:${url ?? cleanTitle}`)}`,
          title: cleanTitle,
          summary,
          source: displaySource,
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
          imageUrl: imageUrl ?? undefined,
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
      const imageUrl = extractRssImage(block, description);
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
            imageUrl: imageUrl ?? undefined,
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

/** Google News RSS: <source url="...">Publisher Name</source> */
function extractGooglePublisher(block: string): string | undefined {
  const raw = extractTag(block, "source");
  if (!raw) return undefined;
  const name = decodeXml(raw).replace(/\s+/g, " ").trim();
  if (!name || /google/i.test(name)) return undefined;
  return name.slice(0, 48);
}

function extractHref(block: string): string | undefined {
  const match = block.match(/<link[^>]+href=["']([^"']+)["']/i);
  return match?.[1];
}

/** Pull lead image from media:/enclosure tags or <img> in description HTML. */
function extractRssImage(
  block: string,
  descriptionHtml: string,
): string | null {
  const candidates: string[] = [];

  const mediaMatches = block.matchAll(
    /<(?:media:content|media:thumbnail)[^>]*(?:url|href)=["']([^"']+)["'][^>]*>/gi,
  );
  for (const m of mediaMatches) {
    if (m[1] && isLikelyImageUrl(m[1])) candidates.push(m[1]);
  }

  const enclosure = block.match(
    /<enclosure[^>]+(?:type=["']image\/[^"']*["'][^>]+url=["']([^"']+)["']|url=["']([^"']+)["'][^>]+type=["']image\/[^"']*["'])/i,
  );
  const enclosureUrl = enclosure?.[1] ?? enclosure?.[2];
  if (enclosureUrl && isLikelyImageUrl(enclosureUrl)) {
    candidates.push(enclosureUrl);
  }

  const decoded = descriptionHtml
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
  const imgMatches = [
    ...decoded.matchAll(/<img[^>]+src=["']([^"']+)["']/gi),
    ...block.matchAll(/<img[^>]+src=["']([^"']+)["']/gi),
  ];
  for (const m of imgMatches) {
    if (m[1] && isLikelyImageUrl(m[1])) candidates.push(m[1]);
  }

  if (!candidates.length) return null;

  // Prefer largest-looking URLs (big/1920/1280 over thumb/small)
  const ranked = [...candidates].sort(
    (a, b) => imageQualityScore(b) - imageQualityScore(a),
  );
  return cleanImageUrl(ranked[0]);
}

function imageQualityScore(url: string): number {
  const u = url.toLowerCase();
  let score = 0;
  if (/16x9-big|1920|1280|1200|976|800/.test(u)) score += 50;
  if (/width=1[2-9]\d{2}|width=2\d{3}/.test(u)) score += 40;
  if (/media:content|\/image\//.test(u)) score += 10;
  if (/thumb|small|tiny|150|240|320|480/.test(u)) score -= 40;
  if (/logo|favicon/.test(u)) score -= 100;
  return score;
}

function isLikelyImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (!lower.startsWith("http")) return false;
  if (/logo|favicon|sprite|1x1|pixel|spacer|tracking/i.test(lower)) return false;
  return (
    /\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(lower) ||
    /\/image\//i.test(lower) ||
    /images\./i.test(lower) ||
    /ichef\.bbci\.co\.uk/i.test(lower) ||
    /mediadata|cdn\.|img\.|static\.|photo/i.test(lower)
  );
}

/** Prefer sharp, large lead images (Tagesschau, BBC, etc.). */
function cleanImageUrl(raw: string): string {
  let url = decodeXml(raw).replace(/&amp;/g, "&").trim();
  if (!url) return url;

  // Tagesschau size folders
  url = url.replace(
    /\/(16x9|4x3)-(?:small|medium|tiny|S|M)\//gi,
    "/$1-big/",
  );

  // BBC ichef: bump width token in place (news/240 → news/976, ace/standard/320 → …/976)
  url = url.replace(
    /(ichef\.bbci\.co\.uk\/(?:news|ace\/(?:standard|ws))\/)(\d{2,4})\//gi,
    (_m, prefix: string, size: string) => {
      const n = Number.parseInt(size, 10);
      const better = !Number.isFinite(n) || n < 800 ? 976 : n;
      return `${prefix}${better}/`;
    },
  );

  try {
    const parsed = new URL(url);
    if (/images\.tagesschau\.de$/i.test(parsed.hostname)) {
      parsed.searchParams.set("width", "960");
      return parsed.toString();
    }
    if (/ichef\.bbci\.co\.uk$/i.test(parsed.hostname)) {
      // Drop tiny quality params if present
      parsed.searchParams.delete("quality");
      return parsed.toString();
    }
  } catch {
    /* keep original */
  }

  return url;
}

function stripHtml(html: string): string {
  return decodeXml(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** Decode HTML/XML entities that leak from RSS (e.g. &nbsp; → space). */
function decodeXml(text: string): string {
  let out = text;
  // Double-encoded entities first (&amp;nbsp; → &nbsp;)
  for (let i = 0; i < 2; i++) {
    out = out
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#x0*a0;/gi, " ")
      .replace(/&#0*160;/g, " ")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
        const code = Number.parseInt(hex, 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : "";
      })
      .replace(/&#(\d+);/g, (_, dec: string) => {
        const code = Number.parseInt(dec, 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : "";
      });
  }
  return out.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
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
