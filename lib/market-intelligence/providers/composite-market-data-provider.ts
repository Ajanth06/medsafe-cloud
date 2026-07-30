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
 * Routing:
 * - WTI / Brent → OilPriceAPI first (live oil), Yahoo only if oil fails
 * - All other assets → Yahoo Investing-style first, Polygon optional fallback
 */
export class CompositeMarketDataProvider implements MarketDataProvider {
  readonly id = "composite";
  readonly name: string;

  private readonly oil: OilPriceApiProvider | null;
  private readonly yahoo: YahooFinanceMarketDataProvider;
  private readonly polygon: MarketDataProvider | null;

  constructor(opts?: {
    oil?: OilPriceApiProvider | null;
    yahoo?: YahooFinanceMarketDataProvider;
    polygon?: MarketDataProvider | null;
  }) {
    this.oil = opts?.oil ?? null;
    this.yahoo = opts?.yahoo ?? new YahooFinanceMarketDataProvider();
    this.polygon = opts?.polygon ?? null;
    const parts = [
      this.oil ? "OilPriceAPI (WTI/Brent live)" : null,
      "Yahoo (Investing-style)",
      this.polygon ? "Polygon fallback" : null,
    ].filter(Boolean);
    this.name = parts.join(" + ");
  }

  async getQuote(symbol: string): Promise<NormalizedMarketQuote | null> {
    if (this.oil?.supportsSymbol(symbol)) {
      const oil = await this.oil.getQuote(symbol);
      if (isUsable(oil)) return oil;
      // Oil failed → Yahoo so oil never goes blank
      const yahooOil = await this.yahoo.getQuote(symbol);
      if (isUsable(yahooOil)) return yahooOil;
      return oil;
    }

    if (this.yahoo.supportsSymbol(symbol)) {
      const yahoo = await this.yahoo.getQuote(symbol);
      if (isUsable(yahoo)) return yahoo;
    }

    if (this.polygon) {
      const poly = await this.polygon.getQuote(symbol);
      if (isUsable(poly)) return poly;
    }

    return this.yahoo.getQuote(symbol);
  }

  async getQuotes(symbols: string[]): Promise<NormalizedMarketQuote[]> {
    const bySymbol = new Map<string, NormalizedMarketQuote>();
    const oilSymbols = symbols.filter((s) => this.oil?.supportsSymbol(s));
    const otherSymbols = symbols.filter((s) => !this.oil?.supportsSymbol(s));

    // 1) Oil live via OilPriceAPI
    if (this.oil && oilSymbols.length) {
      const oilQuotes = await this.oil.getQuotes(oilSymbols);
      for (const q of oilQuotes) {
        if (isUsable(q)) bySymbol.set(q.symbol, q);
      }
    }

    // 2) Missing oil → Yahoo so oil always has a number
    const missingOil = oilSymbols.filter((s) => !bySymbol.has(s));
    if (missingOil.length) {
      const yahooOil = await this.yahoo.getQuotes(missingOil);
      for (const q of yahooOil) {
        if (isUsable(q)) bySymbol.set(q.symbol, q);
      }
    }

    // 3) Rest → Yahoo Investing-style
    if (otherSymbols.length) {
      const yahooQuotes = await this.yahoo.getQuotes(otherSymbols);
      for (const q of yahooQuotes) {
        if (isUsable(q)) bySymbol.set(q.symbol, q);
      }
    }

    // 4) Still missing non-oil → Polygon if keyed
    const stillMissing = symbols.filter((s) => !bySymbol.has(s));
    if (this.polygon && stillMissing.length) {
      const polyQuotes = await this.polygon.getQuotes(stillMissing);
      for (const q of polyQuotes) {
        if (isUsable(q)) bySymbol.set(q.symbol, q);
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
    const yahooRows = await this.yahoo.getHistoricalPrices(symbol, interval);
    if (yahooRows.length) return yahooRows;
    if (this.polygon) return this.polygon.getHistoricalPrices(symbol, interval);
    return yahooRows;
  }

  async getPriceChange(
    symbol: string,
    windowMinutes: TimeWindowMinutes,
  ): Promise<WindowReturnDetail | null> {
    if (this.oil?.supportsSymbol(symbol)) {
      const detail = await this.oil.getPriceChange(symbol, windowMinutes);
      if (detail) return detail;
    }
    const yahooDetail = await this.yahoo.getPriceChange(symbol, windowMinutes);
    if (yahooDetail) return yahooDetail;
    if (this.polygon) return this.polygon.getPriceChange(symbol, windowMinutes);
    return yahooDetail;
  }

  async getHealth(): Promise<ProviderHealthInfo> {
    const [oilHealth, yahooHealth, polygonHealth] = await Promise.all([
      this.oil?.getHealth() ??
        Promise.resolve({
          providerId: "oilpriceapi",
          status: "OFFLINE" as const,
          lastUpdate: null,
          error: "OILPRICEAPI_KEY missing",
        }),
      this.yahoo.getHealth(),
      this.polygon?.getHealth() ??
        Promise.resolve({
          providerId: "polygon",
          status: "OFFLINE" as const,
          lastUpdate: null,
          error: "not configured",
        }),
    ]);

    const enabled: ProviderHealthInfo[] = [yahooHealth];
    if (this.oil) enabled.push(oilHealth);
    if (this.polygon) enabled.push(polygonHealth);

    const online = enabled.some((h) => h.status === "ONLINE");
    // Oil is critical — degrade if oil key exists but oil is offline
    const oilDegraded = Boolean(this.oil) && oilHealth.status !== "ONLINE";
    const anyOffline = enabled.some((h) => h.status === "OFFLINE");

    return {
      providerId: this.id,
      status: online
        ? oilDegraded || anyOffline
          ? "DEGRADED"
          : "ONLINE"
        : "OFFLINE",
      lastUpdate: enabled.find((h) => h.lastUpdate)?.lastUpdate ?? null,
      latencyMs: enabled.find((h) => h.latencyMs != null)?.latencyMs,
      error:
        enabled
          .map((h) => h.error)
          .filter(Boolean)
          .join(" | ") || undefined,
    };
  }
}

export function createCompositeMarketDataProvider(): MarketDataProvider {
  const oilConfig = getOilPriceApiConfig();
  const marketConfig = getMarketProviderConfig();

  const oil = oilConfig.isConfigured
    ? new OilPriceApiProvider(oilConfig.apiKey ?? undefined)
    : null;
  const yahoo = new YahooFinanceMarketDataProvider();
  const polygon = marketConfig.polygonConfigured
    ? new PolygonRestMarketDataProvider(marketConfig.apiKey ?? undefined)
    : null;

  if (!oil) {
    marketLogger.warn(
      "OILPRICEAPI_KEY missing — WTI/Brent fall back to Yahoo (delayed)",
    );
  } else {
    marketLogger.info("Oil live via OilPriceAPI; other assets via Yahoo", {
      oilSymbols: ["WTI", "BRENT"],
    });
  }

  return new CompositeMarketDataProvider({ oil, yahoo, polygon });
}
