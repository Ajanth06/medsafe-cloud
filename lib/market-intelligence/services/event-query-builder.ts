import { OIL_KEYWORD_SEEDS } from "@/lib/market-intelligence/config/news-sources";
import type { AnomalyEvent, MarketEvent, OilCorrelationResult } from "@/lib/types/market";

export interface EventQueryContext {
  affectedAssets: string[];
  timestamp: string;
  direction?: "UP" | "DOWN" | "BOTH";
  assetClass?: string;
  oilCorrelation?: OilCorrelationResult | null;
  marketEvent?: MarketEvent | AnomalyEvent;
}

/**
 * Builds dynamic search keywords from market context.
 */
export class EventQueryBuilder {
  build(context: EventQueryContext): string[] {
    const keywords = new Set<string>();

    for (const asset of context.affectedAssets) {
      keywords.add(asset);
    }

    const isOil =
      context.affectedAssets.includes("WTI") ||
      context.affectedAssets.includes("BRENT") ||
      context.oilCorrelation?.bothConfirmed;

    if (isOil) {
      for (const seed of OIL_KEYWORD_SEEDS) {
        keywords.add(seed);
      }
      keywords.add("Middle East");
      keywords.add("geopolitical");
    }

    if (context.direction === "UP" && isOil) {
      keywords.add("supply disruption");
      keywords.add("escalation");
    }

    if (context.affectedAssets.includes("GOLD")) {
      keywords.add("safe haven");
      keywords.add("risk-off");
    }

    if (context.affectedAssets.some((a) => ["NDX", "SPX", "DAX"].includes(a))) {
      keywords.add("equities");
      keywords.add("stocks");
    }

    if (context.affectedAssets.includes("EURUSD")) {
      keywords.add("forex");
      keywords.add("dollar");
    }

    return [...keywords].slice(0, 25);
  }
}

export const eventQueryBuilder = new EventQueryBuilder();
