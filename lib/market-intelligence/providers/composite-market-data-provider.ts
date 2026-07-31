import { getOilPriceApiConfig } from "@/lib/market-intelligence/config/oilpriceapi-config";
import { getMarketProviderConfig } from "@/lib/market-intelligence/config/provider-config";
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
 * Routing (Investing-style movement):
 * - WTI / Brent → Yahoo CL=F / BZ=F first (ticks like Investing)
 * - OilPriceAPI only as oil fallback (spot updates slowly)
 * - Other assets → Yahoo, then Polygon if keyed
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
    this.name = [
      "Yahoo (Investing futures/index)",
      this.oil ? "OilPriceAPI fallback" : null,
      this.polygon ? "Polygon fallback" : null,
    ]
      .filter(Boolean)
      .join(" + ");
  }

  async getQuote(symbol: string): Promise<NormalizedMarketQuote | null> {
    // Oil: Yahoo futures first so prices move like Investing
    if (symbol === "WTI" || symbol === "BRENT") {
      const yahooOil = await this.yahoo.getQuote(symbol);
      if (isUsable(yahooOil)) return yahooOil;
      if (this.oil?.supportsSymbol(symbol)) {
        const oil = await this.oil.getQuote(symbol);
        if (isUsable(oil)) return oil;
      }
      return yahooOil;
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

    // 1) Everything via Yahoo first (WTI=CL=F, BRENT=BZ=F, DAX, …)
    const yahooTargets = symbols.filter((s) => this.yahoo.supportsSymbol(s));
    if (yahooTargets.length) {
      const yahooQuotes = await this.yahoo.getQuotes(yahooTargets);
      for (const q of yahooQuotes) {
        if (isUsable(q)) bySymbol.set(q.symbol, q);
      }
    }

    // 2) Missing oil only → OilPriceAPI spot fallback
    const missingOil = symbols.filter(
      (s) =>
        (s === "WTI" || s === "BRENT") &&
        !bySymbol.has(s) &&
        this.oil?.supportsSymbol(s),
    );
    if (this.oil && missingOil.length) {
      const oilQuotes = await this.oil.getQuotes(missingOil);
      for (const q of oilQuotes) {
        if (isUsable(q)) bySymbol.set(q.symbol, q);
      }
    }

    // 3) Still missing → Polygon
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
    const yahooRows = await this.yahoo.getHistoricalPrices(symbol, interval);
    if (yahooRows.length) return yahooRows;
    if (this.oil?.supportsSymbol(symbol)) {
      return this.oil.getHistoricalPrices(symbol, interval);
    }
    if (this.polygon) return this.polygon.getHistoricalPrices(symbol, interval);
    return yahooRows;
  }

  async getPriceChange(
    symbol: string,
    windowMinutes: TimeWindowMinutes,
  ): Promise<WindowReturnDetail | null> {
    const yahooDetail = await this.yahoo.getPriceChange(symbol, windowMinutes);
    if (yahooDetail) return yahooDetail;
    if (this.oil?.supportsSymbol(symbol)) {
      return this.oil.getPriceChange(symbol, windowMinutes);
    }
    if (this.polygon) return this.polygon.getPriceChange(symbol, windowMinutes);
    return yahooDetail;
  }

  async getHealth(): Promise<ProviderHealthInfo> {
    const [yahooHealth, oilHealth, polygonHealth] = await Promise.all([
      this.yahoo.getHealth(),
      this.oil?.getHealth() ??
        Promise.resolve({
          providerId: "oilpriceapi",
          status: "OFFLINE" as const,
          lastUpdate: null,
          error: "not configured",
        }),
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
    const anyOffline = enabled.some((h) => h.status === "OFFLINE");

    return {
      providerId: this.id,
      status: online ? (anyOffline ? "DEGRADED" : "ONLINE") : "OFFLINE",
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

  marketLogger.info("Using oil-only Yahoo quotes: WTI + Brent", {
    oilFallback: Boolean(oil),
    polygonFallback: Boolean(polygon),
    symbols: { WTI: "CL=F", BRENT: "BZ=F" },
  });

  return new CompositeMarketDataProvider({ oil, yahoo, polygon });
}
