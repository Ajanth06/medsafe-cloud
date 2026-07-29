import { getNewsProviderConfig } from "@/lib/market-intelligence/config/news-provider-config";
import { DevelopmentNewsProvider } from "@/lib/market-intelligence/providers/news/development-news-provider";
import { NewsApiProvider } from "@/lib/market-intelligence/providers/news/newsapi-provider";
import { OfficialSourceProviderImpl } from "@/lib/market-intelligence/providers/news/official-source-provider";
import type { NewsProvider, OfficialSourceProvider } from "@/lib/market-intelligence/services/news-provider";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";

export function createNewsProvider(): NewsProvider {
  const config = getNewsProviderConfig();

  if (config.provider === "newsapi" && config.apiKey) {
    marketLogger.info("Using NewsAPI news provider");
    return new NewsApiProvider(config.apiKey, config.newsApiBaseUrl);
  }

  if (config.provider === "newsapi" && !config.apiKey) {
    marketLogger.warn("NewsAPI selected but NEWS_API_KEY missing — using DEMO provider");
  }

  return new DevelopmentNewsProvider();
}

export function createOfficialSourceProvider(): OfficialSourceProvider {
  return new OfficialSourceProviderImpl();
}

export function getConfiguredNewsProviders(): NewsProvider[] {
  return [createNewsProvider()];
}

export function getProviderForNewsCategory(_category: string): NewsProvider {
  return createNewsProvider();
}
