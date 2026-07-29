import type {
  AIFact,
  AIMarketRegime,
  AnomalyEvent,
  AssetImpact,
  AssetPressure,
  BrentWTISpread,
  CrossAssetCorrelationResult,
  EnrichedMarketQuote,
  EvidenceReference,
  IntelligenceEventCluster,
  MarketEvent,
  OilCorrelationResult,
  ReactionPhase,
} from "@/lib/types/market";
import type { PipelineResult } from "@/lib/market-intelligence/engine/event-pipeline";
import { classifyReactionPhase } from "@/lib/market-intelligence/ai/reaction-phase";
import { calculateEventSignificance } from "@/lib/market-intelligence/ai/event-significance";
import { runContradictionCheck } from "@/lib/market-intelligence/ai/contradiction-check";
import { calculateConfidence } from "@/lib/market-intelligence/engine/confidence-engine";

export interface ScheduledEventHint {
  id: string;
  name: string;
  scheduledAt: string;
  relevance: string[];
}

export interface ScheduledEventProvider {
  getUpcomingEvents(windowMinutes: number): Promise<ScheduledEventHint[]>;
}

export interface HistoricalEventSearch {
  findSimilarEvents(_query: {
    eventType: string;
    assets: string[];
  }): Promise<{ available: boolean; matches: unknown[] }>;
}

export class StubScheduledEventProvider implements ScheduledEventProvider {
  async getUpcomingEvents(): Promise<ScheduledEventHint[]> {
    return [];
  }
}

export class StubHistoricalEventSearch implements HistoricalEventSearch {
  async findSimilarEvents(): Promise<{ available: boolean; matches: unknown[] }> {
    return { available: false, matches: [] };
  }
}

export interface AIAnalysisContext {
  eventId: string;
  marketEvent?: MarketEvent | AnomalyEvent;
  intelligenceCluster?: IntelligenceEventCluster;
  quotes: EnrichedMarketQuote[];
  oilCorrelation?: OilCorrelationResult | null;
  crossAsset?: CrossAssetCorrelationResult | null;
  brentWtiSpread?: BrentWTISpread | null;
  systemConfidence: ReturnType<typeof calculateConfidence>;
  facts: AIFact[];
  evidence: EvidenceReference[];
  reactionPhase: ReactionPhase;
  marketAlreadyMoved: boolean;
  eventSignificance: ReturnType<typeof calculateEventSignificance>;
  contradictionFlags: string[];
  scheduledEvents: ScheduledEventHint[];
  historicalComparisonAvailable: boolean;
  rolloverDetected: boolean;
  feedStale: boolean;
  feedDelayed: boolean;
  wtiBrentDifferential?: { wtiChange: number; brentChange: number; spreadChange: number };
  suggestedRegime: AIMarketRegime;
  assetImpacts: AssetImpact[];
}

export class AIContextBuilder {
  constructor(
    private readonly scheduledProvider: ScheduledEventProvider = new StubScheduledEventProvider(),
    private readonly historicalSearch: HistoricalEventSearch = new StubHistoricalEventSearch(),
  ) {}

  async build(input: {
    cluster: IntelligenceEventCluster;
    pipeline: PipelineResult;
    marketEvent?: MarketEvent;
  }): Promise<AIAnalysisContext> {
    const { cluster, pipeline, marketEvent } = input;
    const anomaly = marketEvent ? toAnomaly(marketEvent) : undefined;

    const systemConfidence = calculateConfidence({
      anomaly,
      oilCorrelation: pipeline.oilCorrelation,
      crossAsset: pipeline.crossAssetEvents[0] ?? null,
      sourceStatus: cluster.verification.status,
      sourceCount: cluster.independentSourceCount,
      hasOfficialSource: cluster.verification.hasOfficialSource,
      hasConflictingSources: cluster.verification.status === "CONFLICTING",
    });

    const facts = buildFacts(cluster, pipeline, marketEvent);
    const evidence = buildEvidence(cluster, marketEvent);
    const wti = pipeline.quotes.find((q) => q.symbol === "WTI");
    const brent = pipeline.quotes.find((q) => q.symbol === "BRENT");

    const reactionPhase = classifyReactionPhase({
      windowReturns: marketEvent ? getReturnsForSymbol(pipeline.quotes, marketEvent.symbol) : undefined,
      wtiReturns: wti?.returns,
      brentReturns: brent?.returns,
      hasNews: cluster.sources.length > 0,
      verification: cluster.verification.status,
    });

    const marketAlreadyMoved =
      Math.abs(marketEvent?.priceChangePercent ?? 0) >= 1.0 ||
      Math.abs(wti?.returns.m10 ?? 0) >= 1.0 ||
      Math.abs(brent?.returns.m10 ?? 0) >= 1.0;

    const eventSignificance = calculateEventSignificance({
      marketEvent,
      cluster,
      oilCorrelation: pipeline.oilCorrelation,
      crossAsset: pipeline.crossAssetEvents[0] ?? null,
    });

    const contradictionFlags = runContradictionCheck({
      cluster,
      marketEvent,
      oilCorrelation: pipeline.oilCorrelation,
      leadLag: cluster.leadLag,
      quotes: pipeline.quotes,
    });

    const scheduledEvents = await this.scheduledProvider.getUpcomingEvents(120);
    const historical = await this.historicalSearch.findSimilarEvents({
      eventType: cluster.eventType,
      assets: cluster.potentiallyAffectedMarkets,
    });

    const feedStale = pipeline.quotes.some((q) => q.isStale || q.dataAvailability === "STALE");
    const feedDelayed = pipeline.quotes.some((q) => q.dataAvailability === "DELAYED");

    let wtiBrentDifferential: AIAnalysisContext["wtiBrentDifferential"];
    if (wti && brent) {
      wtiBrentDifferential = {
        wtiChange: wti.returns.m10 ?? wti.percentageChange,
        brentChange: brent.returns.m10 ?? brent.percentageChange,
        spreadChange: pipeline.brentWtiSpread?.spreadChange ?? 0,
      };
    }

    return {
      eventId: cluster.id,
      marketEvent,
      intelligenceCluster: cluster,
      quotes: pipeline.quotes,
      oilCorrelation: pipeline.oilCorrelation,
      crossAsset: pipeline.crossAssetEvents[0] ?? null,
      brentWtiSpread: pipeline.brentWtiSpread,
      systemConfidence,
      facts,
      evidence,
      reactionPhase,
      marketAlreadyMoved,
      eventSignificance,
      contradictionFlags,
      scheduledEvents,
      historicalComparisonAvailable: historical.available,
      rolloverDetected: pipeline.quotes.some((q) => q.contract?.rolloverDetected),
      feedStale,
      feedDelayed,
      wtiBrentDifferential,
      suggestedRegime: inferRegime(cluster, pipeline, marketEvent),
      assetImpacts: buildAssetImpacts(pipeline, cluster),
    };
  }

  toPromptContext(context: AIAnalysisContext): string {
    return JSON.stringify(
      {
        facts: context.facts.map((f) => ({ id: f.id, statement: f.statement })),
        systemConfidence: {
          score: context.systemConfidence.score,
          level: context.systemConfidence.level,
          factors: context.systemConfidence.factors.map((f) => f.label),
        },
        verification: context.intelligenceCluster?.verification.status,
        independentSources: context.intelligenceCluster?.independentSourceCount,
        reactionPhase: context.reactionPhase,
        marketAlreadyMoved: context.marketAlreadyMoved,
        eventSignificance: context.eventSignificance.level,
        contradictionFlags: context.contradictionFlags,
        rolloverDetected: context.rolloverDetected,
        feedStale: context.feedStale,
        wtiBrentDifferential: context.wtiBrentDifferential,
        spread: context.brentWtiSpread
          ? {
              current: context.brentWtiSpread.spread,
              change: context.brentWtiSpread.spreadChange,
            }
          : null,
        crossAsset: context.crossAsset?.movements?.map((m) => ({
          symbol: m.symbol,
          change: m.percentageChange,
        })),
        scheduledEvents: context.scheduledEvents,
        newsHeadlines: context.intelligenceCluster?.sources.map((s) => ({
          id: s.id,
          source: s.sourceName,
          headline: s.headline,
          official: s.isOfficial,
        })),
      },
      null,
      2,
    );
  }
}

function toAnomaly(event: MarketEvent): AnomalyEvent {
  return {
    id: event.id,
    assetId: event.assetId,
    asset: event.asset,
    symbol: event.symbol,
    direction: event.direction,
    percentageChange: event.priceChangePercent,
    absoluteChange: event.priceChange,
    windowMinutes: event.windowMinutes as AnomalyEvent["windowMinutes"],
    startPrice: event.startPrice,
    currentPrice: event.currentPrice,
    detectedAt: event.timestamp,
    severity: event.severity,
    eventType: event.eventType,
    status: event.status,
    description: event.description,
  };
}

function buildFacts(
  cluster: IntelligenceEventCluster,
  pipeline: PipelineResult,
  marketEvent?: MarketEvent,
): AIFact[] {
  const facts: AIFact[] = [];

  if (marketEvent) {
    facts.push({
      id: `fact-mkt-${marketEvent.id}`,
      statement: `${marketEvent.asset} ${marketEvent.priceChangePercent >= 0 ? "+" : ""}${marketEvent.priceChangePercent.toFixed(2)} % in ${marketEvent.windowMinutes} Minuten`,
      evidence: [{ type: "MARKET", id: marketEvent.id }],
    });
  }

  if (pipeline.oilCorrelation?.bothConfirmed) {
    facts.push({
      id: "fact-oil-confirm",
      statement: "WTI und Brent bestätigen gleichzeitige Richtungsbewegung",
      evidence: [{ type: "MARKET", id: "oil-correlation" }],
    });
  }

  for (const source of cluster.sources.slice(0, 5)) {
    facts.push({
      id: `fact-news-${source.id}`,
      statement: `${source.sourceName} berichtet: ${source.headline}`,
      evidence: [{ type: source.isOfficial ? "OFFICIAL" : "NEWS", id: source.id }],
    });
  }

  if (cluster.independentSourceCount === 0) {
    facts.push({
      id: "fact-no-news",
      statement: "Noch keine verifizierten News-Quellen verknüpft",
      evidence: [],
    });
  }

  if (cluster.verification.status === "CONFLICTING") {
    facts.push({
      id: "fact-conflict",
      statement: "Widersprüchliche Berichte erkannt",
      evidence: cluster.sources.map((s) => ({ type: "NEWS" as const, id: s.id })),
    });
  }

  return facts;
}

function buildEvidence(
  cluster: IntelligenceEventCluster,
  marketEvent?: MarketEvent,
): EvidenceReference[] {
  const refs: EvidenceReference[] = [];
  if (marketEvent) refs.push({ type: "MARKET", id: marketEvent.id, label: marketEvent.asset });
  for (const s of cluster.sources) {
    refs.push({
      type: s.isOfficial ? "OFFICIAL" : "NEWS",
      id: s.id,
      label: s.sourceName,
    });
  }
  return refs;
}

function getReturnsForSymbol(quotes: EnrichedMarketQuote[], symbol: string) {
  return quotes.find((q) => q.symbol === symbol)?.returns;
}

function inferRegime(
  cluster: IntelligenceEventCluster,
  pipeline: PipelineResult,
  marketEvent?: MarketEvent,
): AIMarketRegime {
  if (cluster.eventType.includes("OIL") || cluster.eventType.includes("ENERGY") || cluster.eventType.includes("STRAIT")) {
    return "ENERGY_SHOCK";
  }
  if (cluster.eventType.includes("MILITARY") || cluster.eventType.includes("SANCTIONS") || cluster.newsEventType === "GEOPOLITICAL") {
    return "GEOPOLITICAL_RISK";
  }
  if (pipeline.crossAssetEvents[0]?.possibleRegime === "RISK-OFF") return "RISK_OFF";
  if (pipeline.crossAssetEvents[0]?.possibleRegime === "RISK-ON") return "RISK_ON";
  if (cluster.eventType.includes("CENTRAL_BANK") || cluster.eventType.includes("INFLATION")) return "MACRO_EVENT";
  if (marketEvent?.symbol === "WTI" || marketEvent?.symbol === "BRENT") return "ENERGY_SHOCK";
  return "UNCERTAIN";
}

function buildAssetImpacts(
  pipeline: PipelineResult,
  cluster: IntelligenceEventCluster,
): AssetImpact[] {
  return cluster.potentiallyAffectedMarkets.map((asset) => {
    const quote = pipeline.quotes.find((q) => q.symbol === asset);
    const change = quote?.returns.m10 ?? quote?.percentageChange ?? 0;
    return {
      asset,
      relevance: cluster.marketRelevance[asset] ?? "POSSIBLE",
      pressure: toPressure(change),
      confidence: "MEDIUM",
      explanation: quote
        ? `${asset} ${change >= 0 ? "+" : ""}${change.toFixed(2)} % (10-Min-Fenster)`
        : "Kein Live-Kurs verfügbar",
    };
  });
}

function toPressure(change: number): AssetPressure {
  if (change >= 2) return "STRONG_BULLISH_PRESSURE";
  if (change >= 0.5) return "BULLISH_PRESSURE";
  if (change <= -2) return "STRONG_BEARISH_PRESSURE";
  if (change <= -0.5) return "BEARISH_PRESSURE";
  if (Math.abs(change) < 0.1) return "NEUTRAL";
  return "UNCERTAIN";
}

export const aiContextBuilder = new AIContextBuilder();
