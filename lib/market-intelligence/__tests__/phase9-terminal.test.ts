import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterDeliveredAlerts,
  filterIntelligenceEvents,
  filterMarketEvents,
} from "@/lib/market-intelligence/terminal/terminal-search";
import type {
  DeliveredAlert,
  IntelligenceEventCluster,
  MarketEvent,
} from "@/lib/types/market";

function baseCluster(overrides: Partial<IntelligenceEventCluster> = {}): IntelligenceEventCluster {
  return {
    id: "intel-1",
    eventType: "GEOPOLITICAL_CONFLICT",
    newsEventType: "GEOPOLITICAL",
    headline: "Middle East supply risk escalates",
    summary: "Multiple reports of pipeline disruption near Hormuz",
    state: "VERIFIED",
    verification: {
      status: "MULTIPLE_SOURCES",
      sourceCount: 3,
      sources: ["Reuters"],
      lastVerifiedAt: new Date().toISOString(),
    },
    sources: [],
    independentSourceCount: 3,
    officialSourceCount: 0,
    firstReportAt: new Date().toISOString(),
    latestUpdateAt: new Date().toISOString(),
    potentiallyAffectedMarkets: ["WTI", "BRENT"],
    marketRelevance: { WTI: "HIGH", BRENT: "HIGH" },
    priority: "CRITICAL",
    priorityScore: 90,
    causality: "UNKNOWN",
    timestamps: {},
    ...overrides,
  } as IntelligenceEventCluster;
}

describe("phase9 terminal search", () => {
  it("filters intelligence events by query", () => {
    const events = [
      baseCluster(),
      baseCluster({ id: "intel-2", headline: "Fed holds rates steady", summary: "No change to policy rate", eventType: "CENTRAL_BANK_DECISION", priority: "MEDIUM" }),
    ];
    const result = filterIntelligenceEvents(events, { query: "hormuz", scope: "all" });
    assert.equal(result.length, 1);
    assert.equal(result[0]?.id, "intel-1");
  });

  it("filters by minimum severity", () => {
    const events = [
      baseCluster({ priority: "CRITICAL" }),
      baseCluster({ id: "low", priority: "LOW", priorityScore: 20 }),
    ];
    const result = filterIntelligenceEvents(events, { query: "", scope: "all", minSeverity: "HIGH" });
    assert.equal(result.length, 1);
    assert.equal(result[0]?.priority, "CRITICAL");
  });

  it("filters market events and alerts by scope", () => {
    const marketEvents: MarketEvent[] = [
      {
        id: "m1",
        assetId: "wti",
        asset: "WTI",
        symbol: "WTI",
        direction: "UP",
        percentageChange: 2,
        absoluteChange: 1.5,
        windowMinutes: 10,
        startPrice: 80,
        currentPrice: 81.5,
        detectedAt: new Date().toISOString(),
        severity: "HIGH",
        eventType: "OIL_MARKET_ANOMALY",
        status: "ACTIVE",
        description: "WTI spike",
        priceChange: 1.5,
        priceChangePercent: 2,
        timestamp: new Date().toISOString(),
      },
    ];

    const alerts: DeliveredAlert[] = [
      {
        id: "a1",
        eventId: "e1",
        severity: "CRITICAL",
        alertType: "NEW",
        title: "Oil market event",
        body: "WTI move",
        fingerprint: "fp-1",
        verification: "MULTIPLE_SOURCES",
        confidence: "HIGH",
        confidenceScore: 85,
        affectedAssets: [{ symbol: "WTI", name: "WTI", changePercent: 2 }],
        eventStatus: "ACTIVE",
        readStatus: "UNREAD",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deepLink: "/market-intelligence/events/e1",
      },
    ];

    assert.equal(filterMarketEvents(marketEvents, { query: "wti", scope: "events" }).length, 1);
    assert.equal(filterDeliveredAlerts(alerts, { query: "oil", scope: "alerts" }).length, 1);
    assert.equal(filterMarketEvents(marketEvents, { query: "wti", scope: "alerts" }).length, 0);
  });
});
