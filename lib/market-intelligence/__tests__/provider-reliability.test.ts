import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { SYMBOL_REGISTRY } from "@/lib/market-intelligence/config/symbol-registry";
import { getMarketProviderConfig } from "@/lib/market-intelligence/config/provider-config";
import { CompositeMarketDataProvider } from "@/lib/market-intelligence/providers/composite-market-data-provider";
import type {
  MarketDataProvider,
  ProviderHealthInfo,
} from "@/lib/market-intelligence/providers/market-data-provider";
import { createMarketDataProvider } from "@/lib/market-intelligence/providers/provider-factory";
import {
  stopMarketStream,
  getStreamState,
  pollMarketData,
} from "@/lib/market-intelligence/services/market-stream-service";
import type {
  HistoricalPrice,
  NormalizedMarketQuote,
  TimeWindowMinutes,
  WindowReturnDetail,
} from "@/lib/types/market";

class StubProvider implements MarketDataProvider {
  readonly id: string;
  readonly name: string;
  private readonly health: ProviderHealthInfo;

  constructor(id: string, health: ProviderHealthInfo) {
    this.id = id;
    this.name = id;
    this.health = health;
  }

  async getQuote(): Promise<NormalizedMarketQuote | null> {
    return null;
  }

  async getQuotes(): Promise<NormalizedMarketQuote[]> {
    return [];
  }

  async getHistoricalPrices(): Promise<HistoricalPrice[]> {
    return [];
  }

  async getPriceChange(
    symbol: string,
    windowMinutes: TimeWindowMinutes,
  ): Promise<WindowReturnDetail | null> {
    void symbol;
    void windowMinutes;
    return null;
  }

  async getHealth(): Promise<ProviderHealthInfo> {
    return this.health;
  }
}

const originalEnv = { ...process.env };
const originalFetch = global.fetch;

afterEach(() => {
  process.env = { ...originalEnv };
  global.fetch = originalFetch;
  stopMarketStream();
});

describe("provider reliability", () => {
  it("defaults to the hybrid provider path", () => {
    delete process.env.MARKET_DATA_API_KEY;
    delete process.env.OILPRICEAPI_KEY;
    delete process.env.MARKET_DATA_PROVIDER;
    delete process.env.MARKET_QUOTE_STYLE;

    const config = getMarketProviderConfig();
    const provider = createMarketDataProvider();

    assert.equal(config.provider, "composite");
    assert.equal(provider.id, "composite");
  });

  it("treats disabled fallback providers as neutral in composite health", async () => {
    const primary = new StubProvider("yahoo", {
      providerId: "yahoo",
      status: "ONLINE",
      lastUpdate: "2026-07-30T09:00:00.000Z",
      latencyMs: 120,
    });
    const secondary = new StubProvider("development", {
      providerId: "development",
      status: "OFFLINE",
      lastUpdate: null,
      error: "demo fallback",
    });

    const provider = new CompositeMarketDataProvider({
      market: secondary,
      yahooFallback: primary as never,
    });

    const health = await provider.getHealth();
    assert.equal(health.status, "ONLINE");
    assert.equal(health.error, undefined);
    assert.equal(health.latencyMs, 120);
  });

  it("keeps failover error visible after a poll cycle", async () => {
    delete process.env.MARKET_DATA_API_KEY;
    delete process.env.OILPRICEAPI_KEY;
    delete process.env.MARKET_DATA_PROVIDER;
    delete process.env.MARKET_QUOTE_STYLE;

    global.fetch = (async () => {
      throw new Error("network down");
    }) as typeof global.fetch;

    await pollMarketData();

    const state = getStreamState();
    assert.equal(state.isDemo, true);
    assert.match(state.lastError ?? "", /Demo-Modus/);
  });

  it("reuses the in-flight poll instead of starting a second one", async () => {
    delete process.env.MARKET_DATA_API_KEY;
    delete process.env.OILPRICEAPI_KEY;
    delete process.env.MARKET_DATA_PROVIDER;
    delete process.env.MARKET_QUOTE_STYLE;

    let fetchCalls = 0;
    global.fetch = (async () => {
      fetchCalls += 1;
      throw new Error("network down");
    }) as typeof global.fetch;

    await Promise.all([pollMarketData(), pollMarketData()]);

    assert.equal(fetchCalls, SYMBOL_REGISTRY.length);
  });
});
