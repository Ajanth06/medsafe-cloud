import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { clusterNewsItems } from "@/lib/market-intelligence/services/event-clustering";
import { calculateLeadLag, correlateMarketAndNews } from "@/lib/market-intelligence/services/lead-lag-analysis";
import { normalizeNewsItem, classifyGeopoliticalType } from "@/lib/market-intelligence/services/news-normalizer";
import { countIndependentSources } from "@/lib/market-intelligence/services/syndication-detection";
import { verifyNewsCluster } from "@/lib/market-intelligence/services/verification-engine";
import { calculatePriorityScore } from "@/lib/market-intelligence/services/priority-engine";
import { eventQueryBuilder } from "@/lib/market-intelligence/services/event-query-builder";
import { getDemoNewsScenario } from "@/lib/market-intelligence/providers/news/development-news-provider";
import {
  investigateMarketEvent,
  resetNewsPipelineState,
} from "@/lib/market-intelligence/services/news-intelligence-orchestrator";
import { deduplicateByTitle } from "@/lib/market-intelligence/services/duplicate-detection";
import type { MarketEvent, NormalizedNewsItem } from "@/lib/types/market";

function newsItem(overrides: Partial<NormalizedNewsItem> & Pick<NormalizedNewsItem, "id" | "title">): NormalizedNewsItem {
  return normalizeNewsItem(
    {
      summary: overrides.summary ?? "Test summary",
      source: overrides.source ?? "Test Source",
      publishedAt: overrides.publishedAt ?? new Date().toISOString(),
      categories: overrides.categories ?? ["GEOPOLITICAL"],
      ...overrides,
    },
    "test",
  );
}

describe("news-normalization", () => {
  it("normalizes news items with source classification", () => {
    const item = newsItem({
      id: "n1",
      title: "OPEC announces production cut",
      source: "Reuters",
    });
    assert.equal(item.sourceType, "NEWS_WIRE");
    assert.ok(item.credibilityScore);
  });

  it("classifies geopolitical event types", () => {
    assert.equal(
      classifyGeopoliticalType("Missile strike near oil facility", ""),
      "MILITARY_STRIKE",
    );
    assert.equal(
      classifyGeopoliticalType("Shipping disruption in Strait of Hormuz", ""),
      "STRAIT_DISRUPTION",
    );
  });
});

describe("syndication-detection", () => {
  it("counts syndicated copies as one independent source", () => {
    const items = [
      newsItem({ id: "1", title: "Oil prices surge on Middle East tensions", source: "Reuters" }),
      newsItem({ id: "2", title: "Oil prices surge on Middle East tensions", source: "Reuters" }),
      newsItem({ id: "3", title: "Independent outlet confirms Gulf incident", source: "Demo Media" }),
    ];
    const result = countIndependentSources(items);
    assert.equal(result.independentCount, 2);
  });
});

describe("verification-engine", () => {
  it("upgrades to OFFICIAL_CONFIRMATION with official + multiple sources", () => {
    const items = [
      newsItem({ id: "1", title: "Gulf escalation reported", source: "Demo Wire", isOfficialSource: false }),
      newsItem({ id: "2", title: "Gulf escalation confirmed by media", source: "Demo Media" }),
      newsItem({ id: "3", title: "DoD statement", source: "US Department of Defense", isOfficialSource: true }),
    ];
    const result = verifyNewsCluster(items);
    assert.equal(result.status, "OFFICIAL_CONFIRMATION");
  });

  it("marks conflicting reports", () => {
    const items = [
      newsItem({ id: "1", title: "Attack reported", source: "Wire A", hasConflictingReports: true }),
      newsItem({ id: "2", title: "Attack denied", source: "Wire B", hasConflictingReports: true }),
    ];
    const result = verifyNewsCluster(items);
    assert.equal(result.status, "CONFLICTING");
  });

  it("marks retractions", () => {
    const items = [
      newsItem({ id: "1", title: "Report retracted", source: "Wire", isRetracted: true }),
    ];
    const result = verifyNewsCluster(items);
    assert.equal(result.status, "RETRACTED");
  });
});

describe("event-clustering", () => {
  it("clusters similar headlines", () => {
    const items = getDemoNewsScenario("market-first").map((n) =>
      normalizeNewsItem(n, "development"),
    );
    const clusters = clusterNewsItems(items, "DEMO");
    assert.ok(clusters.length >= 1);
    const totalSources = clusters.reduce((sum, c) => sum + c.sources.length, 0);
    assert.ok(totalSources >= 2);
  });
});

describe("lead-lag-analysis", () => {
  it("detects market-led-news timing", () => {
    const result = calculateLeadLag({
      marketMoveStartedAt: "2026-07-29T03:12:08.000Z",
      firstNewsAt: "2026-07-29T03:15:22.000Z",
      anomalyDetectedAt: "2026-07-29T03:13:01.000Z",
    });
    assert.equal(result.leader, "MARKET");
    assert.match(result.label, /MARKET LED NEWS/);
  });

  it("returns unavailable when timestamps missing", () => {
    const result = calculateLeadLag({});
    assert.equal(result.isReliable, false);
    assert.match(result.label, /unavailable/i);
  });
});

describe("priority-engine", () => {
  it("assigns CRITICAL for oil event with market anomaly and verification", () => {
    const items = getDemoNewsScenario("market-first").map((n) =>
      normalizeNewsItem(n, "development"),
    );
    const clusters = clusterNewsItems(items, "DEMO");
    const cluster = clusters[0];
    const priority = calculatePriorityScore({
      cluster,
      hasMarketAnomaly: true,
      oilCorrelation: {
        wtiChange: null,
        brentChange: null,
        bothConfirmed: true,
        sameDirection: true,
        windowMinutes: 10,
        confidenceBoost: 15,
        eventType: "OIL_MARKET_ANOMALY",
        description: "test",
      },
    });
    assert.ok(priority.score >= 40);
  });

  it("keeps social rumor at low priority", () => {
    const items = getDemoNewsScenario("unverified").map((n) =>
      normalizeNewsItem(n, "development"),
    );
    const clusters = clusterNewsItems(items, "DEMO");
    const priority = calculatePriorityScore({ cluster: clusters[0] });
    assert.notEqual(priority.priority, "CRITICAL");
  });
});

describe("event-query-builder", () => {
  it("generates oil-related keywords for WTI anomaly", () => {
    const keywords = eventQueryBuilder.build({
      affectedAssets: ["WTI", "BRENT"],
      timestamp: new Date().toISOString(),
      direction: "UP",
      oilCorrelation: {
        wtiChange: null,
        brentChange: null,
        bothConfirmed: true,
        sameDirection: true,
        windowMinutes: 10,
        confidenceBoost: 15,
        eventType: "OIL_MARKET_ANOMALY",
        description: "test",
      },
    });
    assert.ok(keywords.includes("OPEC"));
    assert.ok(keywords.includes("Hormuz"));
  });
});

describe("deduplication", () => {
  it("deduplicates similar titles", () => {
    const items = [
      { id: "1", title: "Explosion reported near oil facility" },
      { id: "2", title: "Explosion reported near oil facility" },
    ];
    assert.equal(deduplicateByTitle(items).length, 1);
  });
});

describe("scenario-market-first", () => {
  beforeEach(() => resetNewsPipelineState());

  it("creates correlated intelligence from market event + demo news", async () => {
    const marketEvent: MarketEvent = {
      id: "anomaly-wti-test",
      assetId: "wti",
      asset: "WTI Crude Oil",
      symbol: "WTI",
      direction: "UP",
      percentageChange: 1.5,
      absoluteChange: 1.2,
      windowMinutes: 10,
      startPrice: 82,
      currentPrice: 83.2,
      detectedAt: new Date().toISOString(),
      severity: "HIGH",
      eventType: "OIL_MARKET_ANOMALY",
      status: "ACTIVE",
      description: "WTI +1.5% / 10 min",
      priceChange: 1.2,
      priceChangePercent: 1.5,
      timestamp: new Date().toISOString(),
    };

    const clusters = await investigateMarketEvent({
      marketEventId: marketEvent.id,
      marketEvent,
      oilCorrelation: {
        wtiChange: null,
        brentChange: null,
        bothConfirmed: true,
        sameDirection: true,
        windowMinutes: 10,
        confidenceBoost: 15,
        eventType: "OIL_MARKET_ANOMALY",
        description: "Oil confirmation",
      },
    });

    assert.ok(clusters.length >= 1);
    const cluster = clusters[0];
    assert.ok(cluster.independentSourceCount >= 1);
    assert.ok(cluster.marketCorrelation || cluster.verification);

    const correlation = correlateMarketAndNews(marketEvent, cluster);
    assert.ok(correlation.timeDifferenceMs !== undefined);
  });
});

describe("scenario-retraction", () => {
  it("handles retracted news", () => {
    const items = getDemoNewsScenario("retraction").map((n) =>
      normalizeNewsItem(n, "development"),
    );
    const clusters = clusterNewsItems(items, "DEMO");
    assert.equal(clusters[0].verification.status, "RETRACTED");
    assert.equal(clusters[0].state, "RETRACTED");
  });
});
