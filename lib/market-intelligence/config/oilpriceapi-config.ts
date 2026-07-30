export interface OilPriceApiConfig {
  apiKey: string | null;
  baseUrl: string;
  isConfigured: boolean;
  pollIntervalMs: number;
}

export function getOilPriceApiConfig(): OilPriceApiConfig {
  const apiKey =
    process.env.OILPRICEAPI_KEY ??
    process.env.OIL_PRICE_API_KEY ??
    null;

  return {
    apiKey,
    baseUrl: process.env.OILPRICEAPI_BASE_URL ?? "https://api.oilpriceapi.com/v1",
    isConfigured: Boolean(apiKey),
    pollIntervalMs: Number(process.env.OILPRICEAPI_POLL_INTERVAL_MS ?? 60_000),
  };
}
