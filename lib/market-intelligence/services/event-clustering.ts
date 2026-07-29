import { deduplicateByTitle } from "@/lib/market-intelligence/services/duplicate-detection";
import {
  classifyGeopoliticalType,
  extractEntities,
  isOilRelevantEvent,
  toNewsEventType,
} from "@/lib/market-intelligence/services/news-normalizer";
import { verifyNewsCluster } from "@/lib/market-intelligence/services/verification-engine";
import type {
  GeopoliticalEventType,
  IntelligenceEventCluster,
  IntelligenceEventState,
  NewsDataAvailability,
  NewsSourceEntry,
  NormalizedNewsItem,
  SourceType,
} from "@/lib/types/market";

export function clusterNewsItems(
  items: NormalizedNewsItem[],
  dataAvailability: NewsDataAvailability = "LIVE",
): IntelligenceEventCluster[] {
  const deduped = deduplicateByTitle(items);
  const groups: NormalizedNewsItem[][] = [];
  const used = new Set<string>();

  for (const item of deduped) {
    if (used.has(item.id)) continue;
    const group = [item];
    used.add(item.id);

    for (const other of deduped) {
      if (used.has(other.id)) continue;
      const similarity = titleOverlap(item.title, other.title);
      const sameEvent =
        similarity >= 0.45 ||
        (item.geopoliticalType &&
          item.geopoliticalType === other.geopoliticalType &&
          similarity >= 0.25);
      if (sameEvent) {
        group.push(other);
        used.add(other.id);
      }
    }
    groups.push(group);
  }

  return groups.map((group) => buildCluster(group, dataAvailability));
}

function buildCluster(
  items: NormalizedNewsItem[],
  dataAvailability: NewsDataAvailability,
): IntelligenceEventCluster {
  const sorted = [...items].sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
  );
  const primary = sorted[0];
  const verification = verifyNewsCluster(sorted);
  const geoType = primary.geopoliticalType ?? classifyGeopoliticalType(primary.title, primary.summary);
  const entities = [...new Set(sorted.flatMap((i) => i.entities ?? extractEntities(`${i.title} ${i.summary}`)))];

  const sources: NewsSourceEntry[] = sorted.map((item, idx) => ({
    id: item.id,
    sourceName: item.sourceName ?? item.source,
    sourceType: (item.sourceType ?? "UNKNOWN") as SourceType,
    sourceDomain: item.sourceDomain,
    publishedAt: item.publishedAt,
    headline: item.title,
    url: item.url,
    isOfficial: item.isOfficialSource ?? false,
    sourceOrigin: item.sourceOrigin,
    syndicationGroup: item.syndicationGroup,
    role:
      item.isRetracted
        ? "RETRACTION"
        : idx === 0
          ? "FIRST_REPORT"
          : item.isOfficialSource
            ? "OFFICIAL_CONFIRMATION"
            : "INDEPENDENT_CONFIRMATION",
  }));

  const state: IntelligenceEventState =
    verification.status === "RETRACTED"
      ? "RETRACTED"
      : verification.status === "CONFLICTING"
        ? "CONFLICTING"
        : verification.status === "UNVERIFIED"
          ? "UNVERIFIED"
          : "DETECTED";

  return {
    id: `intel-${primary.id}`,
    eventType: geoType,
    newsEventType: toNewsEventType(geoType),
    headline: primary.title,
    summary: primary.summary,
    state,
    verification: {
      status: verification.status,
      sourceCount: verification.independentSourceCount,
      sources: verification.sources,
      lastVerifiedAt: verification.lastVerifiedAt,
      hasOfficialSource: verification.hasOfficialSource,
    },
    sources,
    independentSourceCount: verification.independentSourceCount,
    officialSourceCount: verification.officialSourceCount,
    firstReportAt: primary.publishedAt,
    latestUpdateAt: sorted[sorted.length - 1].publishedAt,
    affectedRegion: inferRegion(entities, primary.title),
    potentiallyAffectedMarkets: inferAffectedMarkets(geoType, entities),
    marketRelevance: buildMarketRelevance(geoType, entities),
    priority: "LOW",
    priorityScore: 0,
    causality: "UNKNOWN",
    timestamps: {
      firstSourcePublished: primary.publishedAt,
      aaryxReceived: primary.aaryxReceivedAt ?? new Date().toISOString(),
    },
    updates: [],
    watchMode: false,
    auditTrail: [],
    dataAvailability,
  };
}

function titleOverlap(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 3));
  const wordsB = new Set(b.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 3));
  const intersection = [...wordsA].filter((w) => wordsB.has(w));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size > 0 ? intersection.length / union.size : 0;
}

function inferRegion(entities: string[], title: string): string | undefined {
  const text = `${title} ${entities.join(" ")}`.toLowerCase();
  if (/middle east|iran|israel|saudi|hormuz|gulf/.test(text)) return "Middle East";
  if (/europe|ecb|ukraine/.test(text)) return "Europe";
  if (/us|united states|fed|treasury/.test(text)) return "United States";
  return undefined;
}

function inferAffectedMarkets(geoType: GeopoliticalEventType, entities: string[]): string[] {
  const markets = new Set<string>();
  if (isOilRelevantEvent(geoType) || entities.some((e) => /oil|brent|wti|opec|hormuz/i.test(e))) {
    markets.add("WTI");
    markets.add("BRENT");
    markets.add("GOLD");
  }
  if (geoType.includes("CENTRAL_BANK") || geoType.includes("INFLATION") || geoType.includes("GDP")) {
    markets.add("SPX");
    markets.add("NDX");
    markets.add("EURUSD");
    markets.add("GOLD");
  }
  if (/dax|europe|ecb/i.test(entities.join(" "))) markets.add("DAX");
  if (/crypto|bitcoin/i.test(entities.join(" "))) markets.add("BTC");
  return [...markets];
}

function buildMarketRelevance(
  geoType: GeopoliticalEventType,
  entities: string[],
): Record<string, "HIGH" | "MEDIUM" | "POSSIBLE"> {
  const relevance: Record<string, "HIGH" | "MEDIUM" | "POSSIBLE"> = {};
  const markets = inferAffectedMarkets(geoType, entities);

  for (const m of markets) {
    if (["WTI", "BRENT"].includes(m) && isOilRelevantEvent(geoType)) {
      relevance[m] = "HIGH";
    } else if (["GOLD", "SPX", "NDX"].includes(m)) {
      relevance[m] = "MEDIUM";
    } else {
      relevance[m] = "POSSIBLE";
    }
  }
  return relevance;
}

export function mergeClusterUpdate(
  existing: IntelligenceEventCluster,
  newItems: NormalizedNewsItem[],
): IntelligenceEventCluster {
  const allItems = deduplicateByTitle([
    ...existing.sources.map((s) => ({
      id: s.id,
      title: s.headline,
      summary: existing.summary,
      source: s.sourceName,
      publishedAt: s.publishedAt,
      url: s.url,
      categories: [existing.newsEventType] as NormalizedNewsItem["categories"],
      isOfficialSource: s.isOfficial,
      sourceType: s.sourceType,
    })),
    ...newItems,
  ]);

  const updated = buildCluster(allItems, existing.dataAvailability);
  return {
    ...updated,
    id: existing.id,
    state: existing.state === "WATCH" ? "WATCH" : updated.state,
    updates: [
      ...existing.updates,
      ...newItems.map((item) => ({
        id: `upd-${item.id}`,
        timestamp: item.aaryxReceivedAt ?? new Date().toISOString(),
        title: "Neuer Bericht hinzugefügt",
        description: `${item.sourceName ?? item.source}: ${item.title}`,
        verificationStatus: updated.verification.status,
      })),
    ],
    auditTrail: existing.auditTrail,
  };
}
