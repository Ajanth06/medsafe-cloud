import type {
  NormalizedNewsItem,
  NewsEventType,
  NewsProviderHealthInfo,
} from "@/lib/types/market";
import type {
  NewsProvider,
  NewsUnsubscribe,
  NewsUpdateCallback,
} from "@/lib/market-intelligence/providers/news/news-provider-types";

export type {
  NewsProvider,
  OfficialSourceProvider,
  NewsUpdateCallback,
  NewsUnsubscribe,
} from "@/lib/market-intelligence/providers/news/news-provider-types";

export interface NewsSearchParams {
  keywords?: string[];
  beforeMinutes?: number;
  afterMinutes?: number;
  limit?: number;
}

export interface NewsSearchAroundTimestampParams extends NewsSearchParams {
  timestamp: string;
}

export interface NewsIntelligenceService {
  ingestFromProviders(providers: NewsProvider[]): Promise<NormalizedNewsItem[]>;
  searchForMarketEvent(
    timestamp: string,
    keywords: string[],
    beforeMinutes?: number,
    afterMinutes?: number,
  ): Promise<NormalizedNewsItem[]>;
}

export function buildKeywordsForAsset(symbol: string, baseKeywords: readonly string[]): string[] {
  const assetKeywords: Record<string, string[]> = {
    WTI: ["WTI", "crude", "oil", "energy"],
    BRENT: ["Brent", "crude", "oil", "energy"],
    GOLD: ["gold", "safe haven", "precious metals"],
    NDX: ["NASDAQ", "tech stocks", "equities"],
    SPX: ["S&P 500", "equities"],
    DAX: ["DAX", "German stocks", "equities"],
    BTC: ["Bitcoin", "crypto", "digital assets"],
    EURUSD: ["EUR/USD", "forex", "dollar", "euro"],
  };

  return [...new Set([...(assetKeywords[symbol] ?? []), ...baseKeywords])];
}

export class MockNewsProvider implements NewsProvider {
  readonly id = "mock";
  readonly name = "Mock News Provider";

  async searchLatest(): Promise<NormalizedNewsItem[]> {
    return [];
  }

  async searchByKeywords(): Promise<NormalizedNewsItem[]> {
    return [];
  }

  async searchAroundTimestamp(): Promise<NormalizedNewsItem[]> {
    return [];
  }

  async getBreakingNews(): Promise<NormalizedNewsItem[]> {
    return [];
  }

  async getProviderHealth(): Promise<NewsProviderHealthInfo> {
    return {
      providerId: this.id,
      status: "OFFLINE",
      lastUpdate: null,
      error: "Mock provider — no live news",
    };
  }
}
