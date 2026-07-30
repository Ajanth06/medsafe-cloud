import { getOilPriceApiConfig } from "@/lib/market-intelligence/config/oilpriceapi-config";
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

/** OilPriceAPI commodity codes for AARYX primary oil symbols. */
export const OILPRICEAPI_CODES: Record<"WTI" | "BRENT", string> = {
  WTI: "WTI_USD",
  BRENT: "BRENT_CRUDE_USD",
};

export const OILPRICEAPI_SYMBOLS = Object.keys(OILPRICEAPI_CODES) as Array<
  keyof typeof OILPRICEAPI_CODES
>;

interface OilPriceLatestItem {
  price?: number;
  formatted?: string;
  currency?: string;
  code?: string;
  name?: string;
  created_at?: string;
  updated_at?: string;
  source_timestamp?: string;
  change_24h?: number | null;
  type?: string;
}

interface OilPriceLatestResponse {
  status?: string;
  data?:
    | OilPriceLatestItem
    | OilPriceLatestItem[]
    | { prices?: OilPriceLatestItem[]; price?: number; code?: string };
}

export class OilPriceApiProvider implements MarketDataProvider {
  readonly id = "oilpriceapi";
  readonly name = "OilPriceAPI";

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly lastPrices = new Map<string, number>();
  private cache: { at: number; byCode: Map<string, OilPriceLatestItem> } | null = null;
  /** Short cache so 1s UI polls stay near-live without duplicate in-flight spam. */
  private readonly cacheTtlMs = 1_000;

  constructor(apiKey?: string) {
    const config = getOilPriceApiConfig();
    this.apiKey = apiKey ?? config.apiKey ?? "";
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
  }

  supportsSymbol(symbol: string): boolean {
    return symbol === "WTI" || symbol === "BRENT";
  }

  async getQuote(symbol: string): Promise<NormalizedMarketQuote | null> {
    if (!this.supportsSymbol(symbol)) return null;
    const entry = getSymbolEntry(symbol);
    if (!entry) return null;

    try {
      const item = await this.fetchLatestForSymbol(symbol as "WTI" | "BRENT");
      if (!item?.price || item.price <= 0) return unavailableQuote(entry);

      const receivedAt = new Date().toISOString();
      const processedAt = new Date().toISOString();
      const providerTimestamp =
        item.updated_at ?? item.source_timestamp ?? item.created_at ?? receivedAt;

      // Prefer API 24h change when buffer has no prior tick yet
      let previousClose = this.lastPrices.get(symbol);
      let absoluteChange: number;
      let percentageChange: number;

      if (previousClose != null && previousClose > 0) {
        absoluteChange = item.price - previousClose;
        percentageChange = (absoluteChange / previousClose) * 100;
      } else if (typeof item.change_24h === "number") {
        percentageChange = item.change_24h;
        previousClose =
          percentageChange !== -100
            ? item.price / (1 + percentageChange / 100)
            : item.price;
        absoluteChange = item.price - previousClose;
      } else {
        previousClose = item.price;
        absoluteChange = 0;
        percentageChange = 0;
      }

      const quote: NormalizedMarketQuote = {
        assetId: entry.assetId,
        symbol: entry.internalSymbol,
        providerSymbol: OILPRICEAPI_CODES[symbol as "WTI" | "BRENT"],
        name: entry.name,
        instrumentLabel: "WTI/Brent Live (OilPriceAPI)",
        assetClass: entry.assetClass,
        exchange: entry.exchange,
        currency: entry.currency,
        price: item.price,
        previousClose,
        absoluteChange,
        percentageChange,
        // Freshness = last successful fetch. OilPriceAPI updated_at can be
        // several minutes old even while the feed is healthy.
        timestamp: receivedAt,
        receivedAt,
        processedAt,
        providerTimestamp,
        marketStatus: "OPEN",
        isRealtime: true,
        // Don't surface source-print lag as "Verzögerung" — feed is poll-live.
        delaySeconds: 0,
        dataAvailability: "LIVE",
        source: "oilpriceapi",
        // Cover poll interval + buffer so healthy oil polls aren't "Veraltet"
        staleAfterSeconds: Math.max(entry.staleAfterSeconds, 120),
        latency: {
          // UI latency = fetch processing, not OilPriceAPI print age
          providerToServerMs: Math.max(
            0,
            new Date(processedAt).getTime() - new Date(receivedAt).getTime(),
          ),
          serverProcessingMs:
            new Date(processedAt).getTime() - new Date(receivedAt).getTime(),
          totalPipelineMs:
            new Date(processedAt).getTime() - new Date(receivedAt).getTime(),
        },
      };

      const validation = validateTick(quote, this.lastPrices.get(symbol));
      if (!validation.valid) {
        marketLogger.warn("OilPriceAPI tick rejected", {
          symbol,
          reason: validation.reason,
        });
        return unavailableQuote(entry);
      }

      this.lastPrices.set(symbol, quote.price);
      return quote;
    } catch (error) {
      marketLogger.warn("OilPriceAPI quote failed", {
        symbol,
        error: error instanceof Error ? error.message : String(error),
      });
      return unavailableQuote(entry);
    }
  }

  async getQuotes(symbols: string[]): Promise<NormalizedMarketQuote[]> {
    const oilSymbols = symbols.filter((s) => this.supportsSymbol(s));
    if (oilSymbols.length === 0) return [];

    // Warm cache once for all oil symbols
    await this.refreshCache().catch(() => undefined);

    const results = await Promise.all(oilSymbols.map((s) => this.getQuote(s)));
    return results.filter((q): q is NormalizedMarketQuote => q !== null);
  }

  async getHistoricalPrices(
    symbol: string,
    _interval: string,
  ): Promise<HistoricalPrice[]> {
    if (!this.supportsSymbol(symbol)) return [];
    try {
      const code = OILPRICEAPI_CODES[symbol as "WTI" | "BRENT"];
      const data = await this.fetchJson<{
        data?:
          | Array<{ price?: number; created_at?: string; date?: string; updated_at?: string }>
          | {
              prices?: Array<{
                price?: number;
                created_at?: string;
                date?: string;
                updated_at?: string;
              }>;
            };
      }>("/prices/past_day", { by_code: code });

      const rows = Array.isArray(data.data)
        ? data.data
        : data.data && "prices" in data.data && Array.isArray(data.data.prices)
          ? data.data.prices
          : [];

      return rows
        .filter((r) => typeof r.price === "number")
        .map((r) => ({
          timestamp: r.updated_at ?? r.created_at ?? r.date ?? new Date().toISOString(),
          price: r.price!,
        }));
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
    if (snapshots.length < 2) {
      await this.getQuote(symbol);
    }
    return calculateWindowReturn(
      getPriceHistoryBuffer().getSnapshots(symbol),
      windowMinutes,
    );
  }

  async getHealth(): Promise<ProviderHealthInfo> {
    if (!this.apiKey) {
      return {
        providerId: this.id,
        status: "OFFLINE",
        lastUpdate: null,
        error: "OILPRICEAPI_KEY missing",
      };
    }
    const start = Date.now();
    try {
      await this.refreshCache(true);
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
        error: error instanceof Error ? error.message : "OilPriceAPI health failed",
      };
    }
  }

  private async fetchLatestForSymbol(
    symbol: "WTI" | "BRENT",
  ): Promise<OilPriceLatestItem | null> {
    await this.refreshCache();
    const code = OILPRICEAPI_CODES[symbol];
    return this.cache?.byCode.get(code) ?? null;
  }

  private async refreshCache(force = false): Promise<void> {
    if (
      !force &&
      this.cache &&
      Date.now() - this.cache.at < this.cacheTtlMs
    ) {
      return;
    }

    const codes = Object.values(OILPRICEAPI_CODES).join(",");
    const payload = await this.fetchJson<OilPriceLatestResponse>("/prices/latest", {
      by_code: codes,
    });

    const items = normalizeLatestPayload(payload);
    const byCode = new Map<string, OilPriceLatestItem>();
    for (const item of items) {
      if (item.code) byCode.set(item.code, item);
    }
    this.cache = { at: Date.now(), byCode };
  }

  private async fetchJson<T>(
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Token ${this.apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`OilPriceAPI HTTP ${response.status}: ${body.slice(0, 200)}`);
    }

    return (await response.json()) as T;
  }
}

function normalizeLatestPayload(
  payload: OilPriceLatestResponse,
): OilPriceLatestItem[] {
  if (!payload.data) return [];
  if (Array.isArray(payload.data)) return payload.data;
  // Multi-code: { data: { prices: [...] } }
  if ("prices" in payload.data && Array.isArray(payload.data.prices)) {
    return payload.data.prices;
  }
  // Single-code: { data: { price, code, ... } }
  return [payload.data as OilPriceLatestItem];
}
