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
            ? "BEARISH"
            : "NEUTRAL",
    })),
    confidence: event.severity === "CRITICAL" ? "HIGH" : "MEDIUM",
    potentialCause: isGeopolitical
      ? "Geopolitische Eskalation und steigendes Versorgungsrisiko für Energie."
      : "Makrounsicherheit und wechselnde Risikostimmung an den globalen Märkten.",
    keyRisk: isGeopolitical
      ? "Weitere Eskalation könnte die geopolitische Risikoprämie erhöhen."
      : "Verzögerte Bestätigung kann die Volatilität korrelierter Assets verstärken.",
    disclaimer:
      "Nur Demo-Einschätzung — keine Anlageberatung und keine Live-Handelsempfehlung.",
  };
}
