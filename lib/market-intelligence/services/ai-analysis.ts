import type { AIAnalysis, NewsEvent } from "@/lib/types/market";

/**
 * AI analysis service abstraction.
 * Phase 2: server-side LLM calls with validated market context.
 */
export interface AIAnalysisProvider {
  generateAssessment(event: NewsEvent): Promise<AIAnalysis>;
}

export function buildDemoAnalysis(event: NewsEvent): AIAnalysis {
  const isGeopolitical = event.eventType === "GEOPOLITICAL";

  return {
    marketRegime: isGeopolitical ? "RISK-OFF" : "NEUTRAL",
    assessments: event.affectedMarkets.map((market) => ({
      asset: market.name,
      sentiment:
        market.changePercent > 0
          ? "BULLISH"
          : market.changePercent < -0.5
            ? "BEARISH / WATCH"
            : "BEARISH",
    })),
    confidence: event.severity === "CRITICAL" ? "HIGH" : "MEDIUM",
    potentialCause: isGeopolitical
      ? "Geopolitical escalation and increasing energy supply risk."
      : "Macro uncertainty and shifting risk sentiment across global markets.",
    keyRisk: isGeopolitical
      ? "Further escalation could increase the geopolitical risk premium."
      : "Delayed confirmation may amplify volatility in correlated assets.",
    disclaimer:
      "Demo assessment only — not financial advice or a live trading recommendation.",
  };
}
