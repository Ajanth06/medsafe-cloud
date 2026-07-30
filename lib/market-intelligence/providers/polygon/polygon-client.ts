import { PROVIDER_TIMEOUT_MS } from "@/lib/market-intelligence/config/constants";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";

export class PolygonClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = "https://api.polygon.io",
  ) {}

  async fetchJson<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set("apiKey", this.apiKey);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
    const receivedAt = Date.now();

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        const detail = `Polygon HTTP ${response.status}: ${body.slice(0, 200)}`;
        const isPlanOrRateLimit = response.status === 403 || response.status === 429;
        if (isPlanOrRateLimit) {
          marketLogger.warn(`Polygon API ${response.status} (${path}) — Plan-Limit oder Rate-Limit`);
        } else {
          marketLogger.error(`Polygon API request failed: ${detail}`, { path });
        }
        throw new Error(detail);
      }

      const data = (await response.json()) as T;
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Polygon HTTP")) {
        throw error;
      }
      const msg = error instanceof Error ? error.message : String(error);
      marketLogger.error(`Polygon API request failed: ${msg}`, { path });
      throw error;
    } finally {
      clearTimeout(timeout);
      void receivedAt;
    }
  }
}

export interface PolygonFuturesContract {
  ticker: string;
  product_code?: string;
  expiration_date?: string;
  last_trade_date?: string;
  active?: boolean;
  type?: string;
  name?: string;
}

export interface PolygonSnapshotTicker {
  ticker?: string;
  todaysChangePerc?: number;
  todaysChange?: number;
  day?: { c?: number; o?: number; h?: number; l?: number };
  lastTrade?: { p?: number; t?: number };
  lastQuote?: { P?: number; p?: number; t?: number };
  prevDay?: { c?: number };
  session?: { change_percent?: number; change?: number; close?: number };
  fmvs?: { fmv?: number };
  updated?: number;
  /** Futures snapshot snake_case fields */
  last_trade?: { price?: number; size?: number; last_updated?: number };
  last_quote?: {
    ask?: number;
    bid?: number;
    ask_timestamp?: number;
    bid_timestamp?: number;
    last_updated?: number;
  };
  product_code?: string;
}
