import { LEAD_LAG_RELIABLE_THRESHOLD_MS } from "@/lib/market-intelligence/config/investigation-config";
import type { CausalityStatus, ConfidenceLevel, MarketLeadLag, MarketNewsCorrelation, MarketEvent } from "@/lib/types/market";
import type { IntelligenceEventCluster } from "@/lib/types/market";

export function calculateLeadLag(input: {
  marketMoveStartedAt?: string | null;
  firstNewsAt?: string | null;
  anomalyDetectedAt?: string | null;
}): MarketLeadLag {
  const { marketMoveStartedAt, firstNewsAt, anomalyDetectedAt } = input;

  if (!marketMoveStartedAt && !firstNewsAt) {
    return {
      marketMoveStartedAt: null,
      firstNewsAt: null,
      anomalyDetectedAt: anomalyDetectedAt ?? null,
      differenceMs: null,
      leader: "UNKNOWN",
      label: "Timing comparison unavailable",
      isReliable: false,
    };
  }

  const marketTs = marketMoveStartedAt
    ? new Date(marketMoveStartedAt).getTime()
    : anomalyDetectedAt
      ? new Date(anomalyDetectedAt).getTime()
      : null;
  const newsTs = firstNewsAt ? new Date(firstNewsAt).getTime() : null;

  if (marketTs === null || newsTs === null) {
    return {
      marketMoveStartedAt: marketMoveStartedAt ?? null,
      firstNewsAt: firstNewsAt ?? null,
      anomalyDetectedAt: anomalyDetectedAt ?? null,
      differenceMs: null,
      leader: "UNKNOWN",
      label: "Timing comparison unavailable — missing timestamp",
      isReliable: false,
    };
  }

  const differenceMs = newsTs - marketTs;
  const absDiff = Math.abs(differenceMs);
  const isReliable = absDiff <= LEAD_LAG_RELIABLE_THRESHOLD_MS * 10;

  let leader: MarketLeadLag["leader"] = "UNKNOWN";
  let label: string;

  if (Math.abs(differenceMs) < 60_000) {
    leader = "UNKNOWN";
    label = "Market and news approximately simultaneous (within 1 min)";
  } else if (differenceMs > 0) {
    leader = "MARKET";
    label = `MARKET LED NEWS BY ${formatDuration(absDiff)}`;
  } else {
    leader = "NEWS";
    label = `NEWS LED MARKET BY ${formatDuration(absDiff)}`;
  }

  if (!isReliable) {
    label = `Approximate based on provider timestamps — ${label}`;
  }

  return {
    marketMoveStartedAt: marketMoveStartedAt ?? null,
    firstNewsAt: firstNewsAt ?? null,
    anomalyDetectedAt: anomalyDetectedAt ?? null,
    differenceMs,
    leader,
    label,
    isReliable,
  };
}

export function correlateMarketAndNews(
  marketEvent: MarketEvent,
  cluster: IntelligenceEventCluster,
): MarketNewsCorrelation {
  const marketTs = new Date(marketEvent.timestamp).getTime();
  const newsTs = new Date(cluster.firstReportAt).getTime();
  const timeDifferenceMs = newsTs - marketTs;

  let possibleCausality: CausalityStatus = "UNKNOWN";
  let correlationConfidence: ConfidenceLevel = "LOW";
  let note = "Correlation is not causation — timing overlap only.";

  const absDiff = Math.abs(timeDifferenceMs);
  const withinWindow = absDiff <= 30 * 60 * 1000;

  if (withinWindow && cluster.independentSourceCount >= 2) {
    possibleCausality = "LIKELY";
    correlationConfidence = "MEDIUM";
    note = "Market move and news cluster overlap within 30 minutes with multiple sources.";
  }

  if (withinWindow && cluster.verification.hasOfficialSource) {
    possibleCausality = "HIGHLY_LIKELY";
    correlationConfidence = "HIGH";
    note = "Market move correlates with verified news including official source.";
  }

  if (cluster.verification.status === "CONFLICTING") {
    possibleCausality = "UNKNOWN";
    correlationConfidence = "LOW";
    note = "Conflicting reports — causality cannot be determined.";
  }

  return {
    marketEventId: marketEvent.id,
    intelligenceEventId: cluster.id,
    timeDifferenceMs,
    affectedAssets: [
      marketEvent.symbol,
      ...cluster.potentiallyAffectedMarkets,
    ].filter((v, i, a) => a.indexOf(v) === i),
    correlationConfidence,
    possibleCausality,
    note,
  };
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}s`;
  return `${min}m${sec > 0 ? `${sec}s` : ""}`;
}
