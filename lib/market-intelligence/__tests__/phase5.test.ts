import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { aiContextBuilder } from "@/lib/market-intelligence/ai/ai-context-builder";
import { validateAIResponse } from "@/lib/market-intelligence/ai/ai-analysis-schema";
import { classifyReactionPhase } from "@/lib/market-intelligence/ai/reaction-phase";
import { calculateEventSignificance, runContradictionCheck } from "@/lib/market-intelligence/ai/event-significance";
import {
  resetAIAnalysisState,
  runAIAnalysisJob,
  shouldTriggerAI,
} from "@/lib/market-intelligence/ai/ai-analysis-orchestrator";
import { DeterministicAIProvider } from "@/lib/market-intelligence/providers/ai/deterministic-ai-provider";
import { clusterNewsItems } from "@/lib/market-intelligence/services/event-clustering";
import { getDemoNewsScenario } from "@/lib/market-intelligence/providers/news/development-news-provider";
import { normalizeNewsItem } from "@/lib/market-intelligence/services/news-normalizer";
import { runEventPipeline, seedBufferFromHistory } from "@/lib/market-intelligence/engine/event-pipeline";
import { getPriceHistoryBuffer, resetPriceHistoryBuffer } from "@/lib/market-intelligence/engine/price-history-buffer";
import { MOCK_PRICE_HISTORY } from "@/lib/market-intelligence/mock-data";
import { MARKET_ASSETS } from "@/lib/market-intelligence/config/assets";
import type { IntelligenceEventCluster, MarketEvent } from "@/lib/types/market";

function seedBuffer() {
  resetPriceHistoryBuffer();
  const buffer = getPriceHistoryBuffer();
  const historyMap = new Map<string, { assetId: string; snapshots: { price: number; timestamp: string }[] }>();
  for (const [symbol, snapshots] of MOCK_PRICE_HISTORY) {
    const asset = MARKET_ASSETS.find((a) => a.symbol === symbol);
    if (asset) historyMap.set(symbol, { assetId: asset.assetId, snapshots });
  }
  seedBufferFromHistory(buffer, historyMap);
  return buffer;
}

function demoCluster(scenario: "market-first" | "unverified" | "retraction" = "market-first"): IntelligenceEventCluster {
  const items = getDemoNewsScenario(scenario).map((n) => normalizeNewsItem(n, "development"));
  return clusterNewsItems(items, "DEMO")[0];
}

describe("ai-analysis-schema", () => {
  it("validates structured AI response", () => {
    const result = validateAIResponse({
      summary: "Test event",
      marketRegime: "GEOPOLITICAL_RISK",
      possibleCauseDescription: "NOT CONFIRMED",
      causalityStatus: "UNKNOWN",
      alternativeExplanations: [],
      impactAssessment: "Developing",
      interpretations: ["May reflect supply risk"],
      sourceAssessment: "Single source",
      keyRisks: ["Uncertainty"],
      whatToWatchNext: [{
        type: "OFFICIAL_CONFIRMATION",
        description: "Official statement",
        priority: "HIGH",
        resolved: false,
      }],
      moveAssessment: "Limited move so far",
    });
    assert.equal(result.success, true);
  });

  it("rejects invalid AI response", () => {
    const result = validateAIResponse({ summary: "missing fields" });
    assert.equal(result.success, false);
  });
});

describe("reaction-phase", () => {
  it("detects active reaction for large move", () => {
    assert.equal(
      classifyReactionPhase({
        wtiReturns: { m10: 2.0 },
        hasNews: true,
        verification: "MULTIPLE_SOURCES",
      }),
      "ACTIVE_REACTION",
    );
  });

  it("detects pre-reaction when no news and flat market", () => {
    assert.equal(
      classifyReactionPhase({
        wtiReturns: { m10: 0.1 },
        hasNews: false,
        verification: "UNVERIFIED",
      }),
      "PRE_REACTION",
    );
  });
});

describe("ai-context-builder", () => {
  it("builds facts from market and news data", async () => {
    seedBuffer();
    const pipeline = runEventPipeline([], getPriceHistoryBuffer());
    const cluster = demoCluster();
    const context = await aiContextBuilder.build({ cluster, pipeline });
    assert.ok(context.facts.length > 0);
    assert.ok(context.evidence.length > 0);
    assert.ok(context.systemConfidence.score >= 0);
  });
});

describe("deterministic-ai-provider", () => {
  it("produces structured analysis without inventing sources", async () => {
    seedBuffer();
    const pipeline = runEventPipeline([], getPriceHistoryBuffer());
    const cluster = demoCluster();
    const context = await aiContextBuilder.build({ cluster, pipeline });
    const provider = new DeterministicAIProvider();
    const result = await provider.analyzeIntelligenceEvent({
      context,
      cluster,
      trigger: "INITIAL",
    });
    assert.ok(result.analysis.summary);
    assert.equal(result.analysis.mode, "FALLBACK");
    assert.ok(result.analysis.facts.length > 0);
    assert.ok(!result.analysis.possibleCause.description.includes("Pentagon confirmed") || cluster.officialSourceCount > 0);
  });
});

describe("shouldTriggerAI", () => {
  it("triggers on HIGH market event", () => {
    const cluster = demoCluster();
    const marketEvent: MarketEvent = {
      id: "t1",
      assetId: "wti",
      asset: "WTI",
      symbol: "WTI",
      direction: "UP",
      percentageChange: 1.5,
      absoluteChange: 1,
      windowMinutes: 10,
      startPrice: 80,
      currentPrice: 81.5,
      detectedAt: new Date().toISOString(),
      severity: "HIGH",
      eventType: "UPSIDE_ANOMALY",
      status: "ACTIVE",
      description: "test",
      priceChange: 1,
      priceChangePercent: 1.5,
      timestamp: new Date().toISOString(),
    };
    assert.equal(shouldTriggerAI({ cluster, marketEvent }), true);
  });

  it("does not trigger for low-confidence rumor", () => {
    const cluster = demoCluster("unverified");
    assert.equal(shouldTriggerAI({ cluster }), false);
  });
});

describe("scenario-market-first-ai", () => {
  beforeEach(() => resetAIAnalysisState());

  it("produces high confidence analysis with market already moved", async () => {
    seedBuffer();
    const pipeline = runEventPipeline([], getPriceHistoryBuffer());
    const cluster = demoCluster("market-first");
    const marketEvent: MarketEvent = {
      id: "scenario-mkt",
      assetId: "wti",
      asset: "WTI Crude Oil",
      symbol: "WTI",
      direction: "UP",
      percentageChange: 1.8,
      absoluteChange: 1.5,
      windowMinutes: 10,
      startPrice: 82,
      currentPrice: 83.5,
      detectedAt: new Date().toISOString(),
      severity: "HIGH",
      eventType: "OIL_MARKET_ANOMALY",
      status: "ACTIVE",
      description: "WTI +1.8% / 10 min",
      priceChange: 1.5,
      priceChangePercent: 1.8,
      timestamp: new Date().toISOString(),
    };

    const { cluster: updated } = await runAIAnalysisJob({
      cluster,
      pipeline,
      marketEvent,
      force: true,
    });

    assert.ok(updated.aiAnalysisResult);
    assert.ok(updated.aiAnalysisResult!.confidenceScore >= 40);
    assert.ok(updated.analysisVersions && updated.analysisVersions.length >= 1);
    assert.match(updated.aiAnalysisResult!.disclaimer, /not financial advice/i);
  });
});

describe("scenario-false-rumor", () => {
  it("keeps low significance for unverified social rumor", async () => {
    const cluster = demoCluster("unverified");
    const sig = calculateEventSignificance({ cluster });
    assert.ok(sig.level === "LOW" || sig.level === "NOISE");
  });
});

describe("scenario-conflicting", () => {
  it("flags conflicting reports", () => {
    const items = [
      normalizeNewsItem({
        id: "a",
        title: "Attack reported",
        summary: "Attack",
        source: "Wire A",
        publishedAt: new Date().toISOString(),
        categories: ["GEOPOLITICAL"],
        hasConflictingReports: true,
      }, "test"),
      normalizeNewsItem({
        id: "b",
        title: "Attack denied",
        summary: "Denied",
        source: "Wire B",
        publishedAt: new Date().toISOString(),
        categories: ["GEOPOLITICAL"],
        hasConflictingReports: true,
      }, "test"),
    ];
    const cluster = clusterNewsItems(items, "DEMO")[0];
    const flags = runContradictionCheck({ cluster, quotes: [] });
    assert.ok(flags.some((f) => f.includes("Conflicting")));
  });
});

describe("scenario-retraction-ai", () => {
  it("handles retracted news with reduced confidence context", () => {
    const cluster = demoCluster("retraction");
    const sig = calculateEventSignificance({ cluster });
    assert.equal(cluster.verification.status, "RETRACTED");
    assert.ok(sig.score < 50);
  });
});

describe("ai-debounce", () => {
  beforeEach(() => resetAIAnalysisState());

  it("debounces rapid repeated analysis requests", async () => {
    seedBuffer();
    const pipeline = runEventPipeline([], getPriceHistoryBuffer());
    const cluster = demoCluster();

    const first = await runAIAnalysisJob({ cluster, pipeline, force: true });
    const second = await runAIAnalysisJob({ cluster, pipeline, force: false });

    assert.equal(first.job.status, "COMPLETED");
    assert.equal(second.job.status, "CANCELLED");
  });
});
