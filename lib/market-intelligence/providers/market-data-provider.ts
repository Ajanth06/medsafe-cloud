import type {
  HistoricalPrice,
  NormalizedMarketQuote,
  TimeWindowMinutes,
  WindowReturnDetail,
} from "@/lib/types/market";

export type QuoteUpdateCallback = (quote: NormalizedMarketQuote) => void;
export type Unsubscribe = () => void;

export interface ProviderHealthInfo {
  providerId: string;
  status: "ONLINE" | "OFFLINE" | "STALE" | "DEGRADED";
  lastUpdate: string | null;
  latencyMs?: number;
  error?: string;
}

/**
 * Abstraction for market data providers.
 * Implementations must run server-side; never expose API keys to the client.
 */
export interface MarketDataProvider {
  readonly id: string;
  readonly name: string;

  getQuote(symbol: string): Promise<NormalizedMarketQuote | null>;
  getQuotes(symbols: string[]): Promise<NormalizedMarketQuote[]>;
  getHistoricalPrices(symbol: string, interval: string): Promise<HistoricalPrice[]>;
  getIntradayBars?(
    symbol: string,
    intervalMinutes: number,
    limit?: number,
  ): Promise<HistoricalPrice[]>;
  getPriceChange(
    symbol: string,
    windowMinutes: TimeWindowMinutes,
  ): Promise<WindowReturnDetail | null>;
  getHealth(): Promise<ProviderHealthInfo>;
  supportsStreaming?(): boolean;
  subscribeToQuotes?(
    symbols: string[],
    callback: QuoteUpdateCallback,
  ): Unsubscribe;
}
