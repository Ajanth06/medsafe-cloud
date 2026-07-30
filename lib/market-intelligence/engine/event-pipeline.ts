import { SUPPORTED_WINDOWS } from "@/lib/market-intelligence/config/detection-rules";
import { STALE_DATA_THRESHOLD_MS, VOLATILITY_THRESHOLDS } from "@/lib/market-intelligence/config/constants";
import { MARKET_ASSETS } from "@/lib/market-intelligence/config/assets";
import {
  anomalyToMarketEvent,
  detectAnomalies,
} from "@/lib/market-intelligence/engine/anomaly-detection";
import { analyzeCrossAssetCorrelation } from "@/lib/market-intelligence/engine/cross-asset-correlation";
import { analyzeOilCorrelation } from "@/lib/market-intelligence/engine/oil-correlation";
import { calculateBrentWTISpread } from "@/lib/market-intelligence/engine/brent-wti-spread";
import { createIntelligenceAlert } from "@/lib/market-intelligence/engine/alert-engine";
import {
  getPriceHistoryBuffer,
  PriceHistoryBuffer,
} from "@/lib/market-intelligence/engine/price-history-buffer";
import { calculateAllWindowReturns } from "@/lib/market-intelligence/engine/returns-calculator";
import { buildLiveFeed } from "@/lib/market-intelligence/engine/live-feed";
import type {
  EnrichedMarketQuote,
  IntelligenceAlert,
  LiveFeedEntry,
  MarketEvent,
  NormalizedMarketQuote,
  PriceDirection,
  VolatilityStatus,
} from "@/lib/types/market";

export interface PipelineResult {
  quotes: EnrichedMarketQuote[];
  marketEvents: MarketEvent[];
  intelligenceAlerts: IntelligenceAlert[];
  liveFeed: LiveFeedEntry[];
  oilCorrelation: ReturnType<typeof analyzeOilCorrelation>;
  crossAssetEvents: NonNullable<ReturnType<typeof analyzeCrossAssetCorrelation>>[];
  brentWtiSpread: ReturnType<typeof calculateBrentWTISpread>;
}

function toDirection(change: number): PriceDirection {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
}

function toVolatilityStatus(returns: EnrichedMarketQuote["returns"]): VolatilityStatus {
  const maxAbs = Math.max(
    Math.abs(returns.m5 ?? 0),
    Math.abs(returns.m15 ?? 0),
    Math.abs(returns.m60 ?? 0),
  );

  if (maxAbs >= VOLATILITY_THRESHOLDS.high) return "HIGH_VOLATILITY";
  if (maxAbs >= VOLATILITY_THRESHOLDS.elevated) return "ELEVATED";
  return "NORMAL";
}

function enrichQuote(
  quote: NormalizedMarketQuote,
  buffer: PriceHistoryBuffer,
  nowMs: number,
): EnrichedMarketQuote {
  const snapshots = buffer.getSnapshots(quote.symbol);
  const returns = calculateAllWindowReturns(snapshots, SUPPORTED_WINDOWS, nowMs);
  // Prefer receivedAt for poll-based providers so source print lag ≠ "Veraltet"
  const freshnessTs =
    quote.source === "yahoo" || quote.source === "oilpriceapi"
      ? (quote.receivedAt ?? quote.timestamp)
      : quote.timestamp;
  const ageMs = nowMs - new Date(freshnessTs).getTime();

  const staleThresholdMs = quote.staleAfterSeconds
    ? quote.staleAfterSeconds * 1000
    : STALE_DATA_THRESHOLD_MS;

  const enriched: EnrichedMarketQuote = {
    ...quote,
    direction: toDirection(quote.percentageChange),
    returns,
    sparkline: snapshots.slice(-12).map((s) => s.price),
    volatilityStatus: toVolatilityStatus(returns),
    isStale:
      quote.dataAvailability === "STALE" ||
      quote.dataAvailability === "UNAVAILABLE" ||
      ageMs > staleThresholdMs,
  };

  return enriched;
}

export function runEventPipeline(
  quotes: NormalizedMarketQuote[],
  buffer: PriceHistoryBuffer = getPriceHistoryBuffer(),
  nowMs: number = Date.now(),
): PipelineResult {
  for (const quote of quotes) {
    buffer.addSnapshot({
      assetId: quote.assetId,
      symbol: quote.symbol,
      price: quote.price,
      timestamp: quote.timestamp,
    });
  }

  const enrichedQuotes = quotes.map((q) => enrichQuote(q, buffer, nowMs));

  const anomalies = detectAnomalies(buffer, undefined, nowMs);
  const oilCorrelation = analyzeOilCorrelation(buffer, undefined, nowMs);
  const crossAsset = analyzeCrossAssetCorrelation(buffer, undefined, nowMs);

  const marketEvents = anomalies.map((a) => {
    const event = anomalyToMarketEvent(a);

    if (
      oilCorrelation.bothConfirmed &&
      (a.symbol === "WTI" || a.symbol === "BRENT")
    ) {
      return {
        ...event,
        eventType: "OIL_MARKET_ANOMALY" as const,
        confidenceBoost: oilCorrelation.confidenceBoost,
        description: oilCorrelation.description,
      };
    }

    return event;
  });

  const intelligenceAlerts = marketEvents
    .filter((e) => e.severity === "HIGH" || e.severity === "CRITICAL")
    .map((e) => {
      const anomaly = anomalies.find((a) => a.id === e.id)!;
      return createIntelligenceAlert({
        anomaly,
        oilCorrelation,
        crossAsset,
      });
    });

  const brentQuote = quotes.find((q) => q.symbol === "BRENT") ?? null;
  const wtiQuote = quotes.find((q) => q.symbol === "WTI") ?? null;
  const brentWtiSpread = calculateBrentWTISpread(brentQuote, wtiQuote);

  const liveFeed = buildLiveFeed({
    anomalies,
    oilCorrelation,
    crossAsset,
    intelligenceAlerts,
  });

  return {
    quotes: enrichedQuotes,
    marketEvents,
    intelligenceAlerts,
    liveFeed,
    oilCorrelation,
    crossAssetEvents: crossAsset ? [crossAsset] : [],
    brentWtiSpread,
  };
}

export function seedBufferFromHistory(
  buffer: PriceHistoryBuffer,
  historyBySymbol: Map<string, { assetId: string; snapshots: { price: number; timestamp: string }[] }>,
): void {
  for (const [symbol, data] of historyBySymbol) {
    for (const snap of data.snapshots) {
      buffer.addSnapshot({
        assetId: data.assetId,
        symbol,
        price: snap.price,
        timestamp: snap.timestamp,
      });
    }
  }
}

export { MARKET_ASSETS };
