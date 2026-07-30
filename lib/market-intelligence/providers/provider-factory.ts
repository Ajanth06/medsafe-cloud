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

/**
 * Default: Yahoo Investing-style quotes (CL=F, BZ=F, ^GDAXI…),
 * with OilPriceAPI / Polygon as fallbacks via composite.
 */
export function createMarketDataProvider(
  type?: MarketDataProviderType,
): MarketDataProvider {
  const marketConfig = getMarketProviderConfig();
  const oilConfig = getOilPriceApiConfig();

  // Default path: Investing-style Yahoo first, then Oil/Polygon fallbacks
  if (!type) {
    if (marketConfig.isConfigured) return createCompositeMarketDataProvider();
    return new DevelopmentMarketDataProvider();
  }

  const providerType = type;

  if (providerType === "yahoo" || providerType === "investing") {
    marketLogger.info("Using Yahoo Finance (Investing-style) market data");
    return new YahooFinanceMarketDataProvider();
  }

  if (providerType === "oilpriceapi") {
    if (!oilConfig.apiKey) {
      marketLogger.warn("OilPriceAPI selected but OILPRICEAPI_KEY missing — using DEMO");
      return new DevelopmentMarketDataProvider();
    }
    return new OilPriceApiProvider(oilConfig.apiKey);
  }

  if (providerType === "polygon") {
    if (!marketConfig.apiKey) {
      marketLogger.warn("Polygon selected but MARKET_DATA_API_KEY missing — using DEMO");
      return new DevelopmentMarketDataProvider();
    }
    marketLogger.info("Using Polygon market data provider");
    return new PolygonRestMarketDataProvider(marketConfig.apiKey);
  }

  if (providerType === "composite") {
    return createCompositeMarketDataProvider();
  }

  return new DevelopmentMarketDataProvider();
}

export function getConfiguredProviderType(): MarketDataProviderType {
  const marketConfig = getMarketProviderConfig();
  if (!marketConfig.isConfigured) return "mock";
  if (marketConfig.provider === "yahoo" || marketConfig.provider === "investing") {
    return "yahoo";
  }
  return "composite";
}

export function getProviderForAsset(symbol: string): MarketDataProvider {
  const entry = getSymbolEntry(symbol);
  if (!entry) return createMarketDataProvider();
  return createMarketDataProvider();
}
