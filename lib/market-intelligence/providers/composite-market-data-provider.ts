import { getOilPriceApiConfig } from "@/lib/market-intelligence/config/oilpriceapi-config";
import { getMarketProviderConfig } from "@/lib/market-intelligence/config/provider-config";
import { DevelopmentMarketDataProvider } from "@/lib/market-intelligence/providers/development-market-data-provider";
import type {
  MarketDataProvider,
  ProviderHealthInfo,
} from "@/lib/market-intelligence/providers/market-data-provider";
import { OilPriceApiProvider } from "@/lib/market-intelligence/providers/oilpriceapi/oilpriceapi-provider";
import { PolygonRestMarketDataProvider } from "@/lib/market-intelligence/providers/polygon/polygon-rest-provider";
import { YahooFinanceMarketDataProvider } from "@/lib/market-intelligence/providers/yahoo/yahoo-finance-provider";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import type {
  HistoricalPrice,
  NormalizedMarketQuote,
  TimeWindowMinutes,
  WindowReturnDetail,
} from "@/lib/types/market";

function isUsable(quote: NormalizedMarketQuote | null | undefined): boolean {
  return Boolean(
    quote &&
      quote.price > 0 &&
      quote.dataAvailability !== "UNAVAILABLE" &&
      quote.source !== "development-mock",
  );
}

/**
 * Hybrid path: OilPriceAPI for oil benchmarks, Polygon for broad markets,
 * with Yahoo only as a last-resort fallback when Polygon is unavailable.
 */
export class CompositeMarketDataProvider implements MarketDataProvider {
  readonly id = "composite";
  readonly name: string;

  private readonly oil: OilPriceApiProvider | null;
  private readonly market: MarketDataProvider;
  private readonly yahooFallback: YahooFinanceMarketDataProvider | null;

  constructor(opts?: {
    oil?: OilPriceApiProvider | null;
    market?: MarketDataProvider;
    yahooFallback?: YahooFinanceMarketDataProvider | null;
  }) {
    this.oil = opts?.oil ?? null;
    this.market = opts?.market ?? new DevelopmentMarketDataProvider();
    this.yahooFallback = opts?.yahooFallback ?? null;
    const parts = [
      this.oil ? "OilPriceAPI" : null,
      this.market.id !== "development" ? this.market.name : null,
      this.yahooFallback ? "Yahoo fallback" : null,
    ].filter(Boolean);
    this.name = parts.length ? parts.join(" + ") : "Composite (empty)";
  }

  async getQuote(symbol: string): Promise<NormalizedMarketQuote | null> {
    if (this.oil?.supportsSymbol(symbol)) {
      const oil = await this.oil.getQuote(symbol);
      if (isUsable(oil)) return oil;
    }

    const marketQuote = await this.market.getQuote(symbol);
    if (isUsable(marketQuote)) return marketQuote;

    if (this.yahooFallback?.supportsSymbol(symbol)) {
      const yahoo = await this.yahooFallback.getQuote(symbol);
      if (isUsable(yahoo)) return yahoo;
    }

    return marketQuote;
  }

  async getQuotes(symbols: string[]): Promise<NormalizedMarketQuote[]> {
    const bySymbol = new Map<string, NormalizedMarketQuote>();

    if (this.oil) {
      const oilTargets = symbols.filter((s) => this.oil!.supportsSymbol(s));
      if (oilTargets.length) {
        const oilQuotes = await this.oil.getQuotes(oilTargets);
        for (const q of oilQuotes) {
          if (isUsable(q)) bySymbol.set(q.symbol, q);
        }
      }
    }

    const missingAfterOil = symbols.filter((s) => !bySymbol.has(s));
    if (missingAfterOil.length) {
      const marketQuotes = await this.market.getQuotes(missingAfterOil);
      for (const q of marketQuotes) {
        if (isUsable(q)) bySymbol.set(q.symbol, q);
      }
    }

    const missingAfterMarket = symbols.filter((s) => !bySymbol.has(s));
    if (this.yahooFallback && missingAfterMarket.length) {
      const yahooTargets = missingAfterMarket.filter((s) =>
        this.yahooFallback!.supportsSymbol(s),
      );
      if (yahooTargets.length) {
        const yahooQuotes = await this.yahooFallback.getQuotes(yahooTargets);
        for (const q of yahooQuotes) {
          if (isUsable(q)) bySymbol.set(q.symbol, q);
        }
      }
    }

    const stillMissing = symbols.filter((s) => !bySymbol.has(s));
    if (stillMissing.length) {
      const fallbackQuotes = await this.market.getQuotes(stillMissing);
      for (const q of fallbackQuotes) {
        bySymbol.set(q.symbol, q);
      }
    }

    return symbols
      .map((s) => bySymbol.get(s))
      .filter((q): q is NormalizedMarketQuote => q != null);
  }

  async getHistoricalPrices(
    symbol: string,
    interval: string,
  ): Promise<HistoricalPrice[]> {
    if (this.oil?.supportsSymbol(symbol)) {
      const rows = await this.oil.getHistoricalPrices(symbol, interval);
      if (rows.length) return rows;
    }
    const marketRows = await this.market.getHistoricalPrices(symbol, interval);
    if (marketRows.length) return marketRows;
    if (this.yahooFallback?.supportsSymbol(symbol)) {
      return this.yahooFallback.getHistoricalPrices(symbol, interval);
    }
    return marketRows;
  }

  async getPriceChange(
    symbol: string,
    windowMinutes: TimeWindowMinutes,
  ): Promise<WindowReturnDetail | null> {
    if (this.oil?.supportsSymbol(symbol)) {
      const detail = await this.oil.getPriceChange(symbol, windowMinutes);
      if (detail) return detail;
    }
    const marketDetail = await this.market.getPriceChange(symbol, windowMinutes);
    if (marketDetail) return marketDetail;
    if (this.yahooFallback?.supportsSymbol(symbol)) {
      return this.yahooFallback.getPriceChange(symbol, windowMinutes);
    }
    return marketDetail;
  }

  async getHealth(): Promise<ProviderHealthInfo> {
    const [oilHealth, marketHealth, yahooHealth] = await Promise.all([
      this.oil?.getHealth() ??
        Promise.resolve({
          providerId: "oilpriceapi",
          status: "OFFLINE" as const,
          lastUpdate: null,
          error: "not configured",
        }),
      this.market.getHealth(),
      this.yahooFallback?.getHealth() ??
        Promise.resolve({
          providerId: "yahoo",
          status: "OFFLINE" as const,
          lastUpdate: null,
          error: "not enabled",
        }),
    ]);

    const enabledHealths: ProviderHealthInfo[] = [];
    if (this.oil) enabledHealths.push(oilHealth);
    if (this.market.id !== "development") enabledHealths.push(marketHealth);
    if (this.yahooFallback) enabledHealths.push(yahooHealth);

    if (enabledHealths.length === 0) {
      return {
        providerId: this.id,
        status: "OFFLINE",
        lastUpdate: null,
        error: "No live providers enabled",
      };
    }

    const statuses = enabledHealths.map((health) => health.status);
    const online = statuses.some((s) => s === "ONLINE");
    const anyOffline = statuses.some((s) => s === "OFFLINE");

    return {
      providerId: this.id,
      status: online ? (anyOffline ? "DEGRADED" : "ONLINE") : "OFFLINE",
      lastUpdate:
        enabledHealths.find((health) => health.lastUpdate != null)?.lastUpdate ?? null,
      latencyMs:
        enabledHealths.find((health) => health.latencyMs != null)?.latencyMs,
      error:
        enabledHealths
          .map((health) => health.error)
          .filter(Boolean)
          .join(" | ") || undefined,
    };
  }
}

/** Hybrid provider with OilPriceAPI + Polygon, Yahoo only when needed. */
export function createCompositeMarketDataProvider(): MarketDataProvider {
  const oilConfig = getOilPriceApiConfig();
  const marketConfig = getMarketProviderConfig();

  const oil = oilConfig.isConfigured
    ? new OilPriceApiProvider(oilConfig.apiKey ?? undefined)
    : null;
  const market = marketConfig.polygonConfigured
    ? new PolygonRestMarketDataProvider(marketConfig.apiKey ?? undefined)
    : new DevelopmentMarketDataProvider();
  const yahooFallback = marketConfig.polygonConfigured
    ? null
    : new YahooFinanceMarketDataProvider();

  marketLogger.info("Using hybrid market data", {
    oil: Boolean(oil),
    polygon: marketConfig.polygonConfigured,
    yahooFallback: Boolean(yahooFallback),
  });

  return new CompositeMarketDataProvider({ oil, market, yahooFallback });
}
