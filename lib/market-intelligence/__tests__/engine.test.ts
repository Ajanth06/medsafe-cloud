import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateBrentWTISpread } from "@/lib/market-intelligence/engine/brent-wti-spread";
import { detectAnomalies } from "@/lib/market-intelligence/engine/anomaly-detection";
import { analyzeOilCorrelation } from "@/lib/market-intelligence/engine/oil-correlation";
import { calculateConfidence } from "@/lib/market-intelligence/engine/confidence-engine";
import { PriceHistoryBuffer } from "@/lib/market-intelligence/engine/price-history-buffer";
import {
  calculatePercentageChange,
  calculateWindowReturn,
  meetsThreshold,
} from "@/lib/market-intelligence/engine/returns-calculator";
import { deduplicateByTitle } from "@/lib/market-intelligence/services/duplicate-detection";
import { generateMockSnapshots } from "@/lib/market-intelligence/engine/anomaly-detection";

describe("returns-calculator", () => {
  it("calculates percentage change correctly", () => {
    assert.equal(calculatePercentageChange(100, 101.5), 1.5);
    assert.equal(calculatePercentageChange(100, 98.5), -1.5);
  });

  it("calculates 10m window return", () => {
    const now = Date.now();
    const snapshots = [
      { assetId: "wti", symbol: "WTI", price: 100, timestamp: new Date(now - 15 * 60_000).toISOString() },
      { assetId: "wti", symbol: "WTI", price: 100, timestamp: new Date(now - 10 * 60_000).toISOString() },
      { assetId: "wti", symbol: "WTI", price: 101.5, timestamp: new Date(now).toISOString() },
    ];

    const result = calculateWindowReturn(snapshots, 10, now);
    assert.ok(result);
    assert.equal(result.percentageChange, 1.5);
    assert.equal(result.direction, "UP");
  });

  it("meets threshold at boundary — 1.49% does not trigger 1.5% UP rule", () => {
    assert.equal(meetsThreshold(1.49, 1.5, "UP"), false);
    assert.equal(meetsThreshold(1.5, 1.5, "UP"), true);
  });

  it("meets threshold for downside", () => {
    assert.equal(meetsThreshold(-1.49, 1.5, "DOWN"), false);
    assert.equal(meetsThreshold(-1.5, 1.5, "DOWN"), true);
  });
});

describe("anomaly-detection", () => {
  it("detects WTI upside anomaly at 1.5% / 10m", () => {
    const buffer = new PriceHistoryBuffer();
    const now = Date.now();
    const changes = Array(50).fill(0).map((_, i) => (i >= 40 ? 0.15 : 0));
    const snapshots = generateMockSnapshots("WTI", "wti", 100, changes, now);
    buffer.addSnapshots(snapshots);

    const events = detectAnomalies(buffer, undefined, now);
    const wtiUp = events.find(
      (e) => e.symbol === "WTI" && e.direction === "UP" && e.windowMinutes === 10,
    );
    assert.ok(wtiUp, "Expected WTI upside anomaly");
    assert.ok(wtiUp.percentageChange >= 1.5);
  });
});

describe("oil-correlation", () => {
  it("confirms simultaneous WTI and Brent moves", () => {
    const buffer = new PriceHistoryBuffer();
    const now = Date.now();
    const wtiSnaps = generateMockSnapshots("WTI", "wti", 100, Array(50).fill(0).map((_, i) => (i >= 40 ? 0.15 : 0)), now);
    const brentSnaps = generateMockSnapshots("BRENT", "brent", 100, Array(50).fill(0).map((_, i) => (i >= 40 ? 0.14 : 0)), now);
    buffer.addSnapshots(wtiSnaps);
    buffer.addSnapshots(brentSnaps);

    const result = analyzeOilCorrelation(buffer, 10, now);
    assert.equal(result.bothConfirmed, true);
    assert.equal(result.eventType, "OIL_MARKET_ANOMALY");
  });
});

describe("brent-wti-spread", () => {
  it("calculates spread as Brent minus WTI", () => {
    const spread = calculateBrentWTISpread(
      {
        assetId: "brent",
        symbol: "BRENT",
        providerSymbol: "BZ=F",
        name: "Brent",
        assetClass: "commodity",
        price: 87,
        previousClose: 85,
        absoluteChange: 2,
        percentageChange: 2.3,
        timestamp: new Date().toISOString(),
        marketStatus: "OPEN",
        dataAvailability: "DEMO",
    isRealtime: false,
    source: "test",
      },
      {
        assetId: "wti",
        symbol: "WTI",
        providerSymbol: "CL=F",
        name: "WTI",
        assetClass: "commodity",
        price: 85,
        previousClose: 83,
        absoluteChange: 2,
        percentageChange: 2.4,
        timestamp: new Date().toISOString(),
        marketStatus: "OPEN",
        dataAvailability: "DEMO",
    isRealtime: false,
    source: "test",
      },
    );

    assert.ok(spread);
    assert.equal(spread.spread, 2);
  });
});

describe("confidence-engine", () => {
  it("boosts confidence for WTI+Brent confirmation", () => {
    const base = calculateConfidence({});
    const boosted = calculateConfidence({
      anomaly: {
        id: "1",
        assetId: "wti",
        asset: "WTI",
        symbol: "WTI",
        direction: "UP",
        percentageChange: 2,
        absoluteChange: 1.7,
        windowMinutes: 10,
        startPrice: 85,
        currentPrice: 86.7,
        detectedAt: new Date().toISOString(),
        severity: "HIGH",
        eventType: "UPSIDE_ANOMALY",
        status: "ACTIVE",
        description: "test",
      },
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

    assert.ok(boosted.score > base.score);
  });
});

describe("duplicate-detection", () => {
  it("merges similar news titles", () => {
    const items = [
      { id: "1", title: "Oil prices surge on Middle East tensions" },
      { id: "2", title: "Oil prices surge amid Middle East tensions" },
      { id: "3", title: "ECB holds rates steady" },
    ];

    const deduped = deduplicateByTitle(items);
    assert.equal(deduped.length, 2);
  });
});
