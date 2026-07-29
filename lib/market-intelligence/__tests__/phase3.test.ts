import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSymbolEntry } from "@/lib/market-intelligence/config/symbol-registry";
import { calculateBrentWTISpread } from "@/lib/market-intelligence/engine/brent-wti-spread";
import { normalizePolygonQuote } from "@/lib/market-intelligence/providers/polygon/polygon-normalizer";
import {
  detectContractRollover,
  resetRolloverState,
  shouldSuppressAnomalyDuringRollover,
} from "@/lib/market-intelligence/services/contract-rollover";
import { validateTick, isStale } from "@/lib/market-intelligence/services/data-quality";
import { DuplicateTickFilter } from "@/lib/market-intelligence/services/duplicate-ticks";
import type { NormalizedMarketQuote } from "@/lib/types/market";

function baseQuote(overrides: Partial<NormalizedMarketQuote> = {}): NormalizedMarketQuote {
  return {
    assetId: "wti",
    symbol: "WTI",
    providerSymbol: "CLZ5",
    name: "WTI Crude Oil",
    instrumentLabel: "Front Month Futures",
    assetClass: "commodity",
    exchange: "NYMEX/CME",
    currency: "USD",
    price: 82.5,
    previousClose: 81.0,
    absoluteChange: 1.5,
    percentageChange: 1.85,
    timestamp: new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    processedAt: new Date().toISOString(),
    marketStatus: "OPEN",
    isRealtime: true,
    dataAvailability: "LIVE",
    source: "test",
    staleAfterSeconds: 30,
    ...overrides,
  };
}

describe("data-quality", () => {
  it("rejects zero price", () => {
    const result = validateTick({ price: 0 });
    assert.equal(result.valid, false);
    assert.match(result.reason ?? "", /zero/i);
  });

  it("rejects bid greater than ask", () => {
    const result = validateTick({ price: 80, bid: 81, ask: 79 });
    assert.equal(result.valid, false);
  });

  it("rejects suspicious 80% jump", () => {
    const result = validateTick({ price: 150 }, 80);
    assert.equal(result.valid, false);
  });

  it("detects stale data", () => {
    const old = new Date(Date.now() - 60_000).toISOString();
    assert.equal(isStale(old, 30), true);
    assert.equal(isStale(new Date().toISOString(), 30), false);
  });
});

describe("duplicate-ticks", () => {
  it("deduplicates identical ticks", () => {
    const filter = new DuplicateTickFilter();
    const tick = { symbol: "WTI", price: 82.1, timestamp: "2026-07-29T12:00:00.000Z" };
    assert.equal(filter.isDuplicate(tick), false);
    assert.equal(filter.isDuplicate(tick), true);
  });

  it("allows different prices", () => {
    const filter = new DuplicateTickFilter();
    const now = Date.now();
    assert.equal(
      filter.isDuplicate({ symbol: "WTI", price: 82.1, timestamp: "2026-07-29T12:00:00.000Z" }, now),
      false,
    );
    assert.equal(
      filter.isDuplicate({ symbol: "WTI", price: 82.2, timestamp: "2026-07-29T12:00:01.000Z" }, now),
      false,
    );
  });
});

describe("contract-rollover", () => {
  it("detects contract change with price gap", () => {
    resetRolloverState();
    const contractA = {
      contractSymbol: "CLZ5",
      productCode: "CL",
      expirationDate: "2025-12-19",
      isFrontMonth: true,
      exchange: "NYMEX/CME",
    };
    const contractB = {
      contractSymbol: "CLF6",
      productCode: "CL",
      expirationDate: "2026-01-20",
      isFrontMonth: true,
      exchange: "NYMEX/CME",
    };

    detectContractRollover("WTI", contractA, 82.0);
    const state = detectContractRollover("WTI", contractB, 86.5, 82.0);

    assert.equal(state.rolloverDetected, true);
    assert.equal(shouldSuppressAnomalyDuringRollover("WTI"), true);
    resetRolloverState();
  });
});

describe("polygon-normalizer", () => {
  it("normalizes futures snapshot with timestamps", () => {
    const entry = getSymbolEntry("WTI");
    assert.ok(entry);

    const receivedAt = "2026-07-29T12:00:00.340Z";
    const processedAt = "2026-07-29T12:00:00.390Z";
    const tradeMs = new Date(receivedAt).getTime() - 220;
    const quote = normalizePolygonQuote({
      entry,
      contractSymbol: "CLZ5",
      contract: {
        contractSymbol: "CLZ5",
        productCode: "CL",
        expirationDate: "2025-12-19",
        isFrontMonth: true,
        exchange: "NYMEX/CME",
      },
      snapshot: {
        ticker: "CLZ5",
        lastTrade: { p: 82.71, t: tradeMs },
        prevDay: { c: 81.5 },
        todaysChangePerc: 1.48,
      },
      receivedAt,
      processedAt,
      latencyMs: 220,
      isRealtime: true,
      delaySeconds: 0,
      dataAvailability: "LIVE",
    });

    assert.ok(quote);
    assert.equal(quote.symbol, "WTI");
    assert.equal(quote.price, 82.71);
    assert.equal(quote.contractSymbol, "CLZ5");
    assert.equal(quote.isRealtime, true);
    assert.equal(quote.dataAvailability, "LIVE");
    assert.equal(quote.latency?.providerToServerMs, 220);
  });

  it("returns null for invalid snapshot", () => {
    const entry = getSymbolEntry("BRENT");
    assert.ok(entry);
    const quote = normalizePolygonQuote({
      entry,
      contractSymbol: "BZZ5",
      snapshot: { ticker: "BZZ5" },
      receivedAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
      latencyMs: null,
      isRealtime: false,
      delaySeconds: 900,
      dataAvailability: "DELAYED",
    });
    assert.equal(quote, null);
  });
});

describe("brent-wti-spread", () => {
  it("calculates spread from normalized quotes", () => {
    const spread = calculateBrentWTISpread(
      baseQuote({ symbol: "BRENT", price: 86.71 }),
      baseQuote({ symbol: "WTI", price: 82.5 }),
    );
    assert.ok(spread);
    assert.ok(Math.abs(spread.spread - 4.21) < 0.01);
  });
});

describe("symbol-registry", () => {
  it("maps WTI and Brent to futures product codes", () => {
    const wti = getSymbolEntry("WTI");
    const brent = getSymbolEntry("BRENT");
    assert.equal(wti?.polygon.productCode, "CL");
    assert.equal(brent?.polygon.productCode, "BZ");
    assert.equal(wti?.exchange, "NYMEX/CME");
    assert.equal(brent?.exchange, "ICE");
  });
});
