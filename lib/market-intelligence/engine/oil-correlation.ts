import {
  OIL_CORRELATION_MIN_CHANGE,
  OIL_CORRELATION_WINDOW_MINUTES,
} from "@/lib/market-intelligence/config/constants";
import { CONFIDENCE_WEIGHTS } from "@/lib/market-intelligence/config/constants";
import type { PriceHistoryBuffer } from "@/lib/market-intelligence/engine/price-history-buffer";
import { calculateWindowReturn } from "@/lib/market-intelligence/engine/returns-calculator";
import type { OilCorrelationResult, TimeWindowMinutes } from "@/lib/types/market";

export function analyzeOilCorrelation(
  buffer: PriceHistoryBuffer,
  windowMinutes: TimeWindowMinutes = OIL_CORRELATION_WINDOW_MINUTES,
  nowMs: number = Date.now(),
): OilCorrelationResult {
  const wtiReturn = calculateWindowReturn(buffer.getSnapshots("WTI"), windowMinutes, nowMs);
  const brentReturn = calculateWindowReturn(buffer.getSnapshots("BRENT"), windowMinutes, nowMs);

  if (!wtiReturn || !brentReturn) {
    return {
      wtiChange: wtiReturn,
      brentChange: brentReturn,
      bothConfirmed: false,
      sameDirection: false,
      windowMinutes,
      confidenceBoost: 0,
      eventType: "NONE",
      description: "Unzureichende WTI/Brent-Daten für Korrelationsanalyse.",
    };
  }

  const wtiStrong = Math.abs(wtiReturn.percentageChange) >= OIL_CORRELATION_MIN_CHANGE;
  const brentStrong = Math.abs(brentReturn.percentageChange) >= OIL_CORRELATION_MIN_CHANGE;
  const sameDirection = wtiReturn.direction === brentReturn.direction;
  const bothConfirmed = wtiStrong && brentStrong && sameDirection;

  return {
    wtiChange: wtiReturn,
    brentChange: brentReturn,
    bothConfirmed,
    sameDirection,
    windowMinutes,
    confidenceBoost: bothConfirmed ? CONFIDENCE_WEIGHTS.wtiBrentSimultaneous : 0,
    eventType: bothConfirmed ? "OIL_MARKET_ANOMALY" : "NONE",
    description: bothConfirmed
      ? `WTI ${wtiReturn.percentageChange >= 0 ? "+" : ""}${wtiReturn.percentageChange.toFixed(1)} % & Brent ${brentReturn.percentageChange >= 0 ? "+" : ""}${brentReturn.percentageChange.toFixed(1)} % innerhalb ${windowMinutes} Min. — Ölmarkt-Anomalie bestätigt.`
      : `WTI/Brent bewegen sich unabhängig (WTI ${wtiReturn.percentageChange.toFixed(1)} %, Brent ${brentReturn.percentageChange.toFixed(1)} %).`,
  };
}
