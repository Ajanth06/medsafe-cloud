import { MARKET_ASSETS } from "@/lib/market-intelligence/config/assets";
import { PROVIDER_TIMEOUT_MS } from "@/lib/market-intelligence/config/constants";
import { getSymbolEntry } from "@/lib/market-intelligence/config/symbol-registry";
import { calculateWindowReturn } from "@/lib/market-intelligence/engine/returns-calculator";
import { getPriceHistoryBuffer } from "@/lib/market-intelligence/engine/price-history-buffer";
import type {
  MarketDataProvider,
  ProviderHealthInfo,
} from "@/lib/market-intelligence/providers/market-data-provider";
import { validateTick } from "@/lib/market-intelligence/services/data-quality";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import type { SymbolRegistryEntry } from "@/lib/market-intelligence/config/symbol-registry";
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

const YAHOO_TO_INTERNAL: Record<string, string> = Object.fromEntries(
  Object.entries(YAHOO_SYMBOL_MAP).map(([internal, yahoo]) => [yahoo, internal]),
);

interface YahooQuoteMeta {
  regularMarketPrice?: number;
  previousClose?: number;
  chartPreviousClose?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: number;
  currency?: string;
  symbol?: string;
}

interface YahooChartResult {
  meta?: YahooQuoteMeta;
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      close?: Array<number | null>;
    }>;
  };
}

/**
 * Investing-style quotes via Yahoo:
 * - /v7/finance/quote for fresher futures ticks (CL=F / BZ=F)
 * - chart API as fallback / history
 */
export class YahooFinanceMarketDataProvider implements MarketDataProvider {
  readonly id = "yahoo";
  readonly name = "Yahoo Finance (Investing-style)";

  private readonly lastPrices = new Map<string, number>();
  private readonly quoteCache = new Map<string, { at: number; meta: YahooQuoteMeta }>();

  supportsSymbol(symbol: string): boolean {
    return Boolean(YAHOO_SYMBOL_MAP[symbol]);
  }

  async getQuote(symbol: string): Promise<NormalizedMarketQuote | null> {
    const entry = getSymbolEntry(symbol);
    const yahooSymbol = YAHOO_SYMBOL_MAP[symbol];
    if (!entry || !yahooSymbol) return null;

    try {
      const meta = await this.resolveMeta(yahooSymbol, symbol);
      const price = meta.regularMarketPrice;
      if (!price || price <= 0) return yahooUnavailableQuote(entry, yahooSymbol);

      const receivedAt = new Date().toISOString();
      const processedAt = new Date().toISOString();
      const previousClose =
        meta.previousClose ??
        meta.chartPreviousClose ??
        this.lastPrices.get(symbol) ??
        price;
      const absoluteChange =
        meta.regularMarketChange ?? price - previousClose;
      const percentageChange =
        meta.regularMarketChangePercent ??
        (previousClose !== 0 ? (absoluteChange / previousClose) * 100 : 0);
      const providerTimestamp = meta.regularMarketTime
        ? new Date(meta.regularMarketTime * 1000).toISOString()
        : receivedAt;
      const ageMs =
        new Date(receivedAt).getTime() - new Date(providerTimestamp).getTime();
      const sessionStale = ageMs > 3 * 60 * 60 * 1000;
      const isOil = symbol === "WTI" || symbol === "BRENT";
      const treatAsLive = entry.assetClass === "crypto" || isOil || !sessionStale;

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
        timestamp: receivedAt,
        receivedAt,
        processedAt,
        providerTimestamp,
        marketStatus: sessionStale ? "CLOSED" : "OPEN",
        isRealtime: treatAsLive,
        delaySeconds: 0,
        dataAvailability: treatAsLive ? "LIVE" : "DELAYED",
        source: "yahoo",
        staleAfterSeconds: isOil ? 8 : Math.max(entry.staleAfterSeconds, 90),
        latency: {
          providerToServerMs: 0,
          serverProcessingMs:
            new Date(processedAt).getTime() - new Date(receivedAt).getTime(),
          totalPipelineMs:
            new Date(processedAt).getTime() - new Date(receivedAt).getTime(),
        },
      };

      const validation = validateTick(
        { ...quote, providerTimestamp: receivedAt },
        this.lastPrices.get(symbol),
      );
      if (!validation.valid) {
        marketLogger.warn("Yahoo tick rejected", {
          symbol,
          reason: validation.reason,
        });
        return yahooUnavailableQuote(entry, yahooSymbol);
      }

      this.lastPrices.set(symbol, quote.price);
      return quote;
    } catch (error) {
      marketLogger.warn("Yahoo quote failed", {
        symbol,
        yahooSymbol,
        error: error instanceof Error ? error.message : String(error),
      });
      return yahooUnavailableQuote(entry, yahooSymbol);
    }
  }

  async getQuotes(symbols: string[]): Promise<NormalizedMarketQuote[]> {
    const supported = symbols.filter((s) => this.supportsSymbol(s));
    if (supported.length === 0) return [];

    const yahooSymbols = supported
      .map((s) => YAHOO_SYMBOL_MAP[s])
      .filter(Boolean) as string[];

    // One network round per symbol, then build quotes from warmed cache.
    try {
      const batch = await this.fetchQuoteBatch(yahooSymbols);
      const now = Date.now();
      for (const [sym, meta] of batch) {
        this.quoteCache.set(sym, { at: now, meta });
      }
    } catch (error) {
      marketLogger.warn("Yahoo batch quote failed — per-symbol fallback", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const results = await Promise.all(supported.map((s) => this.getQuote(s)));
    return results.filter((q): q is NormalizedMarketQuote => q !== null);
  }

  async getHistoricalPrices(
    symbol: string,
    interval: string,
  ): Promise<HistoricalPrice[]> {
    const yahooSymbol = YAHOO_SYMBOL_MAP[symbol];
    if (!yahooSymbol) return [];
    try {
      const request = toYahooHistoryRequest(interval);
      const result = await this.fetchChart(
        yahooSymbol,
        request.interval,
        request.range,
      );
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
      await this.fetchQuoteBatch(["CL=F"]);
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

  private async resolveMeta(
    yahooSymbol: string,
    internalSymbol: string,
  ): Promise<YahooQuoteMeta> {
    const isOil = internalSymbol === "WTI" || internalSymbol === "BRENT";
    const cached = this.quoteCache.get(yahooSymbol);
    // Oil: short cache (2s) so 1s UI can reuse while poll cadence stays smooth
    const ttlMs = isOil ? 2_000 : 5_000;
    if (cached && Date.now() - cached.at < ttlMs) {
      return cached.meta;
    }

    const chart = await this.fetchChart(yahooSymbol, "1m", "1d");
    const internal = YAHOO_TO_INTERNAL[yahooSymbol];
    if (internal) seedPriceHistoryFromChart(internal, chart);
    const latest = extractLatestBar(chart);
    const meta: YahooQuoteMeta = {
      ...chart.meta,
      regularMarketPrice: latest?.price ?? chart.meta?.regularMarketPrice,
      previousClose:
        chart.meta?.previousClose ?? chart.meta?.chartPreviousClose,
      regularMarketTime: latest?.timeSec ?? chart.meta?.regularMarketTime,
    };
    if (!meta.regularMarketPrice) {
      throw new Error(`No Yahoo price for ${yahooSymbol}`);
    }
    this.quoteCache.set(yahooSymbol, { at: Date.now(), meta });
    return meta;
  }

  private async fetchQuoteBatch(
    yahooSymbols: string[],
  ): Promise<Map<string, YahooQuoteMeta>> {
    // Chart-first batch: parallel 1m charts (quote v7 often 401 without cookies)
    const entries = await Promise.all(
      yahooSymbols.map(async (yahooSymbol) => {
        const chart = await this.fetchChart(yahooSymbol, "1m", "1d");
        const internal = YAHOO_TO_INTERNAL[yahooSymbol];
        if (internal) seedPriceHistoryFromChart(internal, chart);
        const latest = extractLatestBar(chart);
        const meta: YahooQuoteMeta = {
          ...chart.meta,
          regularMarketPrice: latest?.price ?? chart.meta?.regularMarketPrice,
          previousClose:
            chart.meta?.previousClose ?? chart.meta?.chartPreviousClose,
          regularMarketTime: latest?.timeSec ?? chart.meta?.regularMarketTime,
        };
        return [yahooSymbol, meta] as const;
      }),
    );
    return new Map(entries.filter(([, m]) => Boolean(m.regularMarketPrice)));
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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; AARYX/1.0; +https://aaryx.app)",
          Accept: "application/json",
        },
        cache: "no-store",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`Yahoo chart HTTP ${response.status}`);
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

function extractLatestBar(
  chart: YahooChartResult,
): { price: number; timeSec: number } | null {
  const timestamps = chart.timestamp ?? [];
  const closes = chart.indicators?.quote?.[0]?.close ?? [];
  for (let i = timestamps.length - 1; i >= 0; i--) {
    const close = closes[i];
    if (typeof close === "number" && close > 0) {
      return { price: close, timeSec: timestamps[i] };
    }
  }
  return null;
}

/** Keep 1m bars in the anomaly buffer so 5–15m windows work without a worker. */
const historySeedAt = new Map<string, number>();
const HISTORY_SEED_TTL_MS = 60_000;

function seedPriceHistoryFromChart(
  internalSymbol: string,
  chart: YahooChartResult,
): void {
  const entry = getSymbolEntry(internalSymbol);
  if (!entry) return;

  const existing = getPriceHistoryBuffer().getSnapshots(internalSymbol);
  const lastSeed = historySeedAt.get(internalSymbol) ?? 0;
  if (
    existing.length >= 20 &&
    Date.now() - lastSeed < HISTORY_SEED_TTL_MS
  ) {
    return;
  }

  const timestamps = chart.timestamp ?? [];
  const closes = chart.indicators?.quote?.[0]?.close ?? [];
  const snaps: { assetId: string; symbol: string; price: number; timestamp: string }[] =
    [];

  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i];
    if (typeof close !== "number" || close <= 0) continue;
    snaps.push({
      assetId: entry.assetId,
      symbol: internalSymbol,
      price: close,
      timestamp: new Date(timestamps[i] * 1000).toISOString(),
    });
  }

  if (snaps.length < 2) return;
  getPriceHistoryBuffer().setSnapshots(internalSymbol, snaps.slice(-90));
  historySeedAt.set(internalSymbol, Date.now());
}

function yahooUnavailableQuote(
  entry: SymbolRegistryEntry,
  yahooSymbol: string,
): NormalizedMarketQuote {
  const now = new Date().toISOString();
  return {
    assetId: entry.assetId,
    symbol: entry.internalSymbol,
    providerSymbol: yahooSymbol,
    name: entry.name,
    instrumentLabel: entry.instrumentLabel,
    assetClass: entry.assetClass,
    exchange: entry.exchange,
    currency: entry.currency,
    price: 0,
    previousClose: 0,
    absoluteChange: 0,
    percentageChange: 0,
    timestamp: now,
    receivedAt: now,
    processedAt: now,
    providerTimestamp: null,
    marketStatus: "CLOSED",
    isRealtime: false,
    delaySeconds: 0,
    dataAvailability: "UNAVAILABLE",
    source: "yahoo",
    staleAfterSeconds: entry.staleAfterSeconds,
  };
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

function toYahooHistoryRequest(interval: string): {
  interval: string;
  range: string;
} {
  switch (interval) {
    case "1m":
      return { interval: "1m", range: "1d" };
    case "5m":
      return { interval: "5m", range: "5d" };
    case "15m":
      return { interval: "15m", range: "5d" };
    case "30m":
      return { interval: "30m", range: "1mo" };
    case "1h":
    case "60m":
      return { interval: "60m", range: "1mo" };
    case "1d":
      return { interval: "1d", range: "6mo" };
    default:
      return { interval: "5m", range: "5d" };
  }
}
