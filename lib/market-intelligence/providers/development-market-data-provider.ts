import type { MarketDataProvider, ProviderHealthInfo } from "@/lib/market-intelligence/providers/market-data-provider";
import { MockMarketDataProvider } from "@/lib/market-intelligence/providers/mock-market-data-provider";
import type {
  HistoricalPrice,
  NormalizedMarketQuote,
  TimeWindowMinutes,
  WindowReturnDetail,
} from "@/lib/types/market";

/**
 * Explicit development provider — all data labeled DEMO, never LIVE.
 */
export class DevelopmentMarketDataProvider implements MarketDataProvider {
  readonly id = "development";
  readonly name = "Development Demo Provider";

  private readonly mock = new MockMarketDataProvider();

  async getQuote(symbol: string): Promise<NormalizedMarketQuote | null> {
    const quote = await this.mock.getQuote(symbol);
    return quote ? this.labelDemo(quote) : null;
  }

  async getQuotes(symbols: string[]): Promise<NormalizedMarketQuote[]> {
    const quotes = await this.mock.getQuotes(symbols);
    return quotes.map((q) => this.labelDemo(q));
  }

  async getHistoricalPrices(symbol: string, interval: string): Promise<HistoricalPrice[]> {
    return this.mock.getHistoricalPrices(symbol, interval);
  }

  async getPriceChange(
    symbol: string,
    windowMinutes: TimeWindowMinutes,
  ): Promise<WindowReturnDetail | null> {
    return this.mock.getPriceChange(symbol, windowMinutes);
  }

  async getHealth(): Promise<ProviderHealthInfo> {
    const health = await this.mock.getHealth();
    return {
      ...health,
      providerId: this.id,
      status: "OFFLINE",
      error: "No live market data provider configured — showing DEMO data",
    };
  }

  private labelDemo(quote: NormalizedMarketQuote): NormalizedMarketQuote {
    return {
      ...quote,
      dataAvailability: "DEMO",
      isRealtime: false,
      source: "development-mock",
      instrumentLabel: `${quote.instrumentLabel ?? quote.name} (DEMO)`,
    };
  }
}
