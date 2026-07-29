export interface NewsProviderConfig {
  provider: string;
  apiKey: string | null;
  pollIntervalMs: number;
  isConfigured: boolean;
  newsApiBaseUrl: string;
}

export function getNewsProviderConfig(): NewsProviderConfig {
  const apiKey = process.env.NEWS_API_KEY ?? process.env.NEWS_DATA_API_KEY ?? null;
  const provider = process.env.NEWS_DATA_PROVIDER ?? "development";

  return {
    provider,
    apiKey,
    pollIntervalMs: Number(process.env.NEWS_POLL_INTERVAL_MS ?? 30_000),
    isConfigured: Boolean(apiKey && provider !== "development" && provider !== "mock"),
    newsApiBaseUrl: process.env.NEWS_API_BASE_URL ?? "https://newsapi.org/v2",
  };
}
