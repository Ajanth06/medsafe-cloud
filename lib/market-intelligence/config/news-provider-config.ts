export interface NewsProviderConfig {
  provider: string;
  apiKey: string | null;
  pollIntervalMs: number;
  isConfigured: boolean;
  newsApiBaseUrl: string;
  usesFreeRss: boolean;
}

/**
 * Default: free Oil RSS (no paid NewsAPI required).
 * Set NEWS_DATA_PROVIDER=newsapi + NEWS_API_KEY to add NewsAPI on top.
 */
export function getNewsProviderConfig(): NewsProviderConfig {
  const apiKey = process.env.NEWS_API_KEY ?? process.env.NEWS_DATA_API_KEY ?? null;
  const provider = (process.env.NEWS_DATA_PROVIDER ?? "oil-rss").toLowerCase();
  const usesFreeRss =
    provider === "oil-rss" ||
    provider === "rss" ||
    provider === "free" ||
    provider === "composite" ||
    !apiKey;

  const isConfigured =
    provider === "mock" || provider === "development"
      ? false
      : provider === "newsapi"
        ? Boolean(apiKey)
        : true; // oil-rss / rss / free always "live"

  return {
    provider,
    apiKey,
    pollIntervalMs: Number(process.env.NEWS_POLL_INTERVAL_MS ?? 60_000),
    isConfigured,
    newsApiBaseUrl: process.env.NEWS_API_BASE_URL ?? "https://newsapi.org/v2",
    usesFreeRss,
  };
}
