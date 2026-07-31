import {
  GEOPOLITICAL_KEYWORD_MAP,
  mapToNewsEventType,
  OIL_EVENT_TYPES,
  SOURCE_CREDIBILITY_WEIGHTS,
  SYNDICATION_ORIGINS,
} from "@/lib/market-intelligence/config/news-sources";
import { decodeHtmlEntities } from "@/lib/market-intelligence/format/decode-html";
import { isOfficialSource } from "@/lib/market-intelligence/services/source-verification";
import type {
  GeopoliticalEventType,
  NormalizedNewsItem,
  SourceType,
} from "@/lib/types/market";

export function normalizeNewsItem(
  item: Partial<NormalizedNewsItem> & Pick<NormalizedNewsItem, "id" | "title" | "summary" | "source" | "publishedAt">,
  provider: string,
): NormalizedNewsItem {
  const now = new Date().toISOString();
  const sourceName = decodeHtmlEntities(item.sourceName ?? item.source);
  const sourceDomain = item.sourceDomain ?? extractDomain(item.url);
  const title = decodeHtmlEntities(item.title);
  const summary = decodeHtmlEntities(item.summary);

  return {
    id: item.id,
    title,
    summary,
    source: sourceName,
    sourceName,
    sourceDomain,
    publishedAt: item.publishedAt,
    url: item.url,
    categories: item.categories?.length ? item.categories : ["FINANCIAL"],
    isOfficialSource: item.isOfficialSource ?? isOfficialSource(sourceName),
    provider,
    providerEventId: item.providerEventId,
    bodySnippet: item.bodySnippet
      ? decodeHtmlEntities(item.bodySnippet).slice(0, 280)
      : undefined,
    sourceType: item.sourceType ?? classifySourceType(sourceName, sourceDomain),
    sourceOrigin: item.sourceOrigin ?? resolveSyndicationOrigin(sourceName),
    syndicationGroup: item.syndicationGroup ?? resolveSyndicationOrigin(sourceName),
    providerReceivedAt: item.providerReceivedAt,
    aaryxReceivedAt: item.aaryxReceivedAt ?? now,
    processedAt: item.processedAt ?? now,
    language: item.language ?? "en",
    geopoliticalType: item.geopoliticalType ?? classifyGeopoliticalType(title, summary),
    entities: item.entities ?? extractEntities(`${title} ${summary}`),
    rawKeywords: item.rawKeywords,
    credibilityScore: item.credibilityScore ?? scoreCredibility(sourceName, item.sourceType),
    dataAvailability: item.dataAvailability ?? "LIVE",
    hasConflictingReports: item.hasConflictingReports,
    isRetracted: item.isRetracted,
    imageUrl: item.imageUrl,
  };
}

export function classifySourceType(sourceName: string, domain?: string): SourceType {
  const text = `${sourceName} ${domain ?? ""}`.toLowerCase();
  if (/twitter|x\.com|reddit|telegram/.test(text)) return "SOCIAL_MEDIA";
  if (/reuters|ap news|associated press|afp|bloomberg/.test(text)) return "NEWS_WIRE";
  if (/wsj|ft\.com|financial times|cnbc|marketwatch/.test(text)) return "FINANCIAL_MEDIA";
  if (/bbc|cnn|nytimes|guardian/.test(text)) return "MAJOR_MEDIA";
  if (/federal reserve|ecb|treasury|white house|defense|opec|eia|iea/.test(text)) {
    if (/fed|ecb|central bank/.test(text)) return "OFFICIAL_CENTRAL_BANK";
    if (/defense|military|pentagon|nato/.test(text)) return "OFFICIAL_MILITARY";
    if (/opec|eia|iea|energy/.test(text)) return "OFFICIAL_ENERGY";
    return "OFFICIAL_GOVERNMENT";
  }
  return "UNKNOWN";
}

export function resolveSyndicationOrigin(sourceName: string): string | undefined {
  const key = sourceName.toLowerCase().trim();
  return SYNDICATION_ORIGINS[key] ?? SYNDICATION_ORIGINS[key.replace(/\s+/g, "")];
}

export function classifyGeopoliticalType(title: string, summary: string): GeopoliticalEventType {
  const text = `${title} ${summary}`.toLowerCase();

  for (const [type, keywords] of Object.entries(GEOPOLITICAL_KEYWORD_MAP) as [GeopoliticalEventType, string[]][]) {
    if (keywords.some((k) => text.includes(k.toLowerCase()))) {
      return type;
    }
  }

  if (/opec|production cut|output cut/.test(text)) return "OPEC_DECISION";
  if (/hormuz|strait|shipping|tanker/.test(text)) return "STRAIT_DISRUPTION";
  if (/pipeline/.test(text)) return "PIPELINE_OUTAGE";
  if (/refinery/.test(text)) return "REFINERY_OUTAGE";
  if (/sanctions|embargo/.test(text)) return "SANCTIONS";
  if (/missile|strike|attack|drone|military|war/.test(text)) return "MILITARY_STRIKE";
  if (/fed|ecb|rate decision|interest rate/.test(text)) return "CENTRAL_BANK_DECISION";
  if (/inflation|cpi|ppi/.test(text)) return "INFLATION_DATA";
  if (/gdp|growth/.test(text)) return "GDP_DATA";
  if (/employment|jobs|payroll/.test(text)) return "EMPLOYMENT_DATA";
  if (/oil|crude|energy|supply/.test(text)) return "ENERGY_SUPPLY_DISRUPTION";

  return "UNKNOWN";
}

export function extractEntities(text: string): string[] {
  const entities = new Set<string>();
  const patterns = [
    "Iran", "Israel", "Saudi Arabia", "Russia", "Ukraine", "China", "US", "United States",
    "OPEC", "Hormuz", "Red Sea", "WTI", "Brent", "Federal Reserve", "ECB", "NATO",
    "Pentagon", "White House", "Strait of Hormuz",
  ];
  for (const p of patterns) {
    if (text.toLowerCase().includes(p.toLowerCase())) entities.add(p);
  }
  return [...entities];
}

export function scoreCredibility(sourceName: string, sourceType?: SourceType): number {
  const type = sourceType ?? classifySourceType(sourceName);
  return SOURCE_CREDIBILITY_WEIGHTS[type] ?? 30;
}

export function isOilRelevantEvent(type: GeopoliticalEventType): boolean {
  return OIL_EVENT_TYPES.includes(type);
}

export function toNewsEventType(geoType: GeopoliticalEventType) {
  return mapToNewsEventType(geoType);
}

function extractDomain(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}
