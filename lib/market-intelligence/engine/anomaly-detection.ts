import { ANOMALY_DETECTION_RULES } from "@/lib/market-intelligence/config/detection-rules";
import { calculateWindowReturn, meetsThreshold } from "@/lib/market-intelligence/engine/returns-calculator";
import type { PriceHistoryBuffer } from "@/lib/market-intelligence/engine/price-history-buffer";
import type {
  AnomalyDetectionRule,
  AnomalyEvent,
  MarketEventType,
  PriceSnapshot,
} from "@/lib/types/market";

function toEventType(direction: "UP" | "DOWN"): MarketEventType {
  return direction === "UP" ? "UPSIDE_ANOMALY" : "DOWNSIDE_ANOMALY";
}

export function detectAnomalies(
  buffer: PriceHistoryBuffer,
  rules: AnomalyDetectionRule[] = ANOMALY_DETECTION_RULES,
  nowMs: number = Date.now(),
): AnomalyEvent[] {
  const events: AnomalyEvent[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    const snapshots = buffer.getSnapshots(rule.symbol);
    if (snapshots.length < 2) continue;

    const windowReturn = calculateWindowReturn(
      snapshots,
      rule.windowMinutes,
      nowMs,
    );
    if (!windowReturn) continue;

    const { percentageChange } = windowReturn;

    if (!meetsThreshold(percentageChange, rule.thresholdPercent, rule.direction)) {
      continue;
    }

    events.push({
      id: `anomaly-${rule.id}-${nowMs}`,
      assetId: rule.assetId,
      asset: rule.assetName,
      symbol: rule.symbol,
      direction: windowReturn.direction,
      percentageChange,
      absoluteChange: windowReturn.absoluteChange,
      windowMinutes: rule.windowMinutes,
      startPrice: windowReturn.startPrice,
      currentPrice: windowReturn.currentPrice,
      detectedAt: new Date(nowMs).toISOString(),
      severity: rule.severity,
      eventType: toEventType(windowReturn.direction),
      status: "ACTIVE",
      description: `${rule.assetName} ${percentageChange >= 0 ? "+" : ""}${percentageChange.toFixed(2)} % / ${rule.windowMinutes} Min.`,
    });
  }

  return events;
}

export function anomalyToMarketEvent(anomaly: AnomalyEvent) {
  return {
    ...anomaly,
    priceChange: anomaly.absoluteChange,
    priceChangePercent: anomaly.percentageChange,
    timestamp: anomaly.detectedAt,
    windowMinutes: anomaly.windowMinutes,
  };
}

export function generateMockSnapshots(
  symbol: string,
  assetId: string,
  basePrice: number,
  minuteChanges: number[],
  nowMs: number = Date.now(),
): PriceSnapshot[] {
  let price = basePrice;
  const snapshots: PriceSnapshot[] = [];

  for (let i = 0; i < minuteChanges.length; i++) {
    price += minuteChanges[i];
    const minutesFromEnd = minuteChanges.length - 1 - i;
    snapshots.push({
      assetId,
      symbol,
      price,
      timestamp: new Date(nowMs - minutesFromEnd * 60_000).toISOString(),
    });
  }

  return snapshots;
}
