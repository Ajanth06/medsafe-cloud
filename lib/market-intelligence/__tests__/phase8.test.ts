import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { isWorkerAuthorized } from "@/lib/market-intelligence/api/auth";
import {
  checkRateLimit,
  RATE_LIMITS,
  resetRateLimits,
} from "@/lib/market-intelligence/api/rate-limit";
import { fetchQuotesWithFailover } from "@/lib/market-intelligence/providers/provider-failover";
import {
  getProviderHealthRecords,
  recordProviderFailure,
  recordProviderSuccess,
  resetProviderHealthStore,
} from "@/lib/market-intelligence/providers/provider-health-store";
import type { MarketDataProvider } from "@/lib/market-intelligence/providers/market-data-provider";
import type {
  HistoricalPrice,
  NormalizedMarketQuote,
  TimeWindowMinutes,
  WindowReturnDetail,
} from "@/lib/types/market";

class StubProvider implements MarketDataProvider {
  readonly id: string;
  readonly name: string;
  private failCount: number;
  private readonly quotes: NormalizedMarketQuote[];

  constructor(
    id: string,
    options: { failCount?: number; quotes?: NormalizedMarketQuote[] } = {},
  ) {
    this.id = id;
    this.name = id;
    this.failCount = options.failCount ?? 0;
    this.quotes = options.quotes ?? [
      {
        symbol: "WTI",
        price: 82.5,
        timestamp: new Date().toISOString(),
        dataAvailability: "LIVE",
        isRealtime: true,
        source: "stub",
      },
    ];
  }

  async getQuote(): Promise<NormalizedMarketQuote | null> {
    const [q] = await this.getQuotes(["WTI"]);
    return q ?? null;
  }

  async getQuotes(): Promise<NormalizedMarketQuote[]> {
    if (this.failCount > 0) {
      this.failCount -= 1;
      throw new Error(`${this.id} failed`);
    }
    return this.quotes;
  }

  async getHistoricalPrices(): Promise<HistoricalPrice[]> {
    return [];
  }

  async getPriceChange(
    _symbol: string,
    _windowMinutes: TimeWindowMinutes,
  ): Promise<WindowReturnDetail | null> {
    return null;
  }

  async getHealth() {
    return {
      providerId: this.id,
      status: "ONLINE" as const,
      lastUpdate: new Date().toISOString(),
    };
  }
}

describe("phase8 worker auth", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("rejects missing secret in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.WORKER_SECRET;
    delete process.env.CRON_SECRET;

    const request = new Request("http://localhost/api/market/worker/tick");
    assert.equal(isWorkerAuthorized(request), false);
  });

  it("accepts bearer token when secret configured", () => {
    process.env.WORKER_SECRET = "test-secret-123";
    const request = new Request("http://localhost/api/market/worker/tick", {
      headers: { authorization: "Bearer test-secret-123" },
    });
    assert.equal(isWorkerAuthorized(request), true);
  });

  it("accepts x-cron-secret header", () => {
    process.env.CRON_SECRET = "cron-key";
    const request = new Request("http://localhost/api/market/worker/tick", {
      headers: { "x-cron-secret": "cron-key" },
    });
    assert.equal(isWorkerAuthorized(request), true);
  });

  it("allows dev access when secret unset", () => {
    process.env.NODE_ENV = "development";
    delete process.env.WORKER_SECRET;
    delete process.env.CRON_SECRET;

    const request = new Request("http://localhost/api/market/worker/tick");
    assert.equal(isWorkerAuthorized(request), true);
  });
});

describe("phase8 rate limiting", () => {
  beforeEach(() => resetRateLimits());

  it("allows requests under limit", () => {
    const { limit } = RATE_LIMITS.quotes;
    for (let i = 0; i < limit; i++) {
      assert.equal(checkRateLimit("user-1:quotes", limit, 60_000), true);
    }
  });

  it("blocks requests over limit", () => {
    const { limit, windowMs } = RATE_LIMITS.stream;
    for (let i = 0; i < limit; i++) {
      checkRateLimit("user-2:stream", limit, windowMs);
    }
    assert.equal(checkRateLimit("user-2:stream", limit, windowMs), false);
  });
});

describe("phase8 provider failover", () => {
  it("returns primary quotes on success", async () => {
    const primary = new StubProvider("polygon");
    const result = await fetchQuotesWithFailover(primary, ["WTI"]);
    assert.equal(result.usedFallback, false);
    assert.equal(result.providerId, "polygon");
    assert.equal(result.quotes.length, 1);
    assert.equal(result.attempts, 1);
  });

  it("falls back after retries exhausted", async () => {
    const primary = new StubProvider("polygon", { failCount: 5 });
    const result = await fetchQuotesWithFailover(primary, ["WTI"]);
    assert.equal(result.usedFallback, true);
    assert.equal(result.providerId, "development");
    assert.ok(result.quotes.length > 0);
    assert.equal(result.attempts, 3);
  });
});

describe("phase8 provider health store", () => {
  beforeEach(() => resetProviderHealthStore());

  it("tracks success and failure", () => {
    recordProviderSuccess({ provider: "polygon", providerType: "market", latencyMs: 120 });
    recordProviderFailure({ provider: "polygon", providerType: "market", error: "timeout" });

    const records = getProviderHealthRecords();
    assert.equal(records.length, 1);
    assert.equal(records[0]?.provider, "polygon");
    assert.equal(records[0]?.status, "DEGRADED");
    assert.equal(records[0]?.errorCount, 1);
    assert.ok(records[0]?.dataStale);
  });
});
