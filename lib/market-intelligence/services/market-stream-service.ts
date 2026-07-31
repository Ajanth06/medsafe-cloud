import { MARKET_ASSETS } from "@/lib/market-intelligence/config/assets";
import { getMarketProviderConfig } from "@/lib/market-intelligence/config/provider-config";
import { SYMBOL_REGISTRY } from "@/lib/market-intelligence/config/symbol-registry";
import { runEventPipeline } from "@/lib/market-intelligence/engine/event-pipeline";
import {
  getPriceHistoryBuffer,
  resetPriceHistoryBuffer,
} from "@/lib/market-intelligence/engine/price-history-buffer";
import { getSharedMarketDataProvider } from "@/lib/market-intelligence/providers/provider-factory";
import { fetchQuotesWithFailover } from "@/lib/market-intelligence/providers/provider-failover";
import {
  recordProviderFailure,
  recordProviderSuccess,
} from "@/lib/market-intelligence/providers/provider-health-store";
import { isStale } from "@/lib/market-intelligence/services/data-quality";
import { DuplicateTickFilter } from "@/lib/market-intelligence/services/duplicate-ticks";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import { shouldSuppressAnomalyDuringRollover } from "@/lib/market-intelligence/services/contract-rollover";
import type {
  EnrichedMarketQuote,
  FeedConnectionState,
  MarketIntelligenceDashboardData,
  NormalizedMarketQuote,
} from "@/lib/types/market";
import {
  MOCK_ALERTS,
  MOCK_BREAKING_NEWS,
  MOCK_PRICE_HISTORY,
  MOCK_TIMELINE,
} from "@/lib/market-intelligence/mock-data";
import { PRIMARY_SYMBOLS } from "@/lib/market-intelligence/config/symbol-registry";
import { ANOMALY_DETECTION_RULES } from "@/lib/market-intelligence/config/detection-rules";
import { seedBufferFromHistory } from "@/lib/market-intelligence/engine/event-pipeline";
import { buildSystemHealth } from "@/lib/market-intelligence/providers/provider-health";
import { runNewsPipeline, type NewsPipelineResult } from "@/lib/market-intelligence/services/news-intelligence-orchestrator";
import { buildOperationsHealth } from "@/lib/market-intelligence/operations/system-watchdog";
import { getInAppAlerts } from "@/lib/market-intelligence/operations/in-app-alert-store";
import { processAlertsForDelivery } from "@/lib/market-intelligence/operations/alert-delivery-engine";
import { buildLiveMarketAlerts } from "@/lib/market-intelligence/operations/alert-history-mapper";
import {
  filterOilDeliveredAlerts,
  filterOilIntelligenceAlerts,
  filterOilMarketAlerts,
  filterOilMarketEvents,
} from "@/lib/market-intelligence/operations/oil-alert-scope";
import { hydrateOperationsFromDb } from "@/lib/market-intelligence/persistence/hydrate";
import { isMiPersistenceEnabled } from "@/lib/market-intelligence/persistence/config";
import { persistMarketEvents } from "@/lib/market-intelligence/persistence/events-repository";
import {
  persistLatestQuotes,
  persistPriceHistorySnapshots,
} from "@/lib/market-intelligence/persistence/quotes-repository";
import { getOperationsConfig } from "@/lib/market-intelligence/config/operations-config";

type PipelineResult = ReturnType<typeof runEventPipeline>;

interface StreamState {
  quotes: EnrichedMarketQuote[];
  pipeline: PipelineResult | null;
  lastPollAt: string | null;
  lastError: string | null;
  websocketState: FeedConnectionState;
  isDemo: boolean;
}

let streamState: StreamState = {
  quotes: [],
  pipeline: null,
  lastPollAt: null,
  lastError: null,
  websocketState: "NOT_CONFIGURED",
  isDemo: true,
};

let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastHistoryPersistAt = 0;
let pollInFlight: Promise<void> | null = null;
let lastNewsResult: NewsPipelineResult | null = null;
let newsRefreshInFlight: Promise<void> | null = null;
/** Timestamp of last news refresh kickoff (throttle). */
let lastNewsRefreshAt = 0;
const tickFilter = new DuplicateTickFilter();

function seedDemoHistory(): void {
  resetPriceHistoryBuffer();
  const buffer = getPriceHistoryBuffer();
  const historyMap = new Map<
    string,
    { assetId: string; snapshots: { price: number; timestamp: string }[] }
  >();

  for (const [symbol, snapshots] of MOCK_PRICE_HISTORY) {
    const asset = MARKET_ASSETS.find((a) => a.symbol === symbol);
    if (asset) historyMap.set(symbol, { assetId: asset.assetId, snapshots });
  }

  seedBufferFromHistory(buffer, historyMap);
}

function toDemoQuote(quote: NormalizedMarketQuote): NormalizedMarketQuote {
  return {
    ...quote,
    dataAvailability: "DEMO",
    isRealtime: false,
    source: "development-mock",
  };
}

function fallbackErrorMessage(config: ReturnType<typeof getMarketProviderConfig>): string {
  if (!config.oilConfigured) {
    return "OILPRICEAPI_KEY fehlt — Öl fällt auf verzögertes Yahoo zurück.";
  }
  if (config.provider === "polygon") {
    return "Polygon/Massive-Kurse fehlgeschlagen — Demo-Modus. MARKET_DATA_API_KEY prüfen.";
  }
  if (config.provider === "oilpriceapi") {
    return "Live-Öl via OilPriceAPI fehlgeschlagen — Demo-Modus. OILPRICEAPI_KEY prüfen.";
  }
  return "Live-Kurse fehlgeschlagen — Demo-Modus.";
}

async function pollMarketData(): Promise<void> {
  if (pollInFlight) {
    return pollInFlight;
  }

  pollInFlight = runPollMarketData();
  try {
    await pollInFlight;
  } finally {
    pollInFlight = null;
  }
}

async function runPollMarketData(): Promise<void> {
  const config = getMarketProviderConfig();
  const provider = getSharedMarketDataProvider();
  const symbols = SYMBOL_REGISTRY.map((e) => e.internalSymbol);

  try {
    let quotes: NormalizedMarketQuote[];
    let nextLastError: string | null = null;

    if (config.isConfigured) {
      // Hybrid: OilPriceAPI live for WTI/Brent, Yahoo Investing-style for the rest
      const result = await fetchQuotesWithFailover(provider, symbols);
      quotes = result.quotes;

      if (result.usedFallback) {
        streamState.isDemo = true;
        quotes = quotes.map(toDemoQuote);
        recordProviderFailure({
          provider: provider.id,
          providerType: "market",
          error: "failover",
        });
        nextLastError = fallbackErrorMessage(config);
        marketLogger.warn("market_provider_failover_active", { attempts: result.attempts });
      } else {
        const hasLive = quotes.some(
          (q) =>
            q.source === "yahoo" ||
            q.source === "oilpriceapi" ||
            q.source === "polygon" ||
            (q.dataAvailability !== "UNAVAILABLE" &&
              q.dataAvailability !== "DEMO" &&
              q.source !== "development-mock"),
        );
        streamState.isDemo = !hasLive;
        if (!hasLive) {
          nextLastError = fallbackErrorMessage(config);
          recordProviderFailure({
            provider: result.providerId,
            providerType: "market",
            error: "provider returned demo-only quotes",
          });
        } else {
          recordProviderSuccess({ provider: result.providerId, providerType: "market" });
        }
      }

      streamState.websocketState = config.websocketEnabled ? "CONNECTED" : "NOT_CONFIGURED";
    } else {
      seedDemoHistory();
      const mockQuotes = await provider.getQuotes(symbols);
      quotes = mockQuotes.map(toDemoQuote);
      streamState.isDemo = true;
      streamState.websocketState = "NOT_CONFIGURED";
    }

    for (const quote of quotes) {
      if (quote.price <= 0 || quote.dataAvailability === "UNAVAILABLE") continue;

      const isDup = tickFilter.isDuplicate({
        symbol: quote.symbol,
        price: quote.price,
        timestamp: quote.timestamp,
      });
      if (isDup) continue;

      if (shouldSuppressAnomalyDuringRollover(quote.symbol)) {
        marketLogger.info("Suppressing anomaly during contract rollover", {
          symbol: quote.symbol,
        });
      }
    }

    const nowMs = Date.now();
    for (const quote of quotes) {
      // Poll-based feeds: freshness = last successful fetch, not source print time.
      // OilPriceAPI/Yahoo updated_at can lag minutes while the feed is healthy.
      const freshnessTs =
        quote.source === "yahoo" || quote.source === "oilpriceapi"
          ? (quote.receivedAt ?? quote.timestamp)
          : quote.timestamp;
      if (quote.staleAfterSeconds && isStale(freshnessTs, quote.staleAfterSeconds, nowMs)) {
        quote.dataAvailability = "STALE";
      }
    }

    const buffer = getPriceHistoryBuffer();
    const pipeline = runEventPipeline(quotes, buffer, nowMs);

    streamState = {
      ...streamState,
      quotes: pipeline.quotes,
      pipeline,
      lastPollAt: new Date().toISOString(),
      lastError: nextLastError,
    };

    if (isMiPersistenceEnabled()) {
      void persistLatestQuotes(pipeline.quotes);
      void persistMarketEvents(pipeline.marketEvents);
      const now = Date.now();
      if (now - lastHistoryPersistAt > 60_000) {
        lastHistoryPersistAt = now;
        void persistPriceHistorySnapshots(pipeline.quotes);
      }
    }
  } catch (error) {
    streamState.lastError = error instanceof Error ? error.message : String(error);
    recordProviderFailure({
      provider: "market-primary",
      providerType: "market",
      error: streamState.lastError,
    });
    marketLogger.error("Market data poll failed", { error: streamState.lastError });
  }
}

export function startMarketStream(): void {
  if (pollTimer) return;

  const config = getMarketProviderConfig();
  void pollMarketData();

  pollTimer = setInterval(() => {
    void pollMarketData();
  }, config.pollIntervalMs);

  marketLogger.info("Market stream started", {
    configured: config.isConfigured,
    pollIntervalMs: config.pollIntervalMs,
  });
}

export function stopMarketStream(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export function getStreamState(): StreamState {
  return streamState;
}

/**
 * Fast path for UI: return last quotes immediately.
 * Kick a background refresh if the cache is older than minAgeMs.
 */
export function getQuotesSnapshot(minAgeMs = 1_500): {
  quotes: EnrichedMarketQuote[];
  lastPollAt: string | null;
  isDemo: boolean;
  error: string | null;
  refreshing: boolean;
} {
  startMarketStream();

  const ageMs = streamState.lastPollAt
    ? Date.now() - new Date(streamState.lastPollAt).getTime()
    : Number.POSITIVE_INFINITY;

  let refreshing = false;
  if (ageMs > minAgeMs && !pollInFlight) {
    refreshing = true;
    void pollMarketData();
  } else if (pollInFlight) {
    refreshing = true;
  }

  // Cold start: must wait once
  if (streamState.quotes.length === 0) {
    return {
      quotes: [],
      lastPollAt: streamState.lastPollAt,
      isDemo: streamState.isDemo,
      error: streamState.lastError,
      refreshing: true,
    };
  }

  return {
    quotes: streamState.quotes,
    lastPollAt: streamState.lastPollAt,
    isDemo: streamState.isDemo,
    error: streamState.lastError,
    refreshing,
  };
}

/**
 * Cold-start helper: return cache if present, otherwise wait briefly for first poll.
 * Prefer getQuotesSnapshot for UI polling — never block the hot path.
 */
export async function getQuotesSnapshotReady(minAgeMs = 1_500) {
  const snap = getQuotesSnapshot(minAgeMs);
  if (snap.quotes.length > 0) return snap;

  await Promise.race([
    pollMarketData(),
    new Promise<void>((resolve) => {
      setTimeout(resolve, 600);
    }),
  ]);
  return getQuotesSnapshot(minAgeMs);
}

function toLegacyDetectionRules() {
  return ANOMALY_DETECTION_RULES.filter((r) => r.direction === "UP" || r.direction === "BOTH").map(
    (rule) => ({
      id: rule.id,
      asset: rule.assetName,
      symbol: rule.symbol,
      condition: { type: "percentageChange" as const, operator: ">=" as const, value: rule.thresholdPercent },
      windowMinutes: rule.windowMinutes,
      action: "CREATE_MARKET_EVENT" as const,
      severity: rule.severity,
      enabled: rule.enabled,
    }),
  );
}

function emptyNewsResult(pipeline: PipelineResult): NewsPipelineResult {
  return {
    intelligenceEvents: [],
    breakingNews: [],
    timeline: [],
    liveFeed: pipeline.liveFeed,
    intelligenceAlerts: pipeline.intelligenceAlerts,
    searchHistory: [],
    newsHealth: {
      newsEngine: "ACTIVE",
      providers: [],
      officialSources: "READY",
      verificationEngine: "ACTIVE",
      eventCorrelation: "ACTIVE",
      lastNewsAt: null,
      averageNewsLatencyMs: null,
      isLive: true,
      primarySource: "Oil RSS",
      officialSourceLabel: "Free Oil RSS",
    },
  };
}

function refreshNewsInBackground(pipeline: PipelineResult): void {
  if (newsRefreshInFlight) return;
  // Throttle: don't re-run full news pipeline on every navigation
  if (
    lastNewsResult &&
    Date.now() - lastNewsRefreshAt < 90_000
  ) {
    return;
  }
  lastNewsRefreshAt = Date.now();
  newsRefreshInFlight = runNewsPipeline(pipeline, { fast: true })
    .then((result) => {
      lastNewsResult = result;
      const oilAlerts = filterOilIntelligenceAlerts(result.intelligenceAlerts);
      if (getOperationsConfig().alertDeliveryEnabled && oilAlerts.length > 0) {
        void processAlertsForDelivery({
          alerts: oilAlerts,
          clusters: result.intelligenceEvents,
          latency: {
            marketEventCreatedAt: pipeline.marketEvents[0]?.detectedAt,
          },
        });
      }
    })
    .catch((error) => {
      marketLogger.warn("Background news refresh failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    })
    .finally(() => {
      newsRefreshInFlight = null;
    });
}

export async function getMarketIntelligenceDataFromStream(): Promise<MarketIntelligenceDashboardData> {
  // Instant shell — never await Yahoo/RSS on the page critical path
  startMarketStream();

  if (isMiPersistenceEnabled()) {
    void hydrateOperationsFromDb();
  }

  const pipeline =
    streamState.pipeline ?? runEventPipeline([], getPriceHistoryBuffer());

  // News: serve cache instantly; background refresh is throttled
  const newsResult = lastNewsResult ?? emptyNewsResult(pipeline);
  refreshNewsInBackground(pipeline);

  const systemHealth = await buildSystemHealth({
    ...streamState,
    quotes: pipeline.quotes,
  });
  if (newsResult.newsHealth) {
    systemHealth.newsHealth = newsResult.newsHealth;
    systemHealth.newsEngine = newsResult.newsHealth.newsEngine;
  }
  systemHealth.operationsHealth = buildOperationsHealth();

  // In-memory alerts only on first paint — DB hydrate is already backgrounded
  const deliveredAlerts = filterOilDeliveredAlerts(getInAppAlerts({ tab: "ALL" }));
  const intelligenceAlerts = filterOilIntelligenceAlerts(
    newsResult.intelligenceAlerts.length
      ? newsResult.intelligenceAlerts
      : pipeline.intelligenceAlerts,
  );
  const marketEvents = filterOilMarketEvents(pipeline.marketEvents);
  const unreadAlertCount = deliveredAlerts.filter(
    (a) =>
      a.readStatus === "UNREAD" &&
      (a.severity === "HIGH" ||
        a.severity === "CRITICAL" ||
        a.severity === "MEDIUM"),
  ).length;

  const primaryQuotes = pipeline.quotes.filter((q) =>
    (PRIMARY_SYMBOLS as readonly string[]).includes(q.symbol),
  );

  const sortedQuotes = [
    ...pipeline.quotes.filter((q) => q.symbol === "WTI"),
    ...pipeline.quotes.filter((q) => q.symbol === "BRENT"),
    ...pipeline.quotes.filter((q) => q.symbol !== "WTI" && q.symbol !== "BRENT"),
  ];

  const timeline = [
    ...newsResult.timeline,
    ...(streamState.isDemo
      ? MOCK_TIMELINE.filter(
          (t) => !newsResult.timeline.some((n) => n.category === t.category),
        )
      : []),
  ].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const liveAlerts = filterOilMarketAlerts(
    buildLiveMarketAlerts({
      intelligenceAlerts,
      deliveredAlerts,
      marketEvents,
    }),
  );

  return {
    quotes: sortedQuotes,
    primaryQuotes,
    brentWtiSpread: pipeline.brentWtiSpread,
    marketEvents,
    breakingNews:
      newsResult.breakingNews.length > 0
        ? newsResult.breakingNews
        : streamState.isDemo
          ? MOCK_BREAKING_NEWS
          : [],
    intelligenceEvents: newsResult.intelligenceEvents,
    timeline,
    liveFeed: newsResult.liveFeed,
    alerts:
      liveAlerts.length > 0
        ? liveAlerts
        : streamState.isDemo
          ? filterOilMarketAlerts(MOCK_ALERTS)
          : [],
    intelligenceAlerts,
    detectionRules: toLegacyDetectionRules(),
    crossAssetEvents: pipeline.crossAssetEvents,
    oilCorrelation: pipeline.oilCorrelation,
    systemHealth,
    deliveredAlerts,
    unreadAlertCount,
  };
}

export { pollMarketData };
