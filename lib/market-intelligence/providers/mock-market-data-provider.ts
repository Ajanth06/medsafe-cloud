import { MARKET_ASSETS } from "@/lib/market-intelligence/config/assets";
import { STALE_DATA_THRESHOLD_MS } from "@/lib/market-intelligence/config/constants";
import { generateMockSnapshots } from "@/lib/market-intelligence/engine/anomaly-detection";
import { calculateWindowReturn } from "@/lib/market-intelligence/engine/returns-calculator";
import type { MarketDataProvider, ProviderHealthInfo } from "@/lib/market-intelligence/providers/market-data-provider";
import { MOCK_PRICE_HISTORY, MOCK_NORMALIZED_QUOTES } from "@/lib/market-intelligence/mock-data";
import type {
  HistoricalPrice,
  NormalizedMarketQuote,
  TimeWindowMinutes,
  WindowReturnDetail,
} from "@/lib/types/market";

export class MockMarketDataProvider implements MarketDataProvider {
  readonly id = "mock";
  readonly name = "Development Mock Provider";

  async getQuote(symbol: string): Promise<NormalizedMarketQuote | null> {
    return MOCK_NORMALIZED_QUOTES.find((q) => q.symbol === symbol) ?? null;
  }

  async getQuotes(symbols: string[]): Promise<NormalizedMarketQuote[]> {
    return MOCK_NORMALIZED_QUOTES.filter((q) => symbols.includes(q.symbol));
  }

  async getHistoricalPrices(
    symbol: string,
    interval: string,
  ): Promise<HistoricalPrice[]> {
    void interval;
    const history = MOCK_PRICE_HISTORY.get(symbol);
    if (!history) return [];

    return history.map((s) => ({ timestamp: s.timestamp, price: s.price }));
  }

  async getPriceChange(
    symbol: string,
    windowMinutes: TimeWindowMinutes,
  ): Promise<WindowReturnDetail | null> {
    const history = MOCK_PRICE_HISTORY.get(symbol);
    if (!history) return null;

    return calculateWindowReturn(
      history.map((s) => ({
        assetId: MARKET_ASSETS.find((a) => a.symbol === symbol)?.assetId ?? symbol,
        symbol,
        price: s.price,
        timestamp: s.timestamp,
      })),
      windowMinutes,
    );
  }

  async getHealth(): Promise<ProviderHealthInfo> {
    const quote = MOCK_NORMALIZED_QUOTES[0];
    const ageMs = Date.now() - new Date(quote.timestamp).getTime();

    return {
      providerId: this.id,
      status: ageMs > STALE_DATA_THRESHOLD_MS ? "STALE" : "ONLINE",
      lastUpdate: quote.timestamp,
      latencyMs: 12,
    };
  }

  getMockHistory(): Map<string, { assetId: string; snapshots: { price: number; timestamp: string }[] }> {
    const result = new Map<string, { assetId: string; snapshots: { price: number; timestamp: string }[] }>();

    for (const asset of MARKET_ASSETS) {
      const history = MOCK_PRICE_HISTORY.get(asset.symbol);
      if (history) {
        result.set(asset.symbol, { assetId: asset.assetId, snapshots: history });
      }
    }

    return result;
  }
}

export { generateMockSnapshots };
