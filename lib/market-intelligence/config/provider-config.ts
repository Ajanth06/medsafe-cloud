import { getOilPriceApiConfig } from "@/lib/market-intelligence/config/oilpriceapi-config";

export interface MarketProviderConfig {
  provider: string;
  apiKey: string | null;
  restBaseUrl: string;
  websocketUrl: string;
  pollIntervalMs: number;
  websocketEnabled: boolean;
  /** True when any live quote path is available (Yahoo / Oil / Polygon). */
  isConfigured: boolean;
  oilConfigured: boolean;
  polygonConfigured: boolean;
  yahooEnabled: boolean;
}

export function getMarketProviderConfig(): MarketProviderConfig {
  const apiKey = process.env.MARKET_DATA_API_KEY ?? null;
  const provider = process.env.MARKET_DATA_PROVIDER ?? "yahoo";
  const quoteStyle = (process.env.MARKET_QUOTE_STYLE ?? "investing").toLowerCase();
  const oilConfigured = getOilPriceApiConfig().isConfigured;
  // Polygon used as optional fallback whenever a key exists
  const polygonConfigured = Boolean(apiKey);
  const yahooEnabled =
    quoteStyle !== "exchange" &&
    provider !== "mock" &&
    provider !== "oilpriceapi";

  return {
    provider,
    apiKey,
    restBaseUrl:
      process.env.MARKET_DATA_REST_URL ?? "https://api.polygon.io",
    websocketUrl:
      process.env.MARKET_DATA_WEBSOCKET_URL ?? "wss://socket.polygon.io",
    pollIntervalMs: Number(process.env.MARKET_POLL_INTERVAL_MS ?? 5_000),
    websocketEnabled: process.env.MARKET_DATA_WEBSOCKET_ENABLED === "true",
    isConfigured: yahooEnabled || oilConfigured || polygonConfigured,
    oilConfigured,
    polygonConfigured,
    yahooEnabled,
  };
}
