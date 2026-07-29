import { NEWS_RATE_LIMIT } from "@/lib/market-intelligence/config/investigation-config";
import { normalizeNewsItem } from "@/lib/market-intelligence/services/news-normalizer";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import type { NewsProvider } from "@/lib/market-intelligence/providers/news/news-provider-types";
import type { NewsSearchAroundTimestampParams, NewsSearchParams } from "@/lib/market-intelligence/services/news-provider";
import type { NormalizedNewsItem, NewsProviderHealthInfo } from "@/lib/types/market";

interface NewsApiArticle {
  source?: { id?: string; name?: string };
  author?: string;
  title?: string;
  description?: string;
  url?: string;
  publishedAt?: string;
  content?: string;
}

interface NewsApiResponse {
  status: string;
  totalResults?: number;
  articles?: NewsApiArticle[];
  code?: string;
  message?: string;
}

export class NewsApiProvider implements NewsProvider {
  readonly id = "newsapi";
  readonly name = "NewsAPI.org";

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = "https://newsapi.org/v2",
  ) {}

  async searchLatest(params?: NewsSearchParams): Promise<NormalizedNewsItem[]> {
    const q = params?.keywords?.join(" OR ") ?? "oil OR markets OR geopolitical";
    return this.fetchArticles(`/everything?q=${encodeURIComponent(q)}&sortBy=publishedAt&pageSize=${params?.limit ?? 20}&language=de`);
  }

  async searchByKeywords(keywords: string[], params?: NewsSearchParams): Promise<NormalizedNewsItem[]> {
    return this.searchLatest({ ...params, keywords });
  }

  async searchAroundTimestamp(params: NewsSearchAroundTimestampParams): Promise<NormalizedNewsItem[]> {
    const center = new Date(params.timestamp);
    const from = new Date(center.getTime() - (params.beforeMinutes ?? 30) * 60_000);
    const to = new Date(center.getTime() + (params.afterMinutes ?? 20) * 60_000);
    const q = params.keywords?.join(" OR ") ?? "oil OR crude OR geopolitical";

    const path = `/everything?q=${encodeURIComponent(q)}&from=${from.toISOString()}&to=${to.toISOString()}&sortBy=publishedAt&pageSize=${params.limit ?? 30}&language=de`;
    return this.fetchArticles(path);
  }

  async getBreakingNews(limit = 10): Promise<NormalizedNewsItem[]> {
    return this.fetchArticles(`/top-headlines?category=business&pageSize=${limit}&language=de`);
  }

  async getProviderHealth(): Promise<NewsProviderHealthInfo> {
    try {
      await this.fetchRaw("/top-headlines?country=us&pageSize=1");
      return {
        providerId: this.id,
        status: "ONLINE",
        lastUpdate: new Date().toISOString(),
      };
    } catch (error) {
      return {
        providerId: this.id,
        status: "OFFLINE",
        lastUpdate: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async fetchArticles(path: string): Promise<NormalizedNewsItem[]> {
    const data = await this.fetchRaw(path);
    if (data.status !== "ok" || !data.articles) return [];

    return data.articles
      .filter((a) => a.title && a.publishedAt)
      .map((article, idx) =>
        normalizeNewsItem(
          {
            id: `newsapi-${article.url ?? idx}-${article.publishedAt}`,
            title: article.title!,
            summary: article.description ?? article.content?.slice(0, 200) ?? "",
            source: article.source?.name ?? "NewsAPI",
            sourceDomain: article.url ? new URL(article.url).hostname : undefined,
            publishedAt: article.publishedAt!,
            url: article.url,
            bodySnippet: article.content?.slice(0, 280),
            categories: ["FINANCIAL"],
            providerEventId: article.url,
          },
          this.id,
        ),
      );
  }

  private async fetchRaw(path: string, attempt = 0): Promise<NewsApiResponse> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      headers: { "X-Api-Key": this.apiKey, Accept: "application/json" },
      cache: "no-store",
    });

    if (response.status === 429 && attempt < NEWS_RATE_LIMIT.maxRetries) {
      const retryAfter = Number(response.headers.get("retry-after") ?? 2) * 1000;
      const delay = Math.min(retryAfter, NEWS_RATE_LIMIT.maxBackoffMs);
      marketLogger.warn("NewsAPI rate limited — backing off", { delayMs: delay, attempt });
      await sleep(delay);
      return this.fetchRaw(path, attempt + 1);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`NewsAPI HTTP ${response.status}: ${body.slice(0, 200)}`);
    }

    return (await response.json()) as NewsApiResponse;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
