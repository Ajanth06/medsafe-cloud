export interface OilPriceApiConfig {
  apiKey: string | null;
  baseUrl: string;
  isConfigured: boolean;
  pollIntervalMs: number;
}

/**
 * OilPriceAPI = optional spot-oil fallback only.
 * Default off — Yahoo futures (CL=F / BZ=F) are the primary oil quotes.
 * Enable with OILPRICEAPI_KEY + OILPRICEAPI_AS_FALLBACK=true
 * (or MARKET_DATA_PROVIDER=oilpriceapi).
 */
export function getOilPriceApiConfig(): OilPriceApiConfig {
  const apiKey =
    process.env.OILPRICEAPI_KEY ??
    process.env.OIL_PRICE_API_KEY ??
    null;
  const provider = (process.env.MARKET_DATA_PROVIDER ?? "composite").toLowerCase();
  const enabled =
    Boolean(apiKey) &&
    (provider === "oilpriceapi" ||
      process.env.OILPRICEAPI_AS_FALLBACK === "true");

  return {
    apiKey: enabled ? apiKey : null,
    baseUrl: process.env.OILPRICEAPI_BASE_URL ?? "https://api.oilpriceapi.com/v1",
    isConfigured: enabled,
    pollIntervalMs: Number(process.env.OILPRICEAPI_POLL_INTERVAL_MS ?? 1_000),
  };
}
