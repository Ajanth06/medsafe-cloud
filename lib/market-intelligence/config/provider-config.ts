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
 * Default: Yahoo Investing-style quotes. OilPriceAPI optional oil fallback.
 * Polygon only if POLYGON_AS_FALLBACK=true (or provider=polygon).
 */
export function getMarketProviderConfig(): MarketProviderConfig {
  const apiKey = process.env.MARKET_DATA_API_KEY ?? null;
  const provider = (process.env.MARKET_DATA_PROVIDER ?? "composite").toLowerCase();
  const oilConfigured = getOilPriceApiConfig().isConfigured;
  // Polygon only when explicitly selected or POLYGON_AS_FALLBACK=true
  const polygonConfigured =
    Boolean(apiKey) &&
    (provider === "polygon" || process.env.POLYGON_AS_FALLBACK === "true");

  // Yahoo is used for Investing-style quotes (no paid key required)
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
    pollIntervalMs: Number(process.env.MARKET_POLL_INTERVAL_MS ?? 2_000),
    websocketEnabled: process.env.MARKET_DATA_WEBSOCKET_ENABLED === "true",
    isConfigured,
    oilConfigured,
    polygonConfigured,
    yahooEnabled,
  };
}
