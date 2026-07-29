import type {
  AnomalyEvent,
  CrossAssetCorrelationResult,
  IntelligenceAlert,
  LiveFeedEntry,
  OilCorrelationResult,
} from "@/lib/types/market";

interface BuildLiveFeedInput {
  anomalies: AnomalyEvent[];
  oilCorrelation: OilCorrelationResult;
  crossAsset: CrossAssetCorrelationResult | null;
  intelligenceAlerts: IntelligenceAlert[];
}

export function buildLiveFeed(input: BuildLiveFeedInput): LiveFeedEntry[] {
  const entries: LiveFeedEntry[] = [];

  for (const anomaly of input.anomalies) {
    entries.push({
      id: `feed-${anomaly.id}-detect`,
      timestamp: anomaly.detectedAt,
      title: `${anomaly.asset} ${anomaly.direction === "UP" ? "momentum increasing" : "selling pressure detected"}`,
      description: anomaly.description,
      category: "detection",
      severity: anomaly.severity,
    });

    entries.push({
      id: `feed-${anomaly.id}-threshold`,
      timestamp: new Date(new Date(anomaly.detectedAt).getTime() + 3000).toISOString(),
      title: `${anomaly.asset} ${anomaly.windowMinutes}m threshold exceeded`,
      description: `${anomaly.percentageChange >= 0 ? "+" : ""}${anomaly.percentageChange.toFixed(2)}% / ${anomaly.windowMinutes} min`,
      category: "threshold",
      severity: anomaly.severity,
    });
  }

  if (input.oilCorrelation.bothConfirmed) {
    entries.push({
      id: `feed-oil-confirm-${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: "Brent confirmation detected",
      description: input.oilCorrelation.description,
      category: "oil",
      severity: "HIGH",
    });

    entries.push({
      id: `feed-oil-anomaly-${Date.now()}`,
      timestamp: new Date(Date.now() + 4000).toISOString(),
      title: "Cross-oil anomaly created",
      description: "WTI and Brent moving in sync — confidence elevated.",
      category: "correlation",
      severity: "HIGH",
    });
  }

  if (input.crossAsset) {
    entries.push({
      id: `feed-cross-${input.crossAsset.id}`,
      timestamp: input.crossAsset.detectedAt,
      title: "Potential cross-market event",
      description: input.crossAsset.description,
      category: "correlation",
      severity: "HIGH",
    });
  }

  for (const alert of input.intelligenceAlerts) {
    entries.push({
      id: `feed-alert-${alert.id}`,
      timestamp: alert.timestamps.alertCreatedAt ?? new Date().toISOString(),
      title: "AI assessment completed",
      description: alert.title,
      category: "ai",
      severity: alert.severity,
    });
  }

  return entries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}
