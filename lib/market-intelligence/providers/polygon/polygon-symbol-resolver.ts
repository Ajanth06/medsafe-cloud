import type { SymbolRegistryEntry } from "@/lib/market-intelligence/config/symbol-registry";
import {
  PolygonClient,
  type PolygonFuturesContract,
} from "@/lib/market-intelligence/providers/polygon/polygon-client";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";

const contractCache = new Map<string, { ticker: string; expiration: string | null; cachedAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

/** CME month codes: Jan..Dec */
const MONTH_CODES = ["F", "G", "H", "J", "K", "M", "N", "Q", "U", "V", "X", "Z"] as const;

function buildFrontMonthCandidates(productCode: string, count = 8): string[] {
  const now = new Date();
  const tickers: string[] = [];
  let year = now.getUTCFullYear();
  let monthIndex = now.getUTCMonth(); // 0-11

  for (let i = 0; i < count; i += 1) {
    const code = MONTH_CODES[monthIndex];
    const yearDigit = year % 10;
    tickers.push(`${productCode}${code}${yearDigit}`);
    monthIndex += 1;
    if (monthIndex > 11) {
      monthIndex = 0;
      year += 1;
    }
  }
  return tickers;
}

function isOutrightSingle(contract: PolygonFuturesContract): boolean {
  const ticker = contract.ticker ?? "";
  if (!ticker || ticker.includes(":")) return false;
  if (contract.type && contract.type !== "single") return false;
  return true;
}

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
      const candidates = buildFrontMonthCandidates(productCode);
      const today = new Date().toISOString().slice(0, 10);

      const response = await this.client.fetchJson<{
        results?: PolygonFuturesContract[];
      }>("/futures/v1/contracts", {
        "ticker.any_of": candidates.join(","),
        active: "true",
        limit: "50",
      });

      const contracts = (response.results ?? [])
        .filter(isOutrightSingle)
        .filter((c) => {
          const expiry = c.last_trade_date ?? c.expiration_date ?? null;
          return !expiry || expiry >= today;
        })
        .sort((a, b) => {
          const ae = a.last_trade_date ?? a.expiration_date ?? "9999";
          const be = b.last_trade_date ?? b.expiration_date ?? "9999";
          return ae.localeCompare(be);
        });

      // Deduplicate by ticker (API can return venue duplicates)
      const unique: PolygonFuturesContract[] = [];
      const seen = new Set<string>();
      for (const contract of contracts) {
        if (seen.has(contract.ticker)) continue;
        seen.add(contract.ticker);
        unique.push(contract);
      }

      const contract = unique[0];
      if (!contract?.ticker) {
        marketLogger.warn("No front-month contract found", {
          symbol: entry.internalSymbol,
          productCode,
          candidates,
        });
        return null;
      }

      const expiration = contract.last_trade_date ?? contract.expiration_date ?? null;

      contractCache.set(cacheKey, {
        ticker: contract.ticker,
        expiration,
        cachedAt: Date.now(),
      });

      return {
        contractSymbol: contract.ticker,
        expirationDate: expiration,
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
