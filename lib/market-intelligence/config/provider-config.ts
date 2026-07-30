import { getOilPriceApiConfig } from "@/lib/market-intelligence/config/oilpriceapi-config";

export interface MarketProviderConfig {
  provider: string;
  apiKey: string | null;
  restBaseUrl: string;
  websocketUrl: string;
  pollIntervalMs: number;
  websocketEnabled: boolean;
  /** True when OilPriceAPI and/or Polygon is keyed for live quotes. */
  isConfigured: boolean;
  oilConfigured: boolean;
  polygonConfigured: boolean;
}

export function getMarketProviderConfig(): MarketProviderConfig {
  const apiKey = process.env.MARKET_DATA_API_KEY ?? null;
  const provider = process.env.MARKET_DATA_PROVIDER ?? "mock";
  const oilConfigured = getOilPriceApiConfig().isConfigured;
  const polygonConfigured = Boolean(apiKey && provider !== "mock");

  return {
    provider,
    apiKey,
    restBaseUrl:
      process.env.MARKET_DATA_REST_URL ?? "https://api.polygon.io",
    websocketUrl:
      process.env.MARKET_DATA_WEBSOCKET_URL ?? "wss://socket.polygon.io",
    pollIntervalMs: Number(process.env.MARKET_POLL_INTERVAL_MS ?? 5_000),
    websocketEnabled: process.env.MARKET_DATA_WEBSOCKET_ENABLED === "true",
    isConfigured: oilConfigured || polygonConfigured,
    oilConfigured,
    polygonConfigured,
  };
}
