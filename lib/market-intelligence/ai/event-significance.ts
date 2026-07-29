import type {
  CrossAssetCorrelationResult,
  EnrichedMarketQuote,
  IntelligenceEventCluster,
  MarketEvent,
  OilCorrelationResult,
} from "@/lib/types/market";

export function calculateEventSignificance(input: {
  marketEvent?: MarketEvent;
  cluster: IntelligenceEventCluster;
  oilCorrelation?: OilCorrelationResult | null;
  crossAsset?: CrossAssetCorrelationResult | null;
}): { level: import("@/lib/types/market").EventSignificance; score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const move = Math.abs(input.marketEvent?.priceChangePercent ?? 0);
  if (move >= 3) {
    score += 40;
    reasons.push("Large market move (>=3%)");
  } else if (move >= 1.5) {
    score += 25;
    reasons.push("Significant market move (>=1.5%)");
  } else if (move >= 0.5) {
    score += 10;
  } else if (move < 0.3) {
    score -= 10;
    reasons.push("Minimal price movement");
  }

  if (input.oilCorrelation?.bothConfirmed) {
    score += 20;
    reasons.push("WTI + Brent confirmation");
  }

  if (input.cluster.independentSourceCount >= 3) {
    score += 15;
    reasons.push("Multiple independent sources");
  } else if (input.cluster.independentSourceCount === 1) {
    score -= 5;
  }

  if (input.cluster.verification.hasOfficialSource) {
    score += 20;
    reasons.push("Official source present");
  }

  if (input.cluster.verification.status === "CONFLICTING") score -= 25;
  if (input.crossAsset) {
    score += 15;
    reasons.push("Cross-asset correlation");
  }

  score = Math.max(0, Math.min(100, score));

  let level: import("@/lib/types/market").EventSignificance = "LOW";
  if (score >= 75) level = "SYSTEMIC";
  else if (score >= 55) level = "HIGH";
  else if (score >= 35) level = "MODERATE";
  else if (score < 15) level = "NOISE";

  return { level, score, reasons };
}

export function runContradictionCheck(input: {
  cluster: IntelligenceEventCluster;
  marketEvent?: MarketEvent;
  oilCorrelation?: OilCorrelationResult | null;
  leadLag?: IntelligenceEventCluster["leadLag"];
  quotes: EnrichedMarketQuote[];
}): string[] {
  const flags: string[] = [];

  if (input.cluster.verification.status === "CONFLICTING") {
    flags.push("Conflicting news sources");
  }

  if (input.cluster.verification.status === "RETRACTED") {
    flags.push("Source retraction detected");
  }

  if (input.leadLag?.leader === "MARKET" && input.cluster.independentSourceCount === 0) {
    flags.push("Market moved before any news — cause unconfirmed");
  }

  if (input.marketEvent && input.cluster.independentSourceCount > 0) {
    const newsLed = input.leadLag?.leader === "NEWS";
    const marketUp = input.marketEvent.direction === "UP";
    const isNegativeNews = /denies|retracted|false|debunk/i.test(input.cluster.headline);
    if (newsLed && marketUp && isNegativeNews) {
      flags.push("Market direction may contradict news narrative");
    }
  }

  if (input.quotes.some((q) => q.contract?.rolloverDetected)) {
    flags.push("Futures contract rollover in progress — price gap may be non-fundamental");
  }

  if (input.quotes.some((q) => q.isStale || q.dataAvailability === "STALE")) {
    flags.push("Market feed may be stale");
  }

  if (input.quotes.some((q) => q.dataAvailability === "DELAYED")) {
    flags.push("Market data is delayed");
  }

  return flags;
}
