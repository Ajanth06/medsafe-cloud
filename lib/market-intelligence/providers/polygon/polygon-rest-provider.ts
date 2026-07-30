import { getMarketProviderConfig } from "@/lib/market-intelligence/config/provider-config";
import {
  SYMBOL_REGISTRY,
  getSymbolEntry,
  type SymbolRegistryEntry,
} from "@/lib/market-intelligence/config/symbol-registry";
import { calculateWindowReturn } from "@/lib/market-intelligence/engine/returns-calculator";
import {
  PolygonClient,
  type PolygonSnapshotTicker,
} from "@/lib/market-intelligence/providers/polygon/polygon-client";
import {
  normalizePolygonQuote,
  unavailableQuote,
} from "@/lib/market-intelligence/providers/polygon/polygon-normalizer";
import { PolygonSymbolResolver } from "@/lib/market-intelligence/providers/polygon/polygon-symbol-resolver";
import type {
  MarketDataProvider,
  ProviderHealthInfo,
} from "@/lib/market-intelligence/providers/market-data-provider";
import { detectContractRollover } from "@/lib/market-intelligence/services/contract-rollover";
import { validateTick } from "@/lib/market-intelligence/services/data-quality";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import type {
  DataAvailability,
  HistoricalPrice,
  NormalizedMarketQuote,
  TimeWindowMinutes,
  WindowReturnDetail,
} from "@/lib/types/market";
import { getPriceHistoryBuffer } from "@/lib/market-intelligence/engine/price-history-buffer";

/** Map Massive futures snapshot snake_case payload into normalizer shape. */
function mapFuturesSnapshot(
  row: PolygonSnapshotTicker,
  ticker: string,
): PolygonSnapshotTicker {
  const price = row.last_trade?.price ?? row.session?.close ?? row.lastTrade?.p;
  const tradeTs = row.last_trade?.last_updated ?? row.lastTrade?.t;
  const bid = row.last_quote?.bid ?? row.lastQuote?.p;
  const ask = row.last_quote?.ask ?? row.lastQuote?.P;
  const quoteTs =
    row.last_quote?.last_updated ??
    row.last_quote?.bid_timestamp ??
    row.lastQuote?.t;

  return {
    ...row,
    ticker: row.ticker ?? ticker,
    lastTrade:
      price != null
        ? { p: price, t: tradeTs }
        : row.lastTrade,
    lastQuote:
      bid != null || ask != null
        ? { p: bid, P: ask, t: quoteTs }
        : row.lastQuote,
    day: row.day ?? (row.session?.close != null ? { c: row.session.close } : undefined),
    todaysChangePerc: row.todaysChangePerc ?? row.session?.change_percent,
    updated: row.updated ?? tradeTs ?? quoteTs,
  };
}

export class PolygonRestMarketDataProvider implements MarketDataProvider {
  readonly id = "polygon";
  readonly name = "Polygon.io";

  private client: PolygonClient;
  private resolver: PolygonSymbolResolver;
  private lastPrices = new Map<string, number>();
  private planIsDelayed: boolean | null = null;

  constructor(apiKey?: string) {
    const config = getMarketProviderConfig();
    const key = apiKey ?? config.apiKey ?? "";
    this.client = new PolygonClient(key, config.restBaseUrl);
    this.resolver = new PolygonSymbolResolver(this.client);
  }

  supportsStreaming(): boolean {
    return true;
  }

  async getQuote(symbol: string): Promise<NormalizedMarketQuote | null> {
    const entry = getSymbolEntry(symbol);
    if (!entry) return null;
    const quotes = await this.fetchQuoteForEntry(entry);
    return quotes;
  }

  async getQuotes(symbols: string[]): Promise<NormalizedMarketQuote[]> {
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          return await this.getQuote(symbol);
        } catch {
          const entry = getSymbolEntry(symbol);
          return entry ? unavailableQuote(entry) : null;
        }
      }),
    );
    return results.filter((q): q is NormalizedMarketQuote => q !== null);
  }

  private async fetchQuoteForEntry(
    entry: SymbolRegistryEntry,
  ): Promise<NormalizedMarketQuote | null> {
    const receivedAt = new Date().toISOString();

    const resolved = await this.resolver.resolveFrontMonth(entry);
    if (!resolved) {
      return unavailableQuote(entry);
    }

    const snapshot = await this.fetchSnapshot(entry, resolved.contractSymbol);
    if (!snapshot) {
      return unavailableQuote(entry);
    }

    const processedAt = new Date().toISOString();
    const { isRealtime, delaySeconds, availability } = this.resolveAvailability(entry);

    const contract = entry.polygon.productCode
      ? {
          contractSymbol: resolved.contractSymbol,
          productCode: entry.polygon.productCode,
          expirationDate: resolved.expirationDate,
          isFrontMonth: true,
          exchange: entry.exchange,
        }
      : undefined;

    const quote = normalizePolygonQuote({
      entry,
      contractSymbol: resolved.contractSymbol,
      contract,
      snapshot,
      receivedAt,
      processedAt,
      latencyMs: null,
      isRealtime,
      delaySeconds,
      dataAvailability: availability,
    });

    if (!quote) return unavailableQuote(entry);

    const validation = validateTick(quote, this.lastPrices.get(entry.internalSymbol));
    if (!validation.valid) {
      marketLogger.warn("Invalid tick rejected", {
        symbol: entry.internalSymbol,
        reason: validation.reason,
      });
      return unavailableQuote(entry);
    }

    if (contract) {
      const rollover = detectContractRollover(
        entry.internalSymbol,
        contract,
        quote.price,
        this.lastPrices.get(entry.internalSymbol),
      );
      if (rollover.rolloverDetected) {
        quote.contract = { ...contract, rolloverDetected: true };
        marketLogger.info("Contract rollover detected", {
          symbol: entry.internalSymbol,
          gap: rollover.priceGapPercent,
        });
      }
    }

    this.lastPrices.set(entry.internalSymbol, quote.price);
    return quote;
  }

  private async fetchSnapshot(
    entry: SymbolRegistryEntry,
    ticker: string,
  ): Promise<PolygonSnapshotTicker | null> {
    const { market } = entry.polygon;

    try {
      if (market === "futures") {
        // Correct endpoint: GET /futures/v1/snapshot?ticker=CLU6 (not /snapshot/{ticker})
        const response = await this.client.fetchJson<{
          results?: PolygonSnapshotTicker[] | PolygonSnapshotTicker;
        }>("/futures/v1/snapshot", { ticker });
        const results = response.results;
        const row = Array.isArray(results) ? results[0] : results;
        return row ? mapFuturesSnapshot(row, ticker) : null;
      }

      if (market === "forex") {
        const response = await this.client.fetchJson<{
          ticker?: PolygonSnapshotTicker;
        }>(`/v2/snapshot/locale/global/markets/forex/tickers/${encodeURIComponent(ticker)}`);
        return response.ticker ?? null;
      }

      if (market === "crypto") {
        const response = await this.client.fetchJson<{
          ticker?: PolygonSnapshotTicker;
        }>(`/v2/snapshot/locale/global/markets/crypto/tickers/${encodeURIComponent(ticker)}`);
        return response.ticker ?? null;
      }

      if (market === "indices") {
        const response = await this.client.fetchJson<{
          results?: PolygonSnapshotTicker;
        }>(`/v3/snapshot/indices`, { ticker: ticker });
        return response.results ?? null;
      }
    } catch (error) {
      marketLogger.warn("Snapshot fetch failed, trying v2 aggs fallback", {
        symbol: entry.internalSymbol,
        ticker,
        error: error instanceof Error ? error.message : String(error),
      });

      return this.fetchAggsFallback(ticker);
    }

    return null;
  }

  private async fetchAggsFallback(ticker: string): Promise<PolygonSnapshotTicker | null> {
    try {
      const response = await this.client.fetchJson<{
        results?: { c: number; o: number; t: number }[];
      }>(`/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/minute/${this.dateDaysAgo(1)}/${this.today()}`);

      const bars = response.results;
      if (!bars?.length) return null;

      const last = bars[bars.length - 1];
      const prev = bars.length > 1 ? bars[bars.length - 2] : last;

      return {
        ticker,
        day: { c: last.c, o: last.o },
        prevDay: { c: prev.c },
        lastTrade: { p: last.c, t: last.t },
        todaysChangePerc: prev.c ? ((last.c - prev.c) / prev.c) * 100 : 0,
      };
    } catch {
      return null;
    }
  }

  private resolveAvailability(entry: SymbolRegistryEntry): {
    isRealtime: boolean;
    delaySeconds: number;
    availability: DataAvailability;
  } {
    const delay = entry.polygon.defaultDelaySeconds;
    const isDelayed = this.planIsDelayed ?? delay > 0;

    return {
      isRealtime: !isDelayed,
      delaySeconds: isDelayed ? delay : 0,
      availability: isDelayed ? "DELAYED" : "LIVE",
    };
  }

  async getHistoricalPrices(
    symbol: string,
    interval: string,
  ): Promise<HistoricalPrice[]> {
    const entry = getSymbolEntry(symbol);
    if (!entry) return [];

    const resolved = await this.resolver.resolveFrontMonth(entry);
    if (!resolved) return [];

    const multiplier = interval === "1h" ? 60 : 1;
    const timespan = interval === "1h" ? "minute" : "minute";

    const response = await this.client.fetchJson<{
      results?: { c: number; t: number }[];
    }>(
      `/v2/aggs/ticker/${encodeURIComponent(resolved.contractSymbol)}/range/${multiplier}/${timespan}/${this.dateDaysAgo(1)}/${this.today()}`,
    );

    return (response.results ?? []).map((bar) => ({
      timestamp: new Date(bar.t).toISOString(),
      price: bar.c,
    }));
  }

  async getPriceChange(
    symbol: string,
    windowMinutes: TimeWindowMinutes,
  ): Promise<WindowReturnDetail | null> {
    const snapshots = getPriceHistoryBuffer().getSnapshots(symbol);
    return calculateWindowReturn(snapshots, windowMinutes);
  }

  async getHealth(): Promise<ProviderHealthInfo> {
    const config = getMarketProviderConfig();
    if (!config.apiKey) {
      return {
        providerId: this.id,
        status: "OFFLINE",
        lastUpdate: null,
        error: "API key not configured",
      };
    }

    try {
      const start = Date.now();
      await this.client.fetchJson("/v3/reference/tickers", { limit: "1" });
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
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  getTrackedEntries(): SymbolRegistryEntry[] {
    return SYMBOL_REGISTRY;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private dateDaysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }
}
