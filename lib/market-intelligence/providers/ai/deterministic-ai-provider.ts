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
        whatChanged: [`Verifizierung: ${input.cluster.verification.status}`, `${input.cluster.sources.length} Quellen verknüpft`],
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
      summary: `Widersprüchliche Berichte über ${input.cluster.sources.length} Quellen. ${input.context.contradictionFlags.join(". ")}`,
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
      ? `Berichte deuten auf: ${cluster.headline}`
      : cluster.independentSourceCount > 0
        ? `Möglicher Zusammenhang mit: ${cluster.headline} — NICHT BESTÄTIGT`
        : "URSCHE NOCH NICHT BESTÄTIGT — Marktbewegung ohne verifizierte News.";

    const alternatives: string[] = [];
    if (context.rolloverDetected) alternatives.push("Futures-Kontrakt-Rollover");
    if (context.scheduledEvents.length > 0) alternatives.push("Überlappung mit geplantem Makro-Ereignis");
    if (context.feedStale) alternatives.push("Veralteter Feed-Artefakt");
    if (alternatives.length === 0 && !causeConfirmed) {
      alternatives.push("Technische Umschichtung oder liquiditätsgetriebene Bewegung");
    }

    const watchItems: WatchItem[] = buildWatchItems(cluster, context);

    const whyThisAlert = buildWhyThisAlert(context, cluster, marketEvent);

    return {
      id: `ai-${cluster.id}-v${version}`,
      eventId: cluster.id,
      version,
      summary: marketEvent
        ? `${marketEvent.asset} ${marketEvent.direction === "UP" ? "Aufwärts" : "Abwärts"}-Anomalie${cluster.independentSourceCount > 0 ? " mit verknüpftem News-Cluster" : ""}.`
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
        ? "Markt hat bereits reagiert — Informationsvorsprung möglicherweise teilweise eingepreist."
        : "Marktreaktion entwickelt sich noch oder ist nicht bestätigt.",
      confidence,
      confidenceScore: score,
      confidenceReasons: context.systemConfidence.factors.map((f) => f.label),
      uncertaintyReasons: context.contradictionFlags.length > 0
        ? context.contradictionFlags
        : !causeConfirmed
          ? ["Ursache nicht durch mehrere Quellen bestätigt"]
          : [],
      keyRisks: [
        context.contradictionFlags.includes("Conflicting news sources") ||
        context.contradictionFlags.some((f) => f.includes("Widersprüchlich"))
          ? "Widersprüchliche Narrative können Volatilität erhöhen"
          : "Weitere Bestätigung kann Einschätzung verschieben",
        context.marketAlreadyMoved ? "Bewegung spiegelt ggf. bereits bekannte Informationen wider" : "Verzögerte Reaktion möglich",
      ],
      whatToWatchNext: watchItems,
      marketAlreadyMoved: context.marketAlreadyMoved,
      moveAssessment: marketEvent
        ? `${marketEvent.asset} bereits ${marketEvent.priceChangePercent >= 0 ? "+" : ""}${marketEvent.priceChangePercent.toFixed(2)} % seit Erkennung bewegt.`
        : "Noch keine signifikante Marktbewegung erkannt.",
      reactionPhase: context.reactionPhase,
      sourceAssessment: `${cluster.verification.status} — ${cluster.independentSourceCount} unabhängige Quelle(n)${cluster.officialSourceCount > 0 ? `, ${cluster.officialSourceCount} offiziell` : ""}.`,
      eventSignificance: context.eventSignificance.level,
      facts: context.facts,
      interpretations: [
        context.suggestedRegime === "GEOPOLITICAL_RISK" || context.suggestedRegime === "ENERGY_SHOCK"
          ? "Kursbewegung kann bei Bestätigung Angebotsrisiko-Neubewertung widerspiegeln."
          : "Bewegung kann breitere Makro- oder technische Faktoren widerspiegeln.",
      ],
      evidence: context.evidence,
      generatedAt: now,
      model: "deterministic-v1",
      promptVersion: AI_PROMPT_VERSION,
      mode: trigger === "MANUAL" ? "DEMO" : "FALLBACK",
      whyThisAlert,
      disclaimer: "Nur Marktintelligenz — keine Anlageberatung. Keine Kauf-/Verkaufssignale.",
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
      description: "Offizielle Regierungs- oder Energiebehörden-Stellungnahme",
      priority: "HIGH",
      resolved: false,
    });
  }

  if (cluster.potentiallyAffectedMarkets.includes("WTI")) {
    items.push({
      type: "SECONDARY_MARKET_CONFIRMATION",
      description: "WTI-Follow-through über recente Range",
      relatedAsset: "WTI",
      priority: "MEDIUM",
      resolved: false,
    });
  }

  if (cluster.potentiallyAffectedMarkets.includes("BRENT")) {
    items.push({
      type: "SECONDARY_MARKET_CONFIRMATION",
      description: "Brent-Bestätigung relativ zu WTI",
      relatedAsset: "BRENT",
      priority: "MEDIUM",
      resolved: false,
    });
  }

  if (context.wtiBrentDifferential && Math.abs(context.wtiBrentDifferential.brentChange - context.wtiBrentDifferential.wtiChange) > 1) {
    items.push({
      type: "SUPPLY_DISRUPTION",
      description: "Brent-WTI-Spread weitet sich — mögliche See-Transport-Empfindlichkeit",
      relatedAsset: "BRENT",
      priority: "HIGH",
      resolved: false,
    });
  }

  if (cluster.affectedRegion?.includes("Middle East")) {
    items.push({
      type: "SUPPLY_DISRUPTION",
      description: "Status Straße von Hormus / Rotes Meer Schifffahrt",
      relatedEntity: "Strait of Hormuz",
      priority: "HIGH",
      resolved: false,
    });
  }

  return items.length > 0 ? items : [{
    type: "NEWS_CONFIRMATION",
    description: "Weitere unabhängige Quellen-Bestätigung",
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
  if (marketEvent) reasons.push(`${marketEvent.asset} überschritt Anomalie-Schwelle (${marketEvent.priceChangePercent.toFixed(2)} %)`);
  if (context.oilCorrelation?.bothConfirmed) reasons.push("Brent bestätigte WTI-Richtungsbewegung");
  if (cluster.independentSourceCount >= 2) reasons.push(`${cluster.independentSourceCount} unabhängige Berichte erkannt`);
  if (cluster.verification.hasOfficialSource) reasons.push("Offizielle Quellen-Bestätigung vorhanden");
  if (context.eventSignificance.level === "HIGH" || context.eventSignificance.level === "SYSTEMIC") {
    reasons.push(`Ereignisbedeutung eingestuft als ${context.eventSignificance.level}`);
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
