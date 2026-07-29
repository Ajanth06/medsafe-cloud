import type { SymbolRegistryEntry } from "@/lib/market-intelligence/config/symbol-registry";
import {
  PolygonClient,
  type PolygonFuturesContract,
} from "@/lib/market-intelligence/providers/polygon/polygon-client";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";

const contractCache = new Map<string, { ticker: string; expiration: string | null; cachedAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

export class PolygonSymbolResolver {
  constructor(private readonly client: PolygonClient) {}

  async resolveFrontMonth(entry: SymbolRegistryEntry): Promise<{
    contractSymbol: string;
    expirationDate: string | null;
  } | null> {
    if (!entry.polygon.productCode) {
      return entry.polygon.restTicker
        ? { contractSymbol: entry.polygon.restTicker, expirationDate: null }
        : null;
    }

    const cacheKey = entry.internalSymbol;
    const cached = contractCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return { contractSymbol: cached.ticker, expirationDate: cached.expiration };
    }

    try {
      const productCode = entry.polygon.productCode;

      const response = await this.client.fetchJson<{
        results?: PolygonFuturesContract[];
      }>("/futures/v1/contracts", {
        product_code: productCode,
        active: "true",
        sort: "expiration_date",
        order: "asc",
        limit: "1",
      });

      const contract = response.results?.[0];
      if (!contract?.ticker) {
        marketLogger.warn("No front-month contract found", {
          symbol: entry.internalSymbol,
          productCode,
        });
        return null;
      }

      contractCache.set(cacheKey, {
        ticker: contract.ticker,
        expiration: contract.expiration_date ?? null,
        cachedAt: Date.now(),
      });

      return {
        contractSymbol: contract.ticker,
        expirationDate: contract.expiration_date ?? null,
      };
    } catch (error) {
      marketLogger.warn("Front-month resolution failed, trying fallback ticker", {
        symbol: entry.internalSymbol,
        error: error instanceof Error ? error.message : String(error),
      });

      return null;
    }
  }

  clearCache(): void {
    contractCache.clear();
  }
}
