import { getMarketProviderConfig } from "@/lib/market-intelligence/config/provider-config";
import { getSymbolEntry } from "@/lib/market-intelligence/config/symbol-registry";
import { DevelopmentMarketDataProvider } from "@/lib/market-intelligence/providers/development-market-data-provider";
import { PolygonRestMarketDataProvider } from "@/lib/market-intelligence/providers/polygon/polygon-rest-provider";
import type { MarketDataProvider } from "@/lib/market-intelligence/providers/market-data-provider";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";

export type MarketDataProviderType = "mock" | "polygon";

export function createMarketDataProvider(
  type?: MarketDataProviderType,
): MarketDataProvider {
  const config = getMarketProviderConfig();
  const providerType =
    type ?? (config.provider as MarketDataProviderType | undefined) ?? "mock";

  if (providerType === "polygon" && config.apiKey) {
    marketLogger.info("Using Polygon market data provider");
    return new PolygonRestMarketDataProvider(config.apiKey);
  }

  if (providerType === "polygon" && !config.apiKey) {
    marketLogger.warn("Polygon selected but MARKET_DATA_API_KEY missing — using DEMO provider");
  }

  return new DevelopmentMarketDataProvider();
}

export function getConfiguredProviderType(): MarketDataProviderType {
  const config = getMarketProviderConfig();
  if (config.provider === "polygon" && config.apiKey) return "polygon";
  return "mock";
}

export function getProviderForAsset(symbol: string): MarketDataProvider {
  const entry = getSymbolEntry(symbol);
  if (!entry) return createMarketDataProvider();

  // Phase 3: all assets route to primary provider; multi-provider per asset in Phase 4
  return createMarketDataProvider();
}
