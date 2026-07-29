import { PROVIDER_RETRY_ATTEMPTS } from "@/lib/market-intelligence/config/constants";
import { DevelopmentMarketDataProvider } from "@/lib/market-intelligence/providers/development-market-data-provider";
import type { MarketDataProvider } from "@/lib/market-intelligence/providers/market-data-provider";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import type { NormalizedMarketQuote } from "@/lib/types/market";

const fallbackProvider = new DevelopmentMarketDataProvider();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface FetchQuotesResult {
  quotes: NormalizedMarketQuote[];
  providerId: string;
  usedFallback: boolean;
  attempts: number;
}

export async function fetchQuotesWithFailover(
  primary: MarketDataProvider,
  symbols: string[],
): Promise<FetchQuotesResult> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= PROVIDER_RETRY_ATTEMPTS; attempt++) {
    try {
      const quotes = await primary.getQuotes(symbols);
      if (quotes.length > 0) {
        return {
          quotes,
          providerId: primary.id ?? "primary",
          usedFallback: false,
          attempts: attempt,
        };
      }
      lastError = new Error("Empty quote response");
    } catch (error) {
      lastError = error;
      marketLogger.warn("provider_fetch_failed", {
        provider: primary.id,
        attempt,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (attempt < PROVIDER_RETRY_ATTEMPTS) {
      await sleep(500 * attempt);
    }
  }

  marketLogger.warn("provider_failover", {
    from: primary.id,
    to: fallbackProvider.id,
    error: lastError instanceof Error ? lastError.message : String(lastError),
  });

  const quotes = await fallbackProvider.getQuotes(symbols);
  return {
    quotes,
    providerId: fallbackProvider.id,
    usedFallback: true,
    attempts: PROVIDER_RETRY_ATTEMPTS,
  };
}
