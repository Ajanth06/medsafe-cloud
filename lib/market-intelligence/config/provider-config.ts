import { getOilPriceApiConfig } from "@/lib/market-intelligence/config/oilpriceapi-config";

export interface MarketProviderConfig {
  provider: string;
  apiKey: string | null;
  restBaseUrl: string;
  websocketUrl: string;
  pollIntervalMs: number;
  websocketEnabled: boolean;
  /** True when any live quote path can run. */
  isConfigured: boolean;
  oilConfigured: boolean;
  polygonConfigured: boolean;
  yahooEnabled: boolean;
}

/**
 * Hybrid feed (default):
 * - WTI/Brent → OilPriceAPI (live)
 * - Rest → Yahoo Investing-style
 * - Polygon optional fallback when keyed
 */
export function getMarketProviderConfig(): MarketProviderConfig {
  const apiKey = process.env.MARKET_DATA_API_KEY ?? null;
  const provider = (process.env.MARKET_DATA_PROVIDER ?? "composite").toLowerCase();
  const oilConfigured = getOilPriceApiConfig().isConfigured;
  const polygonConfigured = Boolean(apiKey);

  // Yahoo is used for non-oil Investing-style quotes in the hybrid path
  const yahooEnabled = provider !== "mock" && provider !== "oilpriceapi";

  let isConfigured = false;
  switch (provider) {
    case "mock":
      isConfigured = false;
      break;
    case "polygon":
      isConfigured = polygonConfigured;
      break;
    case "oilpriceapi":
      isConfigured = oilConfigured;
      break;
    case "yahoo":
    case "investing":
    case "composite":
    default:
      // Hybrid always runs (Yahoo needs no key; oil preferred when keyed)
      isConfigured = true;
      break;
  }

  return {
    provider,
    apiKey,
    restBaseUrl:
      process.env.MARKET_DATA_REST_URL ?? "https://api.polygon.io",
    websocketUrl:
      process.env.MARKET_DATA_WEBSOCKET_URL ?? "wss://socket.polygon.io",
    pollIntervalMs: Number(process.env.MARKET_POLL_INTERVAL_MS ?? 1_000),
    websocketEnabled: process.env.MARKET_DATA_WEBSOCKET_ENABLED === "true",
    isConfigured,
    oilConfigured,
    polygonConfigured,
    yahooEnabled,
  };
}
