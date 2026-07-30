import { getOilPriceApiConfig } from "@/lib/market-intelligence/config/oilpriceapi-config";
import { getMarketProviderConfig } from "@/lib/market-intelligence/config/provider-config";
import { DevelopmentMarketDataProvider } from "@/lib/market-intelligence/providers/development-market-data-provider";
import type {
  MarketDataProvider,
  ProviderHealthInfo,
} from "@/lib/market-intelligence/providers/market-data-provider";
import {
  OilPriceApiProvider,
  OILPRICEAPI_SYMBOLS,
} from "@/lib/market-intelligence/providers/oilpriceapi/oilpriceapi-provider";
import { PolygonRestMarketDataProvider } from "@/lib/market-intelligence/providers/polygon/polygon-rest-provider";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import type {
  HistoricalPrice,
  NormalizedMarketQuote,
  TimeWindowMinutes,
  WindowReturnDetail,
} from "@/lib/types/market";

/**
 * Routes primary oil symbols to OilPriceAPI and everything else to Polygon (or demo).
 */
export class CompositeMarketDataProvider implements MarketDataProvider {
  readonly id = "composite";
  readonly name: string;

  private readonly oil: OilPriceApiProvider | null;
  private readonly secondary: MarketDataProvider;

  constructor(opts?: {
    oil?: OilPriceApiProvider | null;
    secondary?: MarketDataProvider;
  }) {
    this.oil = opts?.oil ?? null;
    this.secondary = opts?.secondary ?? new DevelopmentMarketDataProvider();
    const parts = [
      this.oil ? "OilPriceAPI (WTI/Brent)" : null,
      this.secondary.name,
    ].filter(Boolean);
    this.name = parts.join(" + ");
  }

  async getQuote(symbol: string): Promise<NormalizedMarketQuote | null> {
    if (this.oil?.supportsSymbol(symbol)) {
      return this.oil.getQuote(symbol);
    }
    return this.secondary.getQuote(symbol);
  }

  async getQuotes(symbols: string[]): Promise<NormalizedMarketQuote[]> {
    const oilSymbols = symbols.filter((s) => this.oil?.supportsSymbol(s));
    const otherSymbols = symbols.filter((s) => !this.oil?.supportsSymbol(s));

    const [oilQuotes, otherQuotes] = await Promise.all([
      oilSymbols.length && this.oil
        ? this.oil.getQuotes(oilSymbols)
        : Promise.resolve([] as NormalizedMarketQuote[]),
      otherSymbols.length
        ? this.secondary.getQuotes(otherSymbols)
        : Promise.resolve([] as NormalizedMarketQuote[]),
    ]);

    const bySymbol = new Map<string, NormalizedMarketQuote>();
    for (const q of [...oilQuotes, ...otherQuotes]) {
      bySymbol.set(q.symbol, q);
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
      return this.oil.getHistoricalPrices(symbol, interval);
    }
    return this.secondary.getHistoricalPrices(symbol, interval);
  }

  async getPriceChange(
    symbol: string,
    windowMinutes: TimeWindowMinutes,
  ): Promise<WindowReturnDetail | null> {
    if (this.oil?.supportsSymbol(symbol)) {
      return this.oil.getPriceChange(symbol, windowMinutes);
    }
    return this.secondary.getPriceChange(symbol, windowMinutes);
  }

  async getHealth(): Promise<ProviderHealthInfo> {
    const [oilHealth, secondaryHealth] = await Promise.all([
      this.oil?.getHealth() ??
        Promise.resolve({
          providerId: "oilpriceapi",
          status: "OFFLINE" as const,
          lastUpdate: null,
          error: "not configured",
        }),
      this.secondary.getHealth(),
    ]);

    const online =
      oilHealth.status === "ONLINE" || secondaryHealth.status === "ONLINE";
    const degraded =
      oilHealth.status === "DEGRADED" ||
      secondaryHealth.status === "DEGRADED" ||
      (oilHealth.status === "ONLINE") !== (secondaryHealth.status === "ONLINE");

    return {
      providerId: this.id,
      status: online ? (degraded ? "DEGRADED" : "ONLINE") : "OFFLINE",
      lastUpdate: oilHealth.lastUpdate ?? secondaryHealth.lastUpdate,
      latencyMs:
        ("latencyMs" in oilHealth ? oilHealth.latencyMs : undefined) ??
        ("latencyMs" in secondaryHealth ? secondaryHealth.latencyMs : undefined),
      error: [oilHealth.error, secondaryHealth.error].filter(Boolean).join(" | ") || undefined,
    };
  }
}

export function createCompositeMarketDataProvider(): MarketDataProvider {
  const oilConfig = getOilPriceApiConfig();
  const marketConfig = getMarketProviderConfig();

  const oil = oilConfig.isConfigured
    ? new OilPriceApiProvider(oilConfig.apiKey ?? undefined)
    : null;

  let secondary: MarketDataProvider;
  if (marketConfig.provider === "polygon" && marketConfig.apiKey) {
    secondary = new PolygonRestMarketDataProvider(marketConfig.apiKey);
  } else {
    secondary = new DevelopmentMarketDataProvider();
  }

  if (oil) {
    marketLogger.info("Using OilPriceAPI for primary oil symbols", {
      symbols: OILPRICEAPI_SYMBOLS,
    });
  }

  if (oil || (marketConfig.provider === "polygon" && marketConfig.apiKey)) {
    return new CompositeMarketDataProvider({ oil, secondary });
  }

  return new DevelopmentMarketDataProvider();
}
