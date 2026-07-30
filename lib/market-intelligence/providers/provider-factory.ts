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
 * Default: hybrid feed.
 * OilPriceAPI for WTI/Brent, Polygon for the rest, Yahoo only as fallback.
 */
export function createMarketDataProvider(
  type?: MarketDataProviderType,
): MarketDataProvider {
  const marketConfig = getMarketProviderConfig();
  const oilConfig = getOilPriceApiConfig();
  const providerType = (type ?? marketConfig.provider) as MarketDataProviderType;

  if (providerType === "mock") {
    return new DevelopmentMarketDataProvider();
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
    marketLogger.info("Using hybrid market data provider");
    return createCompositeMarketDataProvider();
  }

  marketLogger.info("Using Yahoo Finance market data");
  return new YahooFinanceMarketDataProvider();
}

export function getConfiguredProviderType(): MarketDataProviderType {
  const marketConfig = getMarketProviderConfig();
  if (!marketConfig.isConfigured) return "mock";
  if (marketConfig.provider === "polygon") return "polygon";
  if (marketConfig.provider === "oilpriceapi") return "oilpriceapi";
  if (marketConfig.provider === "composite") return "composite";
  return marketConfig.provider === "yahoo" || marketConfig.provider === "investing"
    ? "yahoo"
    : "composite";
}

export function getProviderForAsset(symbol: string): MarketDataProvider {
  void getSymbolEntry(symbol);
  return createMarketDataProvider();
}
