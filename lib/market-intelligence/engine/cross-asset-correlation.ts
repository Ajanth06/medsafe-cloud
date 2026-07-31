import {
  CROSS_ASSET_MIN_MOVEMENTS,
  CROSS_ASSET_WINDOW_MINUTES,
  CONFIDENCE_WEIGHTS,
} from "@/lib/market-intelligence/config/constants";
import { MARKET_ASSETS } from "@/lib/market-intelligence/config/assets";
import type { PriceHistoryBuffer } from "@/lib/market-intelligence/engine/price-history-buffer";
import { calculateWindowReturn } from "@/lib/market-intelligence/engine/returns-calculator";
import type {
  CrossAssetCorrelationResult,
  CrossAssetMovement,
  TimeWindowMinutes,
} from "@/lib/types/market";

const CORRELATION_SYMBOLS = ["WTI", "BRENT"] as const;

const MIN_MOVEMENT_PERCENT = 0.5;

export function analyzeCrossAssetCorrelation(
  buffer: PriceHistoryBuffer,
  windowMinutes: TimeWindowMinutes = CROSS_ASSET_WINDOW_MINUTES,
  nowMs: number = Date.now(),
): CrossAssetCorrelationResult | null {
  const movements: CrossAssetMovement[] = [];

  for (const symbol of CORRELATION_SYMBOLS) {
    const snapshots = buffer.getSnapshots(symbol);
    const windowReturn = calculateWindowReturn(snapshots, windowMinutes, nowMs);
    if (!windowReturn) continue;

    if (Math.abs(windowReturn.percentageChange) < MIN_MOVEMENT_PERCENT) continue;

    const asset = MARKET_ASSETS.find((a) => a.symbol === symbol);
    movements.push({
      symbol,
      name: asset?.name ?? symbol,
      percentageChange: windowReturn.percentageChange,
      direction: windowReturn.direction,
      windowMinutes,
    });
  }

  if (movements.length < CROSS_ASSET_MIN_MOVEMENTS) {
    return null;
  }

  const upCount = movements.filter((m) => m.direction === "UP").length;
  const downCount = movements.filter((m) => m.direction === "DOWN").length;

  let possibleRegime: "RISK-ON" | "RISK-OFF" | "NEUTRAL" = "NEUTRAL";
  const hasOilUp = movements.some(
    (m) => (m.symbol === "WTI" || m.symbol === "BRENT") && m.direction === "UP",
  );
  const hasOilDown = movements.some(
    (m) => (m.symbol === "WTI" || m.symbol === "BRENT") && m.direction === "DOWN",
  );

  if (hasOilUp && downCount === 0) {
    possibleRegime = "RISK-ON";
  } else if (hasOilDown && upCount === 0) {
    possibleRegime = "RISK-OFF";
  } else if (upCount > downCount) {
    possibleRegime = "RISK-ON";
  } else if (downCount > upCount) {
    possibleRegime = "RISK-OFF";
  }

  const description = movements
    .map((m) => `${m.name} ${m.percentageChange >= 0 ? "↑" : "↓"} ${Math.abs(m.percentageChange).toFixed(1)}%`)
    .join(", ");

  return {
    id: `cross-${nowMs}`,
    detectedAt: new Date(nowMs).toISOString(),
    windowMinutes,
    movements,
    possibleRegime,
    eventType: "POTENTIAL_CROSS-MARKET_EVENT",
    description: `Mögliches Cross-Market-Ereignis: ${description}. Mögliches Regime: ${possibleRegime}.`,
    confidenceBoost: CONFIDENCE_WEIGHTS.crossAssetCorrelation,
  };
}
