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
 * Investing-style quotes first (Yahoo CL=F / BZ=F / ^GDAXI),
 * then OilPriceAPI / Polygon as fallbacks.
 */
export class CompositeMarketDataProvider implements MarketDataProvider {
  readonly id = "composite";
  readonly name: string;

  private readonly primary: YahooFinanceMarketDataProvider | null;
  private readonly oil: OilPriceApiProvider | null;
  private readonly secondary: MarketDataProvider;

  constructor(opts?: {
    primary?: YahooFinanceMarketDataProvider | null;
    oil?: OilPriceApiProvider | null;
    secondary?: MarketDataProvider;
  }) {
    this.primary = opts?.primary ?? null;
    this.oil = opts?.oil ?? null;
    this.secondary = opts?.secondary ?? new DevelopmentMarketDataProvider();
    const parts = [
      this.primary ? "Yahoo (Investing-style)" : null,
      this.oil ? "OilPriceAPI fallback" : null,
      this.secondary.name,
    ].filter(Boolean);
    this.name = parts.join(" + ");
  }

  async getQuote(symbol: string): Promise<NormalizedMarketQuote | null> {
    if (this.primary?.supportsSymbol(symbol)) {
      const yahoo = await this.primary.getQuote(symbol);
      if (isUsable(yahoo)) return yahoo;
    }

    if (this.oil?.supportsSymbol(symbol)) {
      const oil = await this.oil.getQuote(symbol);
      if (isUsable(oil)) return oil;
    }

    return this.secondary.getQuote(symbol);
  }

  async getQuotes(symbols: string[]): Promise<NormalizedMarketQuote[]> {
    const bySymbol = new Map<string, NormalizedMarketQuote>();

    if (this.primary) {
      const yahooQuotes = await this.primary.getQuotes(symbols);
      for (const q of yahooQuotes) {
        if (isUsable(q)) bySymbol.set(q.symbol, q);
      }
    }

    const missingAfterYahoo = symbols.filter((s) => !bySymbol.has(s));

    if (this.oil && missingAfterYahoo.length) {
      const oilTargets = missingAfterYahoo.filter((s) => this.oil!.supportsSymbol(s));
      if (oilTargets.length) {
        const oilQuotes = await this.oil.getQuotes(oilTargets);
        for (const q of oilQuotes) {
          if (isUsable(q)) bySymbol.set(q.symbol, q);
        }
      }
    }

    const stillMissing = symbols.filter((s) => !bySymbol.has(s));
    if (stillMissing.length) {
      const secondaryQuotes = await this.secondary.getQuotes(stillMissing);
      for (const q of secondaryQuotes) {
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
    if (this.primary?.supportsSymbol(symbol)) {
      const rows = await this.primary.getHistoricalPrices(symbol, interval);
      if (rows.length) return rows;
    }
    if (this.oil?.supportsSymbol(symbol)) {
      return this.oil.getHistoricalPrices(symbol, interval);
    }
    return this.secondary.getHistoricalPrices(symbol, interval);
  }

  async getPriceChange(
    symbol: string,
    windowMinutes: TimeWindowMinutes,
  ): Promise<WindowReturnDetail | null> {
    if (this.primary?.supportsSymbol(symbol)) {
      const detail = await this.primary.getPriceChange(symbol, windowMinutes);
      if (detail) return detail;
    }
    if (this.oil?.supportsSymbol(symbol)) {
      return this.oil.getPriceChange(symbol, windowMinutes);
    }
    return this.secondary.getPriceChange(symbol, windowMinutes);
  }

  async getHealth(): Promise<ProviderHealthInfo> {
    const [yahooHealth, oilHealth, secondaryHealth] = await Promise.all([
      this.primary?.getHealth() ??
        Promise.resolve({
          providerId: "yahoo",
          status: "OFFLINE" as const,
          lastUpdate: null,
          error: "not enabled",
        }),
      this.oil?.getHealth() ??
        Promise.resolve({
          providerId: "oilpriceapi",
          status: "OFFLINE" as const,
          lastUpdate: null,
          error: "not configured",
        }),
      this.secondary.getHealth(),
    ]);

    const statuses = [yahooHealth.status, oilHealth.status, secondaryHealth.status];
    const online = statuses.some((s) => s === "ONLINE");
    const anyOffline = statuses.some((s) => s === "OFFLINE");

    return {
      providerId: this.id,
      status: online ? (anyOffline ? "DEGRADED" : "ONLINE") : "OFFLINE",
      lastUpdate:
        yahooHealth.lastUpdate ?? oilHealth.lastUpdate ?? secondaryHealth.lastUpdate,
      latencyMs:
        ("latencyMs" in yahooHealth ? yahooHealth.latencyMs : undefined) ??
        ("latencyMs" in oilHealth ? oilHealth.latencyMs : undefined) ??
        ("latencyMs" in secondaryHealth ? secondaryHealth.latencyMs : undefined),
      error:
        [yahooHealth.error, oilHealth.error, secondaryHealth.error]
          .filter(Boolean)
          .join(" | ") || undefined,
    };
  }
}

export function createCompositeMarketDataProvider(): MarketDataProvider {
  const oilConfig = getOilPriceApiConfig();
  const marketConfig = getMarketProviderConfig();
  const quoteStyle = (process.env.MARKET_QUOTE_STYLE ?? "investing").toLowerCase();
  const useYahoo =
    quoteStyle === "investing" ||
    marketConfig.provider === "yahoo" ||
    marketConfig.provider === "investing" ||
    marketConfig.provider === "composite" ||
    marketConfig.provider === "polygon" ||
    oilConfig.isConfigured;

  const primary = useYahoo ? new YahooFinanceMarketDataProvider() : null;
  const oil = oilConfig.isConfigured
    ? new OilPriceApiProvider(oilConfig.apiKey ?? undefined)
    : null;

  let secondary: MarketDataProvider;
  if (marketConfig.polygonConfigured) {
    secondary = new PolygonRestMarketDataProvider(marketConfig.apiKey ?? undefined);
  } else {
    secondary = new DevelopmentMarketDataProvider();
  }

  if (primary) {
    marketLogger.info("Using Yahoo Finance for Investing-style quotes", {
      symbols: ["WTI=CL=F", "BRENT=BZ=F", "DAX=^GDAXI"],
    });
  }

  if (primary || oil || marketConfig.polygonConfigured) {
    return new CompositeMarketDataProvider({ primary, oil, secondary });
  }

  return new DevelopmentMarketDataProvider();
}
