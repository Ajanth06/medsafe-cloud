import { getNewsProviderConfig } from "@/lib/market-intelligence/config/news-provider-config";
import { DevelopmentNewsProvider } from "@/lib/market-intelligence/providers/news/development-news-provider";
import { NewsApiProvider } from "@/lib/market-intelligence/providers/news/newsapi-provider";
import { OfficialSourceProviderImpl } from "@/lib/market-intelligence/providers/news/official-source-provider";
import { OilRssNewsProvider } from "@/lib/market-intelligence/providers/news/oil-rss-news-provider";
import type {
  NewsProvider,
  OfficialSourceProvider,
} from "@/lib/market-intelligence/services/news-provider";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";

let sharedOilRss: OilRssNewsProvider | null = null;

function getOilRssProvider(): OilRssNewsProvider {
  if (!sharedOilRss) sharedOilRss = new OilRssNewsProvider();
  return sharedOilRss;
}

export function createNewsProvider(): NewsProvider {
  const config = getNewsProviderConfig();

  if (config.provider === "mock" || config.provider === "development") {
    return new DevelopmentNewsProvider();
  }

  if (config.provider === "newsapi" && config.apiKey) {
    marketLogger.info("Using NewsAPI news provider");
    return new NewsApiProvider(config.apiKey, config.newsApiBaseUrl);
  }

  // Default / oil-rss / rss / free / composite → free oil RSS
  marketLogger.info("Using free Oil RSS news provider");
  return getOilRssProvider();
}

export function createOfficialSourceProvider(): OfficialSourceProvider {
  return new OfficialSourceProviderImpl();
}

/**
 * Primary = Oil RSS (free). Optional NewsAPI as second source when keyed.
 */
export function getConfiguredNewsProviders(): NewsProvider[] {
  const config = getNewsProviderConfig();
  const providers: NewsProvider[] = [];

  if (config.provider === "mock" || config.provider === "development") {
    return [new DevelopmentNewsProvider()];
  }

  providers.push(getOilRssProvider());

  if (config.apiKey && config.provider !== "oil-rss") {
    providers.push(new NewsApiProvider(config.apiKey, config.newsApiBaseUrl));
  } else if (config.apiKey && process.env.NEWS_API_AS_SECONDARY === "true") {
    providers.push(new NewsApiProvider(config.apiKey, config.newsApiBaseUrl));
  }

  return providers;
}

export function getProviderForNewsCategory(_category: string): NewsProvider {
  return createNewsProvider();
}
