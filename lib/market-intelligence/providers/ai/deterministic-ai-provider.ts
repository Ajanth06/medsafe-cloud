import { createHash } from "node:crypto";
import { AI_PROMPT_VERSION, scoreToExtendedConfidence } from "@/lib/market-intelligence/config/ai-config";
import type { AIProvider, AIProviderAnalyzeInput, AIProviderAnalyzeResult } from "@/lib/market-intelligence/providers/ai/ai-provider-types";
import type { AIAnalysisResult, WatchItem } from "@/lib/types/market";

/**
 * Deterministic fallback — no LLM. Used when AI unavailable or as DEMO mode.
 */
export class DeterministicAIProvider implements AIProvider {
  readonly id = "deterministic";
  readonly name = "AARYX Deterministic Analysis";
  readonly mode = "FALLBACK" as const;

  async analyzeMarketEvent(input: AIProviderAnalyzeInput): Promise<AIProviderAnalyzeResult> {
    return { analysis: this.buildAnalysis(input), rawValid: true };
  }

  async analyzeIntelligenceEvent(input: AIProviderAnalyzeInput): Promise<AIProviderAnalyzeResult> {
    return this.analyzeMarketEvent(input);
  }

  async updateExistingAnalysis(input: AIProviderAnalyzeInput): Promise<AIProviderAnalyzeResult> {
    const result = await this.analyzeMarketEvent(input);
    if (input.previousAnalysis) {
      result.analysis.changeSummary = {
        whatChanged: [`Verification: ${input.cluster.verification.status}`, `${input.cluster.sources.length} sources now linked`],
        confidenceDelta: result.analysis.confidenceScore - input.previousAnalysis.confidenceScore,
        previousConfidence: input.previousAnalysis.confidence,
        newConfidence: result.analysis.confidence,
        updatedAssessment: result.analysis.summary,
        newRisks: result.analysis.keyRisks.filter((r) => !input.previousAnalysis!.keyRisks.includes(r)),
      };
      result.analysis.version = input.previousAnalysis.version + 1;
    }
    return result;
  }

  async summarizeConflictingReports(input: AIProviderAnalyzeInput): Promise<{ summary: string }> {
    return {
      summary: `Conflicting reports detected across ${input.cluster.sources.length} sources. ${input.context.contradictionFlags.join(". ")}`,
    };
  }

  async classifyEvent(input: AIProviderAnalyzeInput): Promise<{ eventType: string; significance: string }> {
    return {
      eventType: input.cluster.eventType,
      significance: input.context.eventSignificance.level,
    };
  }

  private buildAnalysis(input: AIProviderAnalyzeInput): AIAnalysisResult {
    const { context, cluster, marketEvent, previousAnalysis, trigger } = input;
    const score = context.systemConfidence.score;
    const confidence = scoreToExtendedConfidence(score);
    const now = new Date().toISOString();
    const version = previousAnalysis ? previousAnalysis.version + 1 : 1;

    const causeConfirmed = cluster.verification.status === "OFFICIAL_CONFIRMATION" || cluster.verification.status === "CONFIRMED";
    const causeDescription = causeConfirmed
      ? `Reports suggest: ${cluster.headline}`
      : cluster.independentSourceCount > 0
        ? `Possible link to: ${cluster.headline} — NOT CONFIRMED`
        : "CAUSE NOT YET CONFIRMED — market move without verified news.";

    const alternatives: string[] = [];
    if (context.rolloverDetected) alternatives.push("Futures contract rollover");
    if (context.scheduledEvents.length > 0) alternatives.push("Scheduled macro event overlap");
    if (context.feedStale) alternatives.push("Stale feed artifact");
    if (alternatives.length === 0 && !causeConfirmed) {
      alternatives.push("Technical repositioning or liquidity-driven move");
    }

    const watchItems: WatchItem[] = buildWatchItems(cluster, context);

    const whyThisAlert = buildWhyThisAlert(context, cluster, marketEvent);

    return {
      id: `ai-${cluster.id}-v${version}`,
      eventId: cluster.id,
      version,
      summary: marketEvent
        ? `${marketEvent.asset} ${marketEvent.direction === "UP" ? "upside" : "downside"} anomaly${cluster.independentSourceCount > 0 ? " with linked news cluster" : ""}.`
        : cluster.headline,
      eventType: cluster.eventType,
      marketRegime: context.suggestedRegime,
      possibleCause: {
        description: causeDescription,
        causalityStatus: causeConfirmed ? "LIKELY" : cluster.independentSourceCount >= 2 ? "POSSIBLE" : "UNKNOWN",
        supportingEvidence: context.evidence.filter((e) => e.type !== "MARKET"),
        contradictingEvidence: cluster.verification.status === "CONFLICTING" ? context.evidence : [],
      },
      alternativeExplanations: alternatives,
      affectedAssets: context.assetImpacts,
      impactAssessment: context.marketAlreadyMoved
        ? "Market reaction already advanced — initial information advantage may be partially priced in."
        : "Market reaction still developing or not yet confirmed.",
      confidence,
      confidenceScore: score,
      confidenceReasons: context.systemConfidence.factors.map((f) => f.label),
      uncertaintyReasons: context.contradictionFlags.length > 0
        ? context.contradictionFlags
        : !causeConfirmed
          ? ["Cause not confirmed by multiple sources"]
          : [],
      keyRisks: [
        context.contradictionFlags.includes("Conflicting news sources")
          ? "Conflicting narratives may increase volatility"
          : "Further confirmation may shift assessment",
        context.marketAlreadyMoved ? "Move may partially reflect available information" : "Delayed reaction possible",
      ],
      whatToWatchNext: watchItems,
      marketAlreadyMoved: context.marketAlreadyMoved,
      moveAssessment: marketEvent
        ? `${marketEvent.asset} already moved ${marketEvent.priceChangePercent >= 0 ? "+" : ""}${marketEvent.priceChangePercent.toFixed(2)}% since detection.`
        : "No significant market move detected yet.",
      reactionPhase: context.reactionPhase,
      sourceAssessment: `${cluster.verification.status} — ${cluster.independentSourceCount} independent source(s)${cluster.officialSourceCount > 0 ? `, ${cluster.officialSourceCount} official` : ""}.`,
      eventSignificance: context.eventSignificance.level,
      facts: context.facts,
      interpretations: [
        context.suggestedRegime === "GEOPOLITICAL_RISK" || context.suggestedRegime === "ENERGY_SHOCK"
          ? "Price action may reflect supply-risk repricing if confirmed."
          : "Move may reflect broader macro or technical factors.",
      ],
      evidence: context.evidence,
      generatedAt: now,
      model: "deterministic-v1",
      promptVersion: AI_PROMPT_VERSION,
      mode: trigger === "MANUAL" ? "DEMO" : "FALLBACK",
      whyThisAlert,
      disclaimer: "Market intelligence only — not financial advice. No BUY/SELL signals.",
      metrics: {
        aiJobCreatedAt: now,
        aiCompletedAt: now,
        analysisLatencyMs: 0,
        inputContextHash: hashContext(context),
      },
    };
  }
}

function buildWatchItems(
  cluster: import("@/lib/types/market").IntelligenceEventCluster,
  context: import("@/lib/market-intelligence/ai/ai-context-builder").AIAnalysisContext,
): WatchItem[] {
  const items: WatchItem[] = [];

  if (!cluster.verification.hasOfficialSource) {
    items.push({
      type: "OFFICIAL_CONFIRMATION",
      description: "Official government or energy authority statement",
      priority: "HIGH",
      resolved: false,
    });
  }

  if (cluster.potentiallyAffectedMarkets.includes("WTI")) {
    items.push({
      type: "SECONDARY_MARKET_CONFIRMATION",
      description: "WTI follow-through above recent range",
      relatedAsset: "WTI",
      priority: "MEDIUM",
      resolved: false,
    });
  }

  if (cluster.potentiallyAffectedMarkets.includes("BRENT")) {
    items.push({
      type: "SECONDARY_MARKET_CONFIRMATION",
      description: "Brent confirmation relative to WTI",
      relatedAsset: "BRENT",
      priority: "MEDIUM",
      resolved: false,
    });
  }

  if (context.wtiBrentDifferential && Math.abs(context.wtiBrentDifferential.brentChange - context.wtiBrentDifferential.wtiChange) > 1) {
    items.push({
      type: "SUPPLY_DISRUPTION",
      description: "Brent-WTI differential widening — possible seaborne supply sensitivity",
      relatedAsset: "BRENT",
      priority: "HIGH",
      resolved: false,
    });
  }

  if (cluster.affectedRegion?.includes("Middle East")) {
    items.push({
      type: "SUPPLY_DISRUPTION",
      description: "Strait of Hormuz / Red Sea shipping status",
      relatedEntity: "Strait of Hormuz",
      priority: "HIGH",
      resolved: false,
    });
  }

  return items.length > 0 ? items : [{
    type: "NEWS_CONFIRMATION",
    description: "Additional independent source confirmation",
    priority: "MEDIUM",
    resolved: false,
  }];
}

function buildWhyThisAlert(
  context: import("@/lib/market-intelligence/ai/ai-context-builder").AIAnalysisContext,
  cluster: import("@/lib/types/market").IntelligenceEventCluster,
  marketEvent?: import("@/lib/types/market").MarketEvent,
): string[] {
  const reasons: string[] = [];
  if (marketEvent) reasons.push(`${marketEvent.asset} exceeded anomaly threshold (${marketEvent.priceChangePercent.toFixed(2)}%)`);
  if (context.oilCorrelation?.bothConfirmed) reasons.push("Brent confirmed WTI directional move");
  if (cluster.independentSourceCount >= 2) reasons.push(`${cluster.independentSourceCount} independent reports detected`);
  if (cluster.verification.hasOfficialSource) reasons.push("Official source confirmation present");
  if (context.eventSignificance.level === "HIGH" || context.eventSignificance.level === "SYSTEMIC") {
    reasons.push(`Event significance classified ${context.eventSignificance.level}`);
  }
  return reasons;
}

function hashContext(context: import("@/lib/market-intelligence/ai/ai-context-builder").AIAnalysisContext): string {
  return createHash("sha256").update(JSON.stringify(context.facts)).digest("hex").slice(0, 16);
}

export class DemoAIProvider implements AIProvider {
  readonly id = "demo";
  readonly name = "AARYX Demo AI";
  readonly mode = "DEMO" as const;

  private readonly inner = new DeterministicAIProvider();

  async analyzeMarketEvent(input: AIProviderAnalyzeInput) {
    const result = await this.inner.analyzeMarketEvent(input);
    return { ...result, analysis: { ...result.analysis, mode: "DEMO" as const } };
  }

  async analyzeIntelligenceEvent(input: AIProviderAnalyzeInput) {
    return this.analyzeMarketEvent(input);
  }

  async updateExistingAnalysis(input: AIProviderAnalyzeInput) {
    const result = await this.inner.updateExistingAnalysis(input);
    return { ...result, analysis: { ...result.analysis, mode: "DEMO" as const } };
  }

  summarizeConflictingReports(input: AIProviderAnalyzeInput) {
    return this.inner.summarizeConflictingReports(input);
  }

  classifyEvent(input: AIProviderAnalyzeInput) {
    return this.inner.classifyEvent(input);
  }
}
