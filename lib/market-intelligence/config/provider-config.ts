import { getOilPriceApiConfig } from "@/lib/market-intelligence/config/oilpriceapi-config";

export interface MarketProviderConfig {
  provider: string;
  apiKey: string | null;
  restBaseUrl: string;
  websocketUrl: string;
  pollIntervalMs: number;
  websocketEnabled: boolean;
  /** True when the active quote path can run (Yahoo needs no key). */
  isConfigured: boolean;
  oilConfigured: boolean;
  polygonConfigured: boolean;
  yahooEnabled: boolean;
}

/**
 * Default market feed is hybrid:
 * OilPriceAPI for WTI/Brent, Polygon for the rest, Yahoo only as fallback.
 */
export function getMarketProviderConfig(): MarketProviderConfig {
  const apiKey = process.env.MARKET_DATA_API_KEY ?? null;
  const provider = (process.env.MARKET_DATA_PROVIDER ?? "composite").toLowerCase();
  const oilConfigured = getOilPriceApiConfig().isConfigured;
  const polygonConfigured = Boolean(apiKey);

  const yahooEnabled =
    provider === "yahoo" ||
    provider === "investing" ||
    (provider === "composite" && !polygonConfigured);

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
    case "composite":
      isConfigured = oilConfigured || polygonConfigured || yahooEnabled;
      break;
    case "yahoo":
    case "investing":
    default:
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
    pollIntervalMs: Number(process.env.MARKET_POLL_INTERVAL_MS ?? 5_000),
    websocketEnabled: process.env.MARKET_DATA_WEBSOCKET_ENABLED === "true",
    isConfigured,
    oilConfigured,
    polygonConfigured,
    yahooEnabled,
  };
}
