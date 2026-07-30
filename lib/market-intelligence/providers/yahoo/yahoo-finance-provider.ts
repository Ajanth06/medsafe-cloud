import { MARKET_ASSETS } from "@/lib/market-intelligence/config/assets";
import { getSymbolEntry } from "@/lib/market-intelligence/config/symbol-registry";
import { calculateWindowReturn } from "@/lib/market-intelligence/engine/returns-calculator";
import { getPriceHistoryBuffer } from "@/lib/market-intelligence/engine/price-history-buffer";
import type {
  MarketDataProvider,
  ProviderHealthInfo,
} from "@/lib/market-intelligence/providers/market-data-provider";
import { unavailableQuote } from "@/lib/market-intelligence/providers/polygon/polygon-normalizer";
import { validateTick } from "@/lib/market-intelligence/services/data-quality";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import type {
  HistoricalPrice,
  NormalizedMarketQuote,
  TimeWindowMinutes,
  WindowReturnDetail,
} from "@/lib/types/market";

/**
 * Yahoo Finance symbols that match Investing.com retail screens:
 * WTI → CL=F, Brent → BZ=F, DAX → ^GDAXI, etc.
 */
export const YAHOO_SYMBOL_MAP: Record<string, string> = Object.fromEntries(
  MARKET_ASSETS.map((a) => [a.symbol, a.providerSymbol]),
);

interface YahooChartMeta {
  regularMarketPrice?: number;
  previousClose?: number;
  chartPreviousClose?: number;
  regularMarketTime?: number;
  currency?: string;
  symbol?: string;
  instrumentType?: string;
  exchangeName?: string;
}

interface YahooChartResult {
  meta?: YahooChartMeta;
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      close?: Array<number | null>;
      open?: Array<number | null>;
      high?: Array<number | null>;
      low?: Array<number | null>;
    }>;
  };
}

/**
 * Retail/Investing-style quotes via Yahoo Finance chart API.
 * No API key. Delayed vs exchange last trade can differ slightly from Plus500 CFDs.
 */
export class YahooFinanceMarketDataProvider implements MarketDataProvider {
  readonly id = "yahoo";
  readonly name = "Yahoo Finance (Investing-style)";

  private readonly lastPrices = new Map<string, number>();
  private readonly cache = new Map<string, { at: number; meta: YahooChartMeta }>();
  private readonly cacheTtlMs = 20_000;

  supportsSymbol(symbol: string): boolean {
    return Boolean(YAHOO_SYMBOL_MAP[symbol]);
  }

  async getQuote(symbol: string): Promise<NormalizedMarketQuote | null> {
    const entry = getSymbolEntry(symbol);
    const yahooSymbol = YAHOO_SYMBOL_MAP[symbol];
    if (!entry || !yahooSymbol) return null;

    try {
      const meta = await this.fetchMeta(yahooSymbol);
      const price = meta.regularMarketPrice;
      if (!price || price <= 0) return unavailableQuote(entry);

      const receivedAt = new Date().toISOString();
      const processedAt = new Date().toISOString();
      const previousClose =
        meta.previousClose ??
        meta.chartPreviousClose ??
        this.lastPrices.get(symbol) ??
        price;
      const absoluteChange = price - previousClose;
      const percentageChange =
        previousClose !== 0 ? (absoluteChange / previousClose) * 100 : 0;
      const providerTimestamp = meta.regularMarketTime
        ? new Date(meta.regularMarketTime * 1000).toISOString()
        : receivedAt;

      const quote: NormalizedMarketQuote = {
        assetId: entry.assetId,
        symbol: entry.internalSymbol,
        providerSymbol: yahooSymbol,
        name: entry.name,
        instrumentLabel: investingStyleLabel(symbol, entry.instrumentLabel),
        assetClass: entry.assetClass,
        exchange: entry.exchange,
        currency: meta.currency ?? entry.currency,
        price,
        previousClose,
        absoluteChange,
        percentageChange,
        timestamp: providerTimestamp,
        receivedAt,
        processedAt,
        providerTimestamp,
        marketStatus: "OPEN",
        isRealtime: true,
        delaySeconds: 0,
        dataAvailability: "LIVE",
        source: "yahoo",
        staleAfterSeconds: entry.staleAfterSeconds,
        latency: {
          providerToServerMs:
            new Date(receivedAt).getTime() - new Date(providerTimestamp).getTime(),
          serverProcessingMs:
            new Date(processedAt).getTime() - new Date(receivedAt).getTime(),
          totalPipelineMs:
            new Date(processedAt).getTime() - new Date(providerTimestamp).getTime(),
        },
      };

      const validation = validateTick(quote, this.lastPrices.get(symbol));
      if (!validation.valid) {
        marketLogger.warn("Yahoo tick rejected", {
          symbol,
          reason: validation.reason,
        });
        return unavailableQuote(entry);
      }

      this.lastPrices.set(symbol, quote.price);
      return quote;
    } catch (error) {
      marketLogger.warn("Yahoo quote failed", {
        symbol,
        yahooSymbol,
        error: error instanceof Error ? error.message : String(error),
      });
      return unavailableQuote(entry);
    }
  }

  async getQuotes(symbols: string[]): Promise<NormalizedMarketQuote[]> {
    const supported = symbols.filter((s) => this.supportsSymbol(s));
    const results = await Promise.all(supported.map((s) => this.getQuote(s)));
    return results.filter((q): q is NormalizedMarketQuote => q !== null);
  }

  async getHistoricalPrices(
    symbol: string,
    _interval: string,
  ): Promise<HistoricalPrice[]> {
    const yahooSymbol = YAHOO_SYMBOL_MAP[symbol];
    if (!yahooSymbol) return [];
    try {
      const result = await this.fetchChart(yahooSymbol, "5m", "5d");
      const timestamps = result.timestamp ?? [];
      const closes = result.indicators?.quote?.[0]?.close ?? [];
      const out: HistoricalPrice[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        const close = closes[i];
        if (typeof close !== "number") continue;
        out.push({
          timestamp: new Date(timestamps[i] * 1000).toISOString(),
          price: close,
        });
      }
      return out;
    } catch {
      return [];
    }
  }

  async getPriceChange(
    symbol: string,
    windowMinutes: TimeWindowMinutes,
  ): Promise<WindowReturnDetail | null> {
    if (!this.supportsSymbol(symbol)) return null;
    const snapshots = getPriceHistoryBuffer().getSnapshots(symbol);
    if (snapshots.length < 2) await this.getQuote(symbol);
    return calculateWindowReturn(
      getPriceHistoryBuffer().getSnapshots(symbol),
      windowMinutes,
    );
  }

  async getHealth(): Promise<ProviderHealthInfo> {
    const start = Date.now();
    try {
      await this.fetchMeta("CL=F", true);
      return {
        providerId: this.id,
        status: "ONLINE",
        lastUpdate: new Date().toISOString(),
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        providerId: this.id,
        status: "OFFLINE",
        lastUpdate: null,
        error: error instanceof Error ? error.message : "Yahoo health failed",
      };
    }
  }

  private async fetchMeta(
    yahooSymbol: string,
    force = false,
  ): Promise<YahooChartMeta> {
    const cached = this.cache.get(yahooSymbol);
    if (!force && cached && Date.now() - cached.at < this.cacheTtlMs) {
      return cached.meta;
    }
    const result = await this.fetchChart(yahooSymbol, "1m", "1d");
    const meta = result.meta;
    if (!meta?.regularMarketPrice) {
      throw new Error(`No Yahoo price for ${yahooSymbol}`);
    }
    this.cache.set(yahooSymbol, { at: Date.now(), meta });
    return meta;
  }

  private async fetchChart(
    yahooSymbol: string,
    interval: string,
    range: string,
  ): Promise<YahooChartResult> {
    const url = new URL(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}`,
    );
    url.searchParams.set("interval", interval);
    url.searchParams.set("range", range);

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AARYX/1.0; +https://aaryx.app)",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Yahoo HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      chart?: { result?: YahooChartResult[]; error?: { description?: string } };
    };

    if (payload.chart?.error) {
      throw new Error(payload.chart.error.description ?? "Yahoo chart error");
    }

    const result = payload.chart?.result?.[0];
    if (!result) throw new Error(`Empty Yahoo chart for ${yahooSymbol}`);
    return result;
  }
}

function investingStyleLabel(symbol: string, fallback: string): string {
  switch (symbol) {
    case "WTI":
      return "WTI Futures (CL=F) — wie Investing";
    case "BRENT":
      return "Brent Futures (BZ=F) — wie Investing";
    case "GOLD":
      return "Gold Futures (GC=F) — wie Investing";
    case "DAX":
      return "DAX Cash Index (^GDAXI) — wie Investing";
    case "NDX":
      return "NASDAQ 100 (^NDX) — wie Investing";
    case "SPX":
      return "S&P 500 (^GSPC) — wie Investing";
    case "EURUSD":
      return "EUR/USD — wie Investing";
    case "BTC":
      return "Bitcoin (BTC-USD) — wie Investing";
    default:
      return fallback;
  }
}
