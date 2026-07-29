import { isOilRelevantEvent } from "@/lib/market-intelligence/services/news-normalizer";
import type {
  AlertSeverity,
  GeopoliticalEventType,
  IntelligenceEventCluster,
  MarketEvent,
  OilCorrelationResult,
  SourceVerificationStatus,
} from "@/lib/types/market";

export interface PriorityInput {
  cluster: IntelligenceEventCluster;
  marketEvents?: MarketEvent[];
  oilCorrelation?: OilCorrelationResult | null;
  hasMarketAnomaly?: boolean;
}

export function calculatePriorityScore(input: PriorityInput): {
  score: number;
  priority: AlertSeverity;
  auditTrail: { timestamp: string; reason: string; factor: string }[];
} {
  const { cluster } = input;
  const audit: { timestamp: string; reason: string; factor: string }[] = [];
  let score = 0;
  const now = new Date().toISOString();

  const verificationBoost: Record<SourceVerificationStatus, number> = {
    UNVERIFIED: 0,
    SINGLE_SOURCE: 10,
    MULTIPLE_SOURCES: 25,
    CONFIRMED: 35,
    OFFICIAL_SOURCE: 40,
    OFFICIAL_CONFIRMATION: 50,
    CONFLICTING: -20,
    RETRACTED: -50,
  };
  score += verificationBoost[cluster.verification.status] ?? 0;
  audit.push({ timestamp: now, reason: `Verification: ${cluster.verification.status}`, factor: "verification" });

  if (isOilRelevantEvent(cluster.eventType)) {
    score += 20;
    audit.push({ timestamp: now, reason: "Oil-relevant event type", factor: "oil_relevance" });
  }

  if (input.hasMarketAnomaly) {
    score += 25;
    audit.push({ timestamp: now, reason: "Market anomaly detected", factor: "market_anomaly" });
  }

  if (input.oilCorrelation?.bothConfirmed) {
    score += 20;
    audit.push({ timestamp: now, reason: "WTI + Brent confirmation", factor: "oil_correlation" });
  }

  const highRelevanceCount = Object.values(cluster.marketRelevance).filter((v) => v === "HIGH").length;
  score += highRelevanceCount * 8;

  if (cluster.officialSourceCount > 0) {
    score += 15;
    audit.push({ timestamp: now, reason: "Official source present", factor: "official_source" });
  }

  if (cluster.independentSourceCount >= 3) {
    score += 10;
  }

  if (cluster.verification.status === "CONFLICTING") score = Math.max(0, score - 30);
  if (cluster.verification.status === "RETRACTED") score = 0;

  score = Math.max(0, Math.min(100, score));

  let priority: AlertSeverity = "INFO";
  if (score >= 80) priority = "CRITICAL";
  else if (score >= 60) priority = "HIGH";
  else if (score >= 40) priority = "MEDIUM";
  else if (score >= 20) priority = "LOW";

  return { score, priority, auditTrail: audit };
}

export function isCriticalCombination(input: PriorityInput): boolean {
  const { score, priority } = calculatePriorityScore(input);
  return priority === "CRITICAL" && score >= 80;
}

export function oilEventHighRelevance(type: GeopoliticalEventType): boolean {
  return isOilRelevantEvent(type);
}
