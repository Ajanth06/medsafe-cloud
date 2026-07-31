import type { NewsSearchParams, NewsSearchAroundTimestampParams } from "@/lib/market-intelligence/services/news-provider";
import type { AppLocale } from "@/lib/i18n/locales";
import type { NormalizedNewsItem, NewsProviderHealthInfo } from "@/lib/types/market";

export type NewsUpdateCallback = (items: NormalizedNewsItem[]) => void;
export type NewsUnsubscribe = () => void;

/**
 * News provider abstraction — implementations must run server-side.
 */
export interface NewsProvider {
  readonly id: string;
  readonly name: string;

  searchLatest(params?: NewsSearchParams): Promise<NormalizedNewsItem[]>;
  searchByKeywords(keywords: string[], params?: NewsSearchParams): Promise<NormalizedNewsItem[]>;
  searchAroundTimestamp(params: NewsSearchAroundTimestampParams): Promise<NormalizedNewsItem[]>;
  getBreakingNews(limit?: number, targetLocale?: AppLocale): Promise<NormalizedNewsItem[]>;
  getArticle?(id: string): Promise<NormalizedNewsItem | null>;
  getProviderHealth(): Promise<NewsProviderHealthInfo>;
  subscribeToBreakingNews?(callback: NewsUpdateCallback): NewsUnsubscribe;
}

export interface OfficialSourceProvider {
  readonly id: string;
  readonly name: string;
  fetchLatest(limit?: number): Promise<NormalizedNewsItem[]>;
  searchByKeywords(keywords: string[]): Promise<NormalizedNewsItem[]>;
  getProviderHealth(): Promise<NewsProviderHealthInfo>;
}
