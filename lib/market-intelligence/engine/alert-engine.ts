import { calculateConfidence } from "@/lib/market-intelligence/engine/confidence-engine";
import type {
  AffectedMarket,
  AlertSeverity,
  AnomalyEvent,
  ConfidenceLevel,
  CrossAssetCorrelationResult,
  EventTimestamps,
  IntelligenceAlert,
  OilCorrelationResult,
  SourceVerificationStatus,
} from "@/lib/types/market";

function severityToAlert(severity: AnomalyEvent["severity"]): AlertSeverity {
  return severity;
}

export interface CreateAlertInput {
  anomaly: AnomalyEvent;
  oilCorrelation?: OilCorrelationResult;
  crossAsset?: CrossAssetCorrelationResult | null;
  verification?: SourceVerificationStatus;
  sourceCount?: number;
  possibleEvent?: string;
  timestamps?: Partial<EventTimestamps>;
}

export function createIntelligenceAlert(input: CreateAlertInput): IntelligenceAlert {
  const confidence = calculateConfidence({
    anomaly: input.anomaly,
    oilCorrelation: input.oilCorrelation,
    crossAsset: input.crossAsset,
    sourceStatus: input.verification,
    sourceCount: input.sourceCount,
  });

  const affectedAssets: AffectedMarket[] = [
    {
      symbol: input.anomaly.symbol,
      name: input.anomaly.asset,
      changePercent: input.anomaly.percentageChange,
    },
  ];

  if (input.oilCorrelation?.bothConfirmed && input.anomaly.symbol !== "BRENT") {
    affectedAssets.push({
      symbol: "BRENT",
      name: "Brent Crude Oil",
      changePercent: input.oilCorrelation.brentChange?.percentageChange ?? 0,
    });
  }

  if (input.crossAsset) {
    for (const movement of input.crossAsset.movements) {
      if (!affectedAssets.some((a) => a.symbol === movement.symbol)) {
        affectedAssets.push({
          symbol: movement.symbol,
          name: movement.name,
          changePercent: movement.percentageChange,
        });
      }
    }
  }

  const now = new Date().toISOString();
  const title =
    input.oilCorrelation?.eventType === "OIL_MARKET_ANOMALY"
      ? "ÖLMARKT-ANOMALIE"
      : input.crossAsset
        ? "CROSS-MARKET-EREIGNIS"
        : `${input.anomaly.asset} ${input.anomaly.direction === "UP" ? "AUFWÄRTS" : "ABWÄRTS"}-ANOMALIE`;

  return {
    id: `alert-${input.anomaly.id}`,
    severity: severityToAlert(input.anomaly.severity),
    title,
    description: input.anomaly.description,
    possibleEvent: input.possibleEvent,
    verification: input.verification ?? "UNVERIFIED",
    confidence: confidence.level,
    confidenceScore: confidence.score,
    status: "ACTIVE",
    affectedAssets,
    timestamps: {
      marketMoveStartedAt: input.timestamps?.marketMoveStartedAt,
      anomalyDetectedAt: input.anomaly.detectedAt,
      alertCreatedAt: now,
      ...input.timestamps,
    },
    performance: {
      priceAtAlert: input.anomaly.currentPrice,
      snapshots: [],
    },
  };
}

export function alertSeverityLabel(severity: AlertSeverity): string {
  return severity;
}

export function confidenceLabel(level: ConfidenceLevel): string {
  return level;
}
