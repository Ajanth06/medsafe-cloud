import { getOilPriceApiConfig } from "@/lib/market-intelligence/config/oilpriceapi-config";
import { getMarketProviderConfig } from "@/lib/market-intelligence/config/provider-config";
import { getSymbolEntry } from "@/lib/market-intelligence/config/symbol-registry";
import { createCompositeMarketDataProvider } from "@/lib/market-intelligence/providers/composite-market-data-provider";
import { DevelopmentMarketDataProvider } from "@/lib/market-intelligence/providers/development-market-data-provider";
import { OilPriceApiProvider } from "@/lib/market-intelligence/providers/oilpriceapi/oilpriceapi-provider";
import { PolygonRestMarketDataProvider } from "@/lib/market-intelligence/providers/polygon/polygon-rest-provider";
import { YahooFinanceMarketDataProvider } from "@/lib/market-intelligence/providers/yahoo/yahoo-finance-provider";
import type { MarketDataProvider } from "@/lib/market-intelligence/providers/market-data-provider";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";

export type MarketDataProviderType =
  | "mock"
  | "polygon"
  | "oilpriceapi"
  | "yahoo"
  | "investing"
  | "composite";

/** Reuse one provider instance so Yahoo/Oil caches survive across polls. */
let sharedProvider: MarketDataProvider | null = null;
let sharedProviderKey = "";

function providerCacheKey(): string {
  const market = getMarketProviderConfig();
  const oil = getOilPriceApiConfig();
  return [
    market.provider,
    market.apiKey ? "poly" : "",
    oil.isConfigured ? "oil" : "",
  ].join(":");
}

/**
 * Singleton market provider — critical for smooth live UI (keeps Yahoo cache).
 */
export function getSharedMarketDataProvider(
  type?: MarketDataProviderType,
): MarketDataProvider {
  if (type) return createMarketDataProvider(type);

  const key = providerCacheKey();
  if (!sharedProvider || sharedProviderKey !== key) {
    sharedProvider = createMarketDataProvider();
    sharedProviderKey = key;
  }
  return sharedProvider;
}

export function resetSharedMarketDataProvider(): void {
  sharedProvider = null;
  sharedProviderKey = "";
}

/**
 * Default: Yahoo Investing-style (CL=F/BZ=F) + OilPriceAPI fallback.
 */
export function createMarketDataProvider(
  type?: MarketDataProviderType,
): MarketDataProvider {
  const marketConfig = getMarketProviderConfig();
  const oilConfig = getOilPriceApiConfig();

  if (!type) {
    if (marketConfig.isConfigured || oilConfig.isConfigured) {
      return createCompositeMarketDataProvider();
    }
    return new DevelopmentMarketDataProvider();
  }

  if (type === "mock") {
    return new DevelopmentMarketDataProvider();
  }

  if (type === "oilpriceapi") {
    if (!oilConfig.apiKey) {
      marketLogger.warn("OilPriceAPI selected but OILPRICEAPI_KEY missing — using DEMO");
      return new DevelopmentMarketDataProvider();
    }
    return new OilPriceApiProvider(oilConfig.apiKey);
  }

  if (type === "polygon") {
    if (!marketConfig.apiKey) {
      marketLogger.warn("Polygon selected but MARKET_DATA_API_KEY missing — using DEMO");
      return new DevelopmentMarketDataProvider();
    }
    marketLogger.info("Using Polygon market data provider");
    return new PolygonRestMarketDataProvider(marketConfig.apiKey);
  }

  if (type === "yahoo" || type === "investing") {
    marketLogger.info("Using Yahoo Finance only");
    return new YahooFinanceMarketDataProvider();
  }

  return createCompositeMarketDataProvider();
}

export function getConfiguredProviderType(): MarketDataProviderType {
  const marketConfig = getMarketProviderConfig();
  const oilConfig = getOilPriceApiConfig();
  if (!marketConfig.isConfigured && !oilConfig.isConfigured) return "mock";
  return "composite";
}

export function getProviderForAsset(symbol: string): MarketDataProvider {
  void getSymbolEntry(symbol);
  return getSharedMarketDataProvider();
}
