import { ACTIVE_MARKET_SYMBOLS } from "@/lib/market-intelligence/config/assets";
import type {
  DeliveredAlert,
  IntelligenceAlert,
  MarketAlert,
  MarketEvent,
} from "@/lib/types/market";

const OIL = new Set<string>(ACTIVE_MARKET_SYMBOLS);

const NON_OIL_HINT =
  /\b(nasdaq|ndx|s&p|spx|dax|bitcoin|btc|gold|eur\/?usd|eurusd)\b/i;

/** True when alert is about WTI/Brent (oil terminal scope). */
export function isOilScopedAlert(
  alert: Pick<IntelligenceAlert, "title" | "affectedAssets"> | DeliveredAlert | MarketAlert,
): boolean {
  if ("symbol" in alert && typeof alert.symbol === "string") {
    return OIL.has(alert.symbol);
  }

  const assets =
    "affectedAssets" in alert && Array.isArray(alert.affectedAssets)
      ? alert.affectedAssets
      : [];

  if (assets.some((a) => OIL.has(a.symbol))) return true;

  const title = "title" in alert ? alert.title : "";
  if (NON_OIL_HINT.test(title)) return false;

  // No assets + no non-oil title → keep only if explicitly oil-worded
  if (assets.length === 0) {
    return /\b(wti|brent|öl|oil|crude)\b/i.test(title);
  }

  return false;
}

export function filterOilIntelligenceAlerts(
  alerts: IntelligenceAlert[],
): IntelligenceAlert[] {
  return alerts.filter(isOilScopedAlert);
}

export function filterOilDeliveredAlerts(
  alerts: DeliveredAlert[],
): DeliveredAlert[] {
  return alerts.filter(isOilScopedAlert);
}

export function filterOilMarketAlerts(alerts: MarketAlert[]): MarketAlert[] {
  return alerts.filter(isOilScopedAlert);
}

export function filterOilMarketEvents(events: MarketEvent[]): MarketEvent[] {
  return events.filter((e) => OIL.has(e.symbol));
}
