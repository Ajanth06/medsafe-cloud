import { CONFIDENCE_THRESHOLDS, CONFIDENCE_WEIGHTS } from "@/lib/market-intelligence/config/constants";
import type {
  AnomalyEvent,
  ConfidenceFactor,
  ConfidenceLevel,
  ConfidenceScore,
  CrossAssetCorrelationResult,
  OilCorrelationResult,
  SourceVerificationStatus,
} from "@/lib/types/market";

export interface ConfidenceInput {
  anomaly?: AnomalyEvent;
  oilCorrelation?: OilCorrelationResult;
  crossAsset?: CrossAssetCorrelationResult | null;
  sourceStatus?: SourceVerificationStatus;
  sourceCount?: number;
  hasOfficialSource?: boolean;
  hasConflictingSources?: boolean;
  isStale?: boolean;
}

function scoreToLevel(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLDS.high) return "HIGH";
  if (score >= CONFIDENCE_THRESHOLDS.medium) return "MEDIUM";
  return "LOW";
}

export function calculateConfidence(input: ConfidenceInput): ConfidenceScore {
  const factors: ConfidenceFactor[] = [];
  let score = 0;

  if (input.anomaly) {
    factors.push({ label: "Market anomaly detected", delta: CONFIDENCE_WEIGHTS.marketAnomaly });
    score += CONFIDENCE_WEIGHTS.marketAnomaly;

    if (input.anomaly.severity === "CRITICAL") {
      factors.push({ label: "Critical severity move", delta: CONFIDENCE_WEIGHTS.strongMoveCritical });
      score += CONFIDENCE_WEIGHTS.strongMoveCritical;
    }
  }

  if (input.oilCorrelation?.bothConfirmed) {
    factors.push({ label: "WTI + Brent simultaneous move", delta: CONFIDENCE_WEIGHTS.wtiBrentSimultaneous });
    score += CONFIDENCE_WEIGHTS.wtiBrentSimultaneous;
  }

  if (input.crossAsset) {
    factors.push({ label: "Cross-asset correlation", delta: CONFIDENCE_WEIGHTS.crossAssetCorrelation });
    score += CONFIDENCE_WEIGHTS.crossAssetCorrelation;
  }

  if (input.hasOfficialSource) {
    factors.push({ label: "Official source confirmation", delta: CONFIDENCE_WEIGHTS.officialSource });
    score += CONFIDENCE_WEIGHTS.officialSource;
  } else if (input.sourceCount && input.sourceCount >= 3) {
    factors.push({ label: "3+ independent sources", delta: CONFIDENCE_WEIGHTS.threeIndependentSources });
    score += CONFIDENCE_WEIGHTS.threeIndependentSources;
  } else if (input.sourceCount && input.sourceCount >= 2) {
    factors.push({ label: "2 independent sources", delta: CONFIDENCE_WEIGHTS.twoIndependentSources });
    score += CONFIDENCE_WEIGHTS.twoIndependentSources;
  }

  if (input.hasConflictingSources) {
    factors.push({ label: "Conflicting reports", delta: CONFIDENCE_WEIGHTS.conflictingSource });
    score += CONFIDENCE_WEIGHTS.conflictingSource;
  }

  if (input.isStale) {
    factors.push({ label: "Stale market data", delta: CONFIDENCE_WEIGHTS.staleData });
    score += CONFIDENCE_WEIGHTS.staleData;
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    level: scoreToLevel(score),
    factors,
  };
}
