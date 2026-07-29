import { calculateConfidence } from "@/lib/market-intelligence/engine/confidence-engine";
import type {
  AnomalyEvent,
  CrossAssetCorrelationResult,
  ExtendedAIAnalysis,
  MarketEventType,
  NewsEvent,
  NewsEventType,
  OilCorrelationResult,
} from "@/lib/types/market";

export interface AIAnalysisInput {
  marketEvent: AnomalyEvent;
  oilCorrelation?: OilCorrelationResult;
  crossAsset?: CrossAssetCorrelationResult | null;
  newsEvents?: NewsEvent[];
  sourceCount?: number;
  hasOfficialSource?: boolean;
}

export interface AIAnalysisService {
  analyze(input: AIAnalysisInput): Promise<ExtendedAIAnalysis>;
}

/** @deprecated Use ai-analysis-orchestrator — kept for backward compatibility */
export class MockAIAnalysisService implements AIAnalysisService {
  async analyze(input: AIAnalysisInput): Promise<ExtendedAIAnalysis> {
    return generateStructuredAnalysis(input);
  }
}

export function generateStructuredAnalysis(input: AIAnalysisInput): ExtendedAIAnalysis {
  const { marketEvent, oilCorrelation, crossAsset } = input;
  const isOil = marketEvent.symbol === "WTI" || marketEvent.symbol === "BRENT";
  const isGeopolitical = oilCorrelation?.bothConfirmed ?? false;

  const confidence = calculateConfidence({
    anomaly: marketEvent,
    oilCorrelation,
    crossAsset,
    sourceCount: input.sourceCount,
    hasOfficialSource: input.hasOfficialSource,
  });

  let marketRegime: "RISK-ON" | "RISK-OFF" | "NEUTRAL" = "NEUTRAL";
  if (crossAsset?.possibleRegime) {
    marketRegime = crossAsset.possibleRegime;
  } else if (isGeopolitical && marketEvent.direction === "UP") {
    marketRegime = "RISK-OFF";
  }

  const directionalImpact: Record<string, ExtendedAIAnalysis["directionalImpact"][string]> = {};

  if (isOil || oilCorrelation?.bothConfirmed) {
    directionalImpact["Oil"] = marketEvent.direction === "UP" ? "BULLISH PRESSURE" : "BEARISH PRESSURE";
  }

  const eventType: NewsEventType | MarketEventType = oilCorrelation?.bothConfirmed
    ? "OIL_MARKET_ANOMALY"
    : marketEvent.eventType;

  return {
    eventSummary: `${marketEvent.asset} moved ${marketEvent.percentageChange >= 0 ? "+" : ""}${marketEvent.percentageChange.toFixed(2)}% within ${marketEvent.windowMinutes} minutes.`,
    eventType,
    marketRegime,
    affectedAssets: [{
      symbol: marketEvent.symbol,
      name: marketEvent.asset,
      changePercent: marketEvent.percentageChange,
    }],
    directionalImpact,
    confidence: confidence.level,
    confidenceScore: confidence.score,
    possibleCause:
      input.newsEvents && input.newsEvents.length > 0
        ? `Reported: ${input.newsEvents[0].title} (${input.sourceCount ?? 1} source(s))`
        : "CAUSE NOT YET CONFIRMED",
    alternativeExplanation: "Alternative explanations not assessed in legacy analysis.",
    keyRisks: ["Conflicting reports could increase volatility."],
    whatToWatchNext: ["Official confirmation", "Cross-asset follow-through"],
    disclaimer: "Legacy analysis — not financial advice.",
  };
}

export function getAIAnalysisService(): AIAnalysisService {
  return new MockAIAnalysisService();
}

export {
  runAIAnalysisJob,
  shouldTriggerAI,
  toLegacyExtendedAnalysis,
} from "@/lib/market-intelligence/ai/ai-analysis-orchestrator";

export { createAIProvider } from "@/lib/market-intelligence/providers/ai/ai-provider-factory";
