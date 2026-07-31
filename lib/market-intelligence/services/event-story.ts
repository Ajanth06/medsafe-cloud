import { calculateLeadLag } from "@/lib/market-intelligence/services/lead-lag-analysis";
import {
  classifyFlashTopic,
  isIranUsText,
} from "@/lib/market-intelligence/config/oil-rss-feeds";
import type {
  EnrichedMarketQuote,
  FlashNewsTopic,
  IntelligenceEventCluster,
  MarketEvent,
  NewsEvent,
} from "@/lib/types/market";

export interface EventStoryView {
  oilSymbol: "WTI" | "BRENT";
  oilPrice: number;
  oilChangePercent: number;
  newsTitle: string;
  newsSummary: string;
  newsUrl?: string;
  newsTimestamp: string;
  newsAgeMinutes: number;
  leadLagLabel: string;
  leader: "NEWS" | "MARKET" | "UNKNOWN";
  flashTopic: FlashNewsTopic;
  aiSummary?: string;
  cause?: string;
  risk?: string;
  confidence?: string;
  oneLiner: string;
}

const MAX_NEWS_AGE_MIN = 8 * 60; // 8 hours — older = not "the" story
const MIN_MOVE_PCT = 0.35;

function oilQuotes(quotes: EnrichedMarketQuote[]) {
  return quotes.filter(
    (q): q is EnrichedMarketQuote & { symbol: "WTI" | "BRENT" } =>
      (q.symbol === "WTI" || q.symbol === "BRENT") && q.price > 0,
  );
}

function ageMinutes(iso: string): number {
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 60_000);
}

function isWeakAiText(text: string): boolean {
  return /nicht bestätigt|möglicher zusammenhang mit:|weitere bestätigung kann/i.test(
    text,
  );
}

function isStaleReportHeadline(title: string): boolean {
  // EIA year retrospectives etc. — not live market story
  return /\b202[0-4]\b|\bin 2025\b|\bjahresbericht\b|\bannual\b/i.test(title);
}

function scoreNewsCandidate(input: {
  title: string;
  summary: string;
  timestamp: string;
  language?: string;
  severity?: string;
  isFlash?: boolean;
  flashTopic?: FlashNewsTopic;
}): number {
  if (isStaleReportHeadline(input.title)) return -100;
  const age = ageMinutes(input.timestamp);
  if (age > MAX_NEWS_AGE_MIN) return -50;

  let score = 0;
  score += Math.max(0, 40 - age / 6); // fresher = better
  if (input.language === "de") score += 25;
  if (input.isFlash) score += 10;
  if (input.severity === "HIGH" || input.severity === "CRITICAL") score += 12;
  if (input.flashTopic === "iran") score += 18;
  if (input.flashTopic === "oil") score += 10;
  if (input.flashTopic === "opec") score += 8;
  if (isIranUsText(`${input.title} ${input.summary}`)) score += 20;
  return score;
}

/**
 * One clear story: oil move + best matching *fresh* headline.
 * Returns null when there is nothing useful to show.
 */
export function buildEventStory(input: {
  quotes: EnrichedMarketQuote[];
  breakingNews: NewsEvent[];
  marketEvents: MarketEvent[];
  intelligenceEvents: IntelligenceEventCluster[];
}): EventStoryView | null {
  const oils = oilQuotes(input.quotes);
  if (!oils.length) return null;

  const oil = [...oils].sort(
    (a, b) => Math.abs(b.percentageChange) - Math.abs(a.percentageChange),
  )[0];

  const newsCandidates = [
    ...input.breakingNews.map((n) => ({
      title: n.title,
      summary: n.summary,
      timestamp: n.timestamp,
      url: n.url,
      language: n.language,
      severity: n.severity,
      isFlash: n.isFlash,
      flashTopic: n.flashTopic,
      source: "flash" as const,
    })),
    ...input.intelligenceEvents.map((c) => ({
      title: c.headline,
      summary: c.summary,
      timestamp: c.firstReportAt,
      url: c.sources?.[0]?.url,
      language: undefined as string | undefined,
      severity: c.priority,
      isFlash: true,
      flashTopic: classifyFlashTopic(`${c.headline} ${c.summary}`),
      source: "cluster" as const,
      cluster: c,
    })),
  ]
    .map((n) => ({ ...n, score: scoreNewsCandidate(n) }))
    .filter((n) => n.score >= 20)
    .sort((a, b) => b.score - a.score);

  const best = newsCandidates[0];
  const move = Math.abs(oil.percentageChange);

  // Need either a meaningful move or a strong fresh headline
  if (!best && move < MIN_MOVE_PCT) return null;
  if (!best) return null;

  const newsAgeMinutes = Math.round(ageMinutes(best.timestamp));
  const oilAnomaly = input.marketEvents.find(
    (e) => e.asset === oil.symbol || e.symbol === oil.symbol,
  );

  const leadLag = calculateLeadLag({
    marketMoveStartedAt: oilAnomaly?.timestamp ?? null,
    firstNewsAt: best.timestamp,
    anomalyDetectedAt: oilAnomaly?.timestamp ?? null,
  });

  let leader = leadLag.leader;
  let leadLagLabel = leadLag.label;
  if (!oilAnomaly) {
    if (newsAgeMinutes <= 90 && move >= MIN_MOVE_PCT) {
      leader = "NEWS";
      leadLagLabel = `News vor ${newsAgeMinutes} Min. · passend zur Öl-Bewegung`;
    } else if (move >= MIN_MOVE_PCT) {
      leader = "MARKET";
      leadLagLabel = `Öl bewegt sich (${oil.percentageChange >= 0 ? "+" : ""}${oil.percentageChange.toFixed(2)}%) · aktuelle Meldung:`;
    } else {
      leader = "NEWS";
      leadLagLabel = `Aktuelle Meldung · Öl relativ ruhig (${oil.percentageChange >= 0 ? "+" : ""}${oil.percentageChange.toFixed(2)}%)`;
    }
  }

  const flashTopic =
    best.flashTopic ?? classifyFlashTopic(`${best.title} ${best.summary}`);

  const cluster =
    "cluster" in best && best.cluster
      ? (best.cluster as IntelligenceEventCluster)
      : input.intelligenceEvents.find((c) => c.headline === best.title);

  const ai = cluster?.aiAnalysisResult;
  const legacyCause = cluster?.aiAnalysis?.possibleCause;
  const rawCause = ai?.possibleCause?.description ?? legacyCause;
  const rawRisk = ai?.keyRisks?.[0] ?? cluster?.aiAnalysis?.keyRisks?.[0];
  const rawSummary = ai?.summary;

  const cause =
    rawCause && !isWeakAiText(rawCause) ? rawCause : undefined;
  const risk = rawRisk && !isWeakAiText(rawRisk) ? rawRisk : undefined;
  const aiSummary =
    rawSummary && !isWeakAiText(rawSummary) && rawSummary !== best.title
      ? rawSummary.slice(0, 220)
      : undefined;

  const sign = oil.percentageChange >= 0 ? "+" : "";
  const topicLabel =
    flashTopic === "iran"
      ? "Iran/Geopolitik"
      : flashTopic === "opec"
        ? "OPEC"
        : "Öl";

  const oneLiner = `${oil.symbol} ${sign}${oil.percentageChange.toFixed(2)}% · ${
    newsAgeMinutes < 60
      ? `News vor ${newsAgeMinutes} Min`
      : `News vor ${Math.round(newsAgeMinutes / 60)} Std`
  } · ${topicLabel}`;

  return {
    oilSymbol: oil.symbol,
    oilPrice: oil.price,
    oilChangePercent: oil.percentageChange,
    newsTitle: best.title,
    newsSummary: best.summary.slice(0, 200),
    newsUrl: best.url,
    newsTimestamp: best.timestamp,
    newsAgeMinutes,
    leadLagLabel,
    leader,
    flashTopic,
    aiSummary,
    cause,
    risk,
    confidence: ai?.confidence ?? cluster?.aiAnalysis?.confidence,
    oneLiner,
  };
}
