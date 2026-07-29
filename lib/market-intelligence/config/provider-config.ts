export interface MarketProviderConfig {
  provider: string;
  apiKey: string | null;
  restBaseUrl: string;
  websocketUrl: string;
  pollIntervalMs: number;
  websocketEnabled: boolean;
  isConfigured: boolean;
}

export function getMarketProviderConfig(): MarketProviderConfig {
  const apiKey = process.env.MARKET_DATA_API_KEY ?? null;
  const provider = process.env.MARKET_DATA_PROVIDER ?? "mock";

  return {
    provider,
    apiKey,
    restBaseUrl:
      process.env.MARKET_DATA_REST_URL ?? "https://api.polygon.io",
    websocketUrl:
      process.env.MARKET_DATA_WEBSOCKET_URL ?? "wss://socket.polygon.io",
    pollIntervalMs: Number(process.env.MARKET_POLL_INTERVAL_MS ?? 5_000),
    websocketEnabled: process.env.MARKET_DATA_WEBSOCKET_ENABLED === "true",
    isConfigured: Boolean(apiKey && provider !== "mock"),
  };
}
