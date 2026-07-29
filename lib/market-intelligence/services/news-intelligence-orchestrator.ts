import { INVESTIGATION_CONFIG } from "@/lib/market-intelligence/config/investigation-config";
import { getNewsProviderConfig } from "@/lib/market-intelligence/config/news-provider-config";
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

  const providers = getConfiguredNewsProviders();
  const official = createOfficialSourceProvider();
  const allItems: NormalizedNewsItem[] = [];
  const providerIds: string[] = [];

  for (const provider of providers) {
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
          reason: `Investigation triggered by market event ${input.marketEventId}`,
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
  return {
    id: cluster.id,
    timestamp: cluster.firstReportAt,
    title: cluster.headline,
    summary: cluster.summary,
    eventType: cluster.newsEventType,
    severity: cluster.priority === "CRITICAL" ? "CRITICAL" : cluster.priority === "HIGH" ? "HIGH" : "MEDIUM",
    sourceVerification: cluster.verification,
    affectedMarkets: cluster.potentiallyAffectedMarkets.map((symbol) => ({
      symbol,
      name: symbol,
      changePercent: 0,
    })),
    status: cluster.state === "VERIFIED" || cluster.verification.status === "CONFIRMED" ? "CONFIRMED" : cluster.state === "WATCH" ? "MONITORING" : "ACTIVE",
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
      title: `${anomaly.asset} anomaly detected`,
      description: anomaly.description,
      category: "detection",
    });
  }

  for (const cluster of clusters) {
    events.push({
      id: `tl-news-${cluster.id}`,
      timestamp: cluster.firstReportAt,
      title: "First related report detected",
      description: cluster.headline,
      category: "news",
    });

    if (cluster.independentSourceCount >= 2) {
      events.push({
        id: `tl-verify-${cluster.id}`,
        timestamp: cluster.latestUpdateAt,
        title: "Independent source detected",
        description: `${cluster.independentSourceCount} independent sources`,
        category: "verification",
      });
    }

    if (cluster.verification.hasOfficialSource) {
      events.push({
        id: `tl-official-${cluster.id}`,
        timestamp: cluster.latestUpdateAt,
        title: "Official confirmation",
        description: cluster.sources.find((s) => s.isOfficial)?.sourceName ?? "Official source",
        category: "verification",
      });
    }

    if (cluster.marketCorrelation) {
      events.push({
        id: `tl-corr-${cluster.id}`,
        timestamp: new Date().toISOString(),
        title: `Market-news correlation: ${cluster.marketCorrelation.correlationConfidence}`,
        description: cluster.marketCorrelation.note,
        category: "correlation",
      });
    }

    if (cluster.leadLag?.isReliable || cluster.leadLag?.leader !== "UNKNOWN") {
      events.push({
        id: `tl-leadlag-${cluster.id}`,
        timestamp: new Date().toISOString(),
        title: cluster.leadLag?.label ?? "Lead/lag analysis",
        description: "Timing comparison between market move and first report",
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
      description: `${cluster.independentSourceCount} independent sources · ${cluster.verification.status}`,
      category: "news",
      severity: cluster.priority,
    });

    if (cluster.verification.status === "MULTIPLE_SOURCES" || cluster.verification.status === "CONFIRMED") {
      newsFeed.push({
        id: `feed-verify-${cluster.id}`,
        timestamp: cluster.latestUpdateAt,
        title: "Event verification upgraded",
        description: cluster.verification.status,
        category: "verification",
      });
    }
  }

  return [...marketFeed, ...newsFeed].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export async function runNewsPipeline(
  marketPipeline: PipelineResult,
): Promise<NewsPipelineResult> {
  const config = getNewsProviderConfig();
  const newsProvider = createNewsProvider();
  const official = createOfficialSourceProvider();

  let allClusters = [...activeClusters.values()];

  // Event-first: investigate significant market events
  const significantEvents = marketPipeline.marketEvents.filter(
    (e) => e.severity === "HIGH" || e.severity === "CRITICAL" || e.eventType === "OIL_MARKET_ANOMALY",
  );

  for (const marketEvent of significantEvents) {
    const investigated = await investigateMarketEvent({
      marketEventId: marketEvent.id,
      marketEvent,
      oilCorrelation: marketPipeline.oilCorrelation,
    });
    allClusters = investigated;
  }

  // News-first: ingest breaking news and watch mode
  try {
    const breaking = await newsProvider.getBreakingNews(10);
    const officialNews = await official.fetchLatest(10);
    const newsFirst = await processNewsFirstEvents([...breaking, ...officialNews]);
    allClusters = mergeClusters(allClusters, newsFirst);
  } catch (error) {
    marketLogger.warn("Breaking news ingestion failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // AI analysis for high-priority clusters
  for (let i = 0; i < allClusters.length; i++) {
    const cluster = allClusters[i];
    if (cluster.aiAnalysisResult) continue;

    const marketEvent = marketPipeline.marketEvents.find(
      (e) => cluster.marketCorrelation?.marketEventId === e.id,
    );

    const shouldAnalyze =
      cluster.priorityScore >= 60 ||
      cluster.watchMode ||
      cluster.verification.hasOfficialSource;

    if (!shouldAnalyze) continue;

    try {
      const { cluster: updated } = await runAIAnalysisJob({
        cluster,
        pipeline: marketPipeline,
        marketEvent,
      });
      allClusters[i] = {
        ...updated,
        aiAnalysis: updated.aiAnalysisResult
          ? toLegacyExtendedAnalysis(updated.aiAnalysisResult)
          : undefined,
      };
    } catch {
      // AI optional — market system continues
    }
  }

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

  const providerHealths = await Promise.all([
    newsProvider.getProviderHealth(),
    official.getProviderHealth(),
  ]);

  if (isMiPersistenceEnabled()) {
    for (const cluster of allClusters.slice(0, 20)) {
      void persistIntelligenceCluster(cluster);
    }
  }

  const newsHealth: NewsSystemHealth = {
    newsEngine: config.isConfigured ? "ACTIVE" : "NOT_CONFIGURED",
    providers: providerHealths,
    officialSources: providerHealths[1]?.status === "ONLINE" ? "ACTIVE" : "READY",
    verificationEngine: "ACTIVE",
    eventCorrelation: "ACTIVE",
    lastNewsAt: allClusters[0]?.latestUpdateAt ?? null,
    averageNewsLatencyMs: null,
    isLive: config.isConfigured,
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
