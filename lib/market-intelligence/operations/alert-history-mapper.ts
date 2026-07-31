import type {
  DeliveredAlert,
  IntelligenceAlert,
  MarketAlert,
  MarketEvent,
  MarketEventType,
} from "@/lib/types/market";

function toEventSeverity(
  severity: IntelligenceAlert["severity"] | DeliveredAlert["severity"],
): MarketAlert["severity"] {
  if (severity === "INFO") return "LOW";
  return severity;
}

function guessEventType(
  alert: IntelligenceAlert | DeliveredAlert,
  marketEvents: MarketEvent[],
): MarketEventType {
  const symbol = alert.affectedAssets[0]?.symbol;
  const match = marketEvents.find((e) => e.symbol === symbol);
  if (match) return match.eventType;
  if (symbol === "WTI" || symbol === "BRENT") return "OIL_MARKET_ANOMALY";
  return "UNUSUAL_MOVEMENT";
}

/** Build AlertHistory rows from live intelligence / delivered alerts. */
export function buildLiveMarketAlerts(input: {
  intelligenceAlerts: IntelligenceAlert[];
  deliveredAlerts: DeliveredAlert[];
  marketEvents: MarketEvent[];
}): MarketAlert[] {
  const byId = new Map<string, MarketAlert>();

  for (const alert of input.intelligenceAlerts) {
    const primary = alert.affectedAssets[0];
    if (!primary) continue;
    byId.set(alert.id, {
      id: alert.id,
      triggeredAt:
        alert.timestamps.alertCreatedAt ??
        alert.timestamps.anomalyDetectedAt ??
        new Date().toISOString(),
      asset: primary.name,
      symbol: primary.symbol,
      alertPrice: alert.performance?.priceAtAlert ?? 0,
      severity: toEventSeverity(alert.severity),
      eventType: guessEventType(alert, input.marketEvents),
      aiAssessmentCorrect: null,
      performanceSnapshots: alert.performance?.snapshots ?? [],
    });
  }

  for (const alert of input.deliveredAlerts) {
    const primary = alert.affectedAssets[0];
    if (!primary) continue;
    const id = `hist-${alert.id}`;
    if (byId.has(alert.id) || byId.has(`alert-${alert.eventId}`)) continue;
    byId.set(id, {
      id,
      triggeredAt: alert.createdAt,
      asset: primary.name,
      symbol: primary.symbol,
      alertPrice: 0,
      severity: toEventSeverity(alert.severity),
      eventType: guessEventType(alert, input.marketEvents),
      aiAssessmentCorrect: null,
      performanceSnapshots: [],
    });
  }

  // Active market anomalies even before intelligence packaging
  for (const event of input.marketEvents) {
    if (
      event.severity !== "MEDIUM" &&
      event.severity !== "HIGH" &&
      event.severity !== "CRITICAL"
    ) {
      continue;
    }
    const id = `hist-evt-${event.id}`;
    const already = [...byId.values()].some((a) => a.symbol === event.symbol);
    if (already) continue;
    byId.set(id, {
      id,
      triggeredAt: event.detectedAt,
      asset: event.asset,
      symbol: event.symbol,
      alertPrice: event.currentPrice,
      severity: event.severity,
      eventType: event.eventType,
      aiAssessmentCorrect: null,
      performanceSnapshots: [],
    });
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime(),
  );
}
