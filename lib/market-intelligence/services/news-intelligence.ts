/** @deprecated Use services/news-provider.ts and services/news-normalizer.ts */
export {
  type NewsProvider,
  type NewsSearchParams,
  buildKeywordsForAsset,
} from "@/lib/market-intelligence/services/news-provider";

export { normalizeNewsItem } from "@/lib/market-intelligence/services/news-normalizer";
export { deduplicateByTitle as deduplicateNews } from "@/lib/market-intelligence/services/duplicate-detection";
export { verifyNewsCluster as verifySources } from "@/lib/market-intelligence/services/verification-engine";
