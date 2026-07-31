import { INVESTIGATION_CONFIG } from "@/lib/market-intelligence/config/investigation-config";
import { getNewsProviderConfig } from "@/lib/market-intelligence/config/news-provider-config";
import { classifyFlashTopic } from "@/lib/market-intelligence/config/oil-rss-feeds";
import { isEscalationHot } from "@/lib/market-intelligence/services/flash-relevance";
import { buildOilReaction } from "@/lib/market-intelligence/services/oil-reaction";
import { createIntelligenceAlert } from "@/lib/market-intelligence/engine/alert-engine";
import { runAIAnalysisJob, toLegacyExtendedAnalysis } from "@/lib/market-intelligence/ai/ai-analysis-orchestrator";
import { clusterNewsItems } from "@/lib/market-intelligence/services/event-clustering";
import { deduplicateByTitle } from "@/lib/market-intelligence/services/duplicate-detection";
import { getReplayNewsOverride } from "@/lib/market-intelligence/replay/replay-context";
import { eventQueryBuilder } from "@/lib/market-intelligence/services/event-query-builder";
import { calculateLeadLag, correlateMarketAndNews } from "@/lib/market-intelligence/services/lead-lag-analysis";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import { isMiPersistenceEnabled } from "@/lib/market-intelligence/persistence/config";
import { persistIntelligenceCluster } from "@/lib/market-intelligence/persistence/intelligence-repository";
import { calculatePriorityScore } from "@/lib/market-intelligence/services/priority-engine";
import {
  createOfficialSourceProvider,
  getConfiguredNewsProviders,
} from "@/lib/market-intelligence/providers/news/news-provider-factory";
import { createNewsProvider } from "@/lib/market-intelligence/providers/news/news-provider-factory";
import type { PipelineResult } from "@/lib/market-intelligence/engine/event-pipeline";
import type {
  AnomalyEvent,
  IntelligenceAlert,
  IntelligenceEvent,
  IntelligenceEventCluster,
  LiveFeedEntry,
  MarketEvent,
  NewsEvent,
  NewsProviderHealthInfo,
  NewsSystemHealth,
  NormalizedNewsItem,
  OilCorrelationResult,
} from "@/lib/types/market";

export interface InvestigationJobInput {
  marketEventId: string;
  marketEvent: MarketEvent;
  oilCorrelation?: OilCorrelationResult | null;
}

export interface InvestigationSearchHistory {
  queries: string[];
  providers: string[];
  resultCount: number;
  rejectedCount: number;
  timestamp: string;
}

export interface NewsPipelineResult {
  intelligenceEvents: IntelligenceEventCluster[];
  breakingNews: NewsEvent[];
  timeline: IntelligenceEvent[];
  liveFeed: LiveFeedEntry[];
  intelligenceAlerts: IntelligenceAlert[];
  searchHistory: InvestigationSearchHistory[];
  newsHealth: NewsSystemHealth;
}

const newsCache = new Map<string, { items: NormalizedNewsItem[]; cachedAt: number }>();
const activeClusters = new Map<string, IntelligenceEventCluster>();
const processedMarketEvents = new Set<string>();

function cacheKey(keywords: string[], timestamp: string): string {
  return `${timestamp}:${keywords.sort().join(",")}`;
}

async function searchAllProviders(
  keywords: string[],
  timestamp: string,
  beforeMinutes: number,
  afterMinutes: number,
): Promise<{ items: NormalizedNewsItem[]; providers: string[] }> {
  const replayItems = getReplayNewsOverride();
  if (replayItems) {
    const center = new Date(timestamp).getTime();
    const beforeMs = beforeMinutes * 60_000;
    const afterMs = afterMinutes * 60_000;
    const windowed = replayItems.filter((item) => {
      const ts = new Date(item.publishedAt).getTime();
      return ts >= center - beforeMs && ts <= center + afterMs;
    });
    const deduped = deduplicateByTitle(windowed.length > 0 ? windowed : replayItems);
    return { items: deduped, providers: ["replay"] };
  }

  const key = cacheKey(keywords, timestamp);
  const cached = newsCache.get(key);
  if (cached && Date.now() - cached.cachedAt < INVESTIGATION_CONFIG.searchCacheTtlMs) {
    return { items: cached.items, providers: ["cache"] };
  }

  const config = getNewsProviderConfig();
  const official = createOfficialSourceProvider();
  const allItems: NormalizedNewsItem[] = [];
  const providerIds: string[] = [];

  for (const provider of getConfiguredNewsProviders()) {
    try {
      const items = await provider.searchAroundTimestamp({
        timestamp,
        keywords,
        beforeMinutes,
        afterMinutes,
        limit: 30,
      });
      allItems.push(...items);
      providerIds.push(provider.id);
    } catch (error) {
      marketLogger.warn("News provider search failed", {
        provider: provider.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Offizielle + Oil RSS immer (kostenlos) — nicht nur bei NewsAPI
  try {
    const officialItems = await official.searchByKeywords(keywords);
    allItems.push(...officialItems);
    providerIds.push(official.id);
  } catch {
    // official feeds optional
  }

  const deduped = deduplicateByTitle(allItems);
  newsCache.set(key, { items: deduped, cachedAt: Date.now() });

  return { items: deduped, providers: providerIds };
}

function marketEventToAnomaly(event: MarketEvent): AnomalyEvent {
  return {
    id: event.id,
    assetId: event.assetId,
    asset: event.asset,
    symbol: event.symbol,
    direction: event.direction,
    percentageChange: event.priceChangePercent,
    absoluteChange: event.priceChange,
    windowMinutes: event.windowMinutes as AnomalyEvent["windowMinutes"],
    startPrice: event.startPrice,
    currentPrice: event.currentPrice,
    detectedAt: event.timestamp,
    severity: event.severity,
    eventType: event.eventType,
    status: event.status,
    description: event.description,
  };
}

export async function investigateMarketEvent(
  input: InvestigationJobInput,
): Promise<IntelligenceEventCluster[]> {
  if (processedMarketEvents.has(input.marketEventId)) {
    return [...activeClusters.values()];
  }

  const keywords = eventQueryBuilder.build({
    affectedAssets: [input.marketEvent.symbol, "WTI", "BRENT"],
    timestamp: input.marketEvent.timestamp,
    direction: input.marketEvent.direction,
    oilCorrelation: input.oilCorrelation,
    marketEvent: input.marketEvent,
  });

  const { items } = await searchAllProviders(
    keywords,
    input.marketEvent.timestamp,
    INVESTIGATION_CONFIG.beforeMinutes,
    INVESTIGATION_CONFIG.afterMinutes,
  );

  const config = getNewsProviderConfig();
  const dataAvailability = config.isConfigured ? "LIVE" : "DEMO";
  const clusters = clusterNewsItems(items, dataAvailability);

  for (const cluster of clusters) {
    const correlation = correlateMarketAndNews(input.marketEvent, cluster);
    const leadLag = calculateLeadLag({
      marketMoveStartedAt: input.marketEvent.timestamp,
      firstNewsAt: cluster.firstReportAt,
      anomalyDetectedAt: input.marketEvent.timestamp,
    });

    const priority = calculatePriorityScore({
      cluster,
      marketEvents: [input.marketEvent],
      oilCorrelation: input.oilCorrelation,
      hasMarketAnomaly: true,
    });

    const enriched: IntelligenceEventCluster = {
      ...cluster,
      marketCorrelation: correlation,
      leadLag,
      priority: priority.priority,
      priorityScore: priority.score,
      causality: correlation.possibleCausality,
      state: cluster.independentSourceCount >= 2 ? "VERIFIED" : "INVESTIGATING",
      auditTrail: [
        ...priority.auditTrail,
        {
          timestamp: new Date().toISOString(),
          reason: `Untersuchung durch Marktereignis ${input.marketEventId} ausgelöst`,
          factor: "market_event_trigger",
        },
      ],
      timestamps: {
        ...cluster.timestamps,
        anomalyDetectedAt: input.marketEvent.timestamp,
        linkedToMarketEventAt: new Date().toISOString(),
      },
    };

    activeClusters.set(enriched.id, enriched);
  }

  processedMarketEvents.add(input.marketEventId);
  return [...activeClusters.values()];
}

export async function processNewsFirstEvents(
  items: NormalizedNewsItem[],
): Promise<IntelligenceEventCluster[]> {
  const config = getNewsProviderConfig();
  const dataAvailability = config.isConfigured ? "LIVE" : "DEMO";
  const clusters = clusterNewsItems(items, dataAvailability);

  for (const cluster of clusters) {
    const priority = calculatePriorityScore({ cluster, hasMarketAnomaly: false });
    const enriched: IntelligenceEventCluster = {
      ...cluster,
      watchMode: true,
      state: "WATCH",
      priority: priority.priority,
      priorityScore: priority.score,
      auditTrail: priority.auditTrail,
    };
    activeClusters.set(enriched.id, enriched);
  }

  return [...activeClusters.values()];
}

function clusterToNewsEvent(cluster: IntelligenceEventCluster): NewsEvent {
  const ageMs = Date.now() - new Date(cluster.firstReportAt).getTime();
  const fresh = ageMs >= 0 && ageMs < 36 * 60 * 60_000;
  const text = `${cluster.headline} ${cluster.summary}`;
  const hot = isEscalationHot(text);
  const flash = fresh || hot;
  const flashTopic = classifyFlashTopic(text);

  return {
    id: cluster.id,
    timestamp: cluster.firstReportAt,
    title: cluster.headline,
    summary: cluster.summary,
    eventType: cluster.newsEventType,
    severity: hot
      ? "HIGH"
      : cluster.priority === "CRITICAL"
        ? "CRITICAL"
        : cluster.priority === "HIGH" || flash
          ? "HIGH"
          : "MEDIUM",
    sourceVerification: cluster.verification,
    affectedMarkets: cluster.potentiallyAffectedMarkets.map((symbol) => ({
      symbol,
      name: symbol,
      changePercent: 0,
    })),
    status:
      cluster.state === "VERIFIED" || cluster.verification.status === "CONFIRMED"
        ? "CONFIRMED"
        : cluster.state === "WATCH"
          ? "MONITORING"
          : "ACTIVE",
    isFlash: Boolean(flash),
    url: cluster.sources?.[0]?.url,
    flashTopic,
    imageUrl: cluster.imageUrl,
  };
}

function buildNewsTimeline(
  clusters: IntelligenceEventCluster[],
  marketPipeline: PipelineResult,
): IntelligenceEvent[] {
  const events: IntelligenceEvent[] = [];

  for (const anomaly of marketPipeline.marketEvents) {
    events.push({
      id: `tl-mkt-${anomaly.id}`,
      timestamp: anomaly.timestamp,
      title: `${anomaly.asset}: Anomalie erkannt`,
      description: anomaly.description,
      category: "detection",
    });
  }

  for (const cluster of clusters) {
    events.push({
      id: `tl-news-${cluster.id}`,
      timestamp: cluster.firstReportAt,
      title: "Erster relevanter Bericht erkannt",
      description: cluster.headline,
      category: "news",
    });

    if (cluster.independentSourceCount >= 2) {
      events.push({
        id: `tl-verify-${cluster.id}`,
        timestamp: cluster.latestUpdateAt,
        title: "Unabhängige Quelle erkannt",
        description: `${cluster.independentSourceCount} unabhängige Quellen`,
        category: "verification",
      });
    }

    if (cluster.verification.hasOfficialSource) {
      events.push({
        id: `tl-official-${cluster.id}`,
        timestamp: cluster.latestUpdateAt,
        title: "Offizielle Bestätigung",
        description: cluster.sources.find((s) => s.isOfficial)?.sourceName ?? "Offizielle Quelle",
        category: "verification",
      });
    }

    if (cluster.marketCorrelation) {
      events.push({
        id: `tl-corr-${cluster.id}`,
        timestamp: new Date().toISOString(),
        title: `Markt-News-Korrelation: ${cluster.marketCorrelation.correlationConfidence}`,
        description: cluster.marketCorrelation.note,
        category: "correlation",
      });
    }

    if (cluster.leadLag?.isReliable || cluster.leadLag?.leader !== "UNKNOWN") {
      events.push({
        id: `tl-leadlag-${cluster.id}`,
        timestamp: new Date().toISOString(),
        title: cluster.leadLag?.label ?? "Vorlauf/Nachlauf-Analyse",
        description: "Zeitvergleich zwischen Marktbewegung und erstem Bericht",
        category: "classification",
      });
    }
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function buildNewsLiveFeed(
  clusters: IntelligenceEventCluster[],
  marketFeed: LiveFeedEntry[],
): LiveFeedEntry[] {
  const newsFeed: LiveFeedEntry[] = [];

  for (const cluster of clusters) {
    newsFeed.push({
      id: `feed-news-${cluster.id}`,
      timestamp: cluster.firstReportAt,
      title: cluster.headline.slice(0, 80),
      description: `${cluster.independentSourceCount} unabhängige Quellen · ${cluster.verification.status}`,
      category: "news",
      severity: cluster.priority,
    });

    if (cluster.verification.status === "MULTIPLE_SOURCES" || cluster.verification.status === "CONFIRMED") {
      newsFeed.push({
        id: `feed-verify-${cluster.id}`,
        timestamp: cluster.latestUpdateAt,
        title: "Ereignis-Verifizierung aufgewertet",
        description: cluster.verification.status,
        category: "verification",
      });
    }
  }

  return [...marketFeed, ...newsFeed].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export interface NewsPipelineOptions {
  /** Skip AI + deep investigation — for fast page loads / mobile. */
  fast?: boolean;
  breakingLimit?: number;
}

export async function runNewsPipeline(
  marketPipeline: PipelineResult,
  options: NewsPipelineOptions = {},
): Promise<NewsPipelineResult> {
  const config = getNewsProviderConfig();
  const fast = Boolean(options.fast);
  const breakingLimit = options.breakingLimit ?? (fast ? 18 : 30);

  // Demo-Modus: kein Cache — alte englische RSS-Cluster sonst dauerhaft sichtbar
  if (!config.isConfigured) {
    resetNewsPipelineState();
  }
  const newsProvider = createNewsProvider();
  const official = createOfficialSourceProvider();

  let allClusters = [...activeClusters.values()];

  // Event-first: skip on fast path (expensive multi-query investigation)
  if (!fast) {
    const significantEvents = marketPipeline.marketEvents.filter(
      (e) =>
        e.severity === "HIGH" ||
        e.severity === "CRITICAL" ||
        e.eventType === "OIL_MARKET_ANOMALY",
    );

    for (const marketEvent of significantEvents) {
      const investigated = await investigateMarketEvent({
        marketEventId: marketEvent.id,
        marketEvent,
        oilCorrelation: marketPipeline.oilCorrelation,
      });
      allClusters = investigated;
    }
  }

  // News-first: free Oil RSS — skip slow official crawl on fast page path
  try {
    const breaking = await newsProvider.getBreakingNews(breakingLimit);
    const officialNews = fast ? [] : await official.fetchLatest(10);
    const newsFirst = await processNewsFirstEvents([...breaking, ...officialNews]);
    allClusters = mergeClusters(allClusters, newsFirst);
  } catch (error) {
    marketLogger.warn("Breaking news ingestion failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // AI analysis only for HIGH / CRITICAL — never on fast page path
  if (!fast) {
    for (let i = 0; i < allClusters.length; i++) {
      const cluster = allClusters[i];
      if (cluster.aiAnalysisResult) continue;

      const marketEvent = marketPipeline.marketEvents.find(
        (e) => cluster.marketCorrelation?.marketEventId === e.id,
      );

      const shouldAnalyze =
        cluster.priority === "CRITICAL" ||
        cluster.priority === "HIGH" ||
        cluster.priorityScore >= 75;

      if (!shouldAnalyze) continue;

      try {
        const { cluster: updated } = await runAIAnalysisJob({
          cluster: {
            ...cluster,
            oilReaction:
              cluster.oilReaction ?? buildOilReaction(cluster.firstReportAt),
          },
          pipeline: marketPipeline,
          marketEvent,
        });
        allClusters[i] = {
          ...updated,
          oilReaction:
            updated.oilReaction ?? buildOilReaction(updated.firstReportAt),
          aiAnalysis: updated.aiAnalysisResult
            ? toLegacyExtendedAnalysis(updated.aiAnalysisResult)
            : undefined,
        };
      } catch {
        // AI optional — market system continues
      }
    }
  }

  // Attach oil reaction hints (cheap, in-memory)
  allClusters = allClusters.map((cluster) => {
    if (cluster.oilReaction) return cluster;
    return {
      ...cluster,
      oilReaction: buildOilReaction(cluster.firstReportAt),
    };
  });

  const breakingNews = allClusters.map(clusterToNewsEvent);
  const timeline = buildNewsTimeline(allClusters, marketPipeline);
  const liveFeed = buildNewsLiveFeed(allClusters, marketPipeline.liveFeed);

  const intelligenceAlerts = [
    ...marketPipeline.intelligenceAlerts,
    ...allClusters
      .filter((c) => c.priorityScore >= 60)
      .map((cluster) => {
        const anomaly = marketPipeline.marketEvents.find(
          (e) => cluster.marketCorrelation?.marketEventId === e.id,
        );
        if (!anomaly) return null;
        return createIntelligenceAlert({
          anomaly: marketEventToAnomaly(anomaly),
          oilCorrelation: marketPipeline.oilCorrelation,
          verification: cluster.verification.status,
          sourceCount: cluster.independentSourceCount,
          possibleEvent: cluster.headline,
          timestamps: cluster.timestamps,
        });
      })
      .filter((a): a is IntelligenceAlert => a !== null),
  ];

  const providerHealths: NewsProviderHealthInfo[] = fast
    ? [
        {
          providerId: newsProvider.id,
          status: allClusters.length > 0 ? "ONLINE" : "DEGRADED",
          lastUpdate: allClusters[0]?.latestUpdateAt ?? null,
        },
        {
          providerId: official.id,
          status: "DEGRADED",
          lastUpdate: null,
        },
      ]
    : await Promise.all([
        newsProvider.getProviderHealth(),
        official.getProviderHealth(),
      ]);

  if (isMiPersistenceEnabled()) {
    for (const cluster of allClusters.slice(0, fast ? 8 : 20)) {
      void persistIntelligenceCluster(cluster);
    }
  }

  const primaryProvider = newsProvider;
  const newsHealth: NewsSystemHealth = {
    newsEngine: config.isConfigured ? "ACTIVE" : "NOT_CONFIGURED",
    providers: providerHealths,
    officialSources: providerHealths[1]?.status === "ONLINE" ? "ACTIVE" : "READY",
    verificationEngine: "ACTIVE",
    eventCorrelation: "ACTIVE",
    lastNewsAt: allClusters[0]?.latestUpdateAt ?? null,
    averageNewsLatencyMs: null,
    isLive: config.isConfigured,
    primarySource: config.isConfigured
      ? primaryProvider.name
      : "Demo-News",
    officialSourceLabel: "Free Oil RSS + Official (EIA, Fed, …)",
  };

  return {
    intelligenceEvents: allClusters,
    breakingNews,
    timeline,
    liveFeed,
    intelligenceAlerts,
    searchHistory: [],
    newsHealth,
  };
}

function mergeClusters(
  existing: IntelligenceEventCluster[],
  incoming: IntelligenceEventCluster[],
): IntelligenceEventCluster[] {
  const map = new Map(existing.map((c) => [c.id, c]));
  for (const cluster of incoming) {
    map.set(cluster.id, cluster);
  }
  return [...map.values()];
}

export function resetNewsPipelineState(): void {
  activeClusters.clear();
  processedMarketEvents.clear();
  newsCache.clear();
}
