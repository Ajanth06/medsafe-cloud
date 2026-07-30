import { getOilPriceApiConfig } from "@/lib/market-intelligence/config/oilpriceapi-config";
import { getMarketProviderConfig } from "@/lib/market-intelligence/config/provider-config";
import { getSymbolEntry } from "@/lib/market-intelligence/config/symbol-registry";
import { createCompositeMarketDataProvider } from "@/lib/market-intelligence/providers/composite-market-data-provider";
import { DevelopmentMarketDataProvider } from "@/lib/market-intelligence/providers/development-market-data-provider";
import { OilPriceApiProvider } from "@/lib/market-intelligence/providers/oilpriceapi/oilpriceapi-provider";
import { PolygonRestMarketDataProvider } from "@/lib/market-intelligence/providers/polygon/polygon-rest-provider";
import type { MarketDataProvider } from "@/lib/market-intelligence/providers/market-data-provider";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";

export type MarketDataProviderType = "mock" | "polygon" | "oilpriceapi" | "composite";

/**
 * Default: OilPriceAPI for WTI/Brent (when keyed) + Polygon for other assets.
 * Pass an explicit type only when you need a single backend.
 */
export function createMarketDataProvider(
  type?: MarketDataProviderType,
): MarketDataProvider {
  const marketConfig = getMarketProviderConfig();
  const oilConfig = getOilPriceApiConfig();
  const providerType = type ?? "composite";

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

  if (providerType === "composite" || providerType === "mock") {
    // Prefer composite whenever any live key is present
    if (oilConfig.isConfigured || marketConfig.isConfigured) {
      return createCompositeMarketDataProvider();
    }
    return new DevelopmentMarketDataProvider();
  }

  return new DevelopmentMarketDataProvider();
}

export function getConfiguredProviderType(): MarketDataProviderType {
  const marketConfig = getMarketProviderConfig();
  const oilConfig = getOilPriceApiConfig();
  if (oilConfig.isConfigured || marketConfig.isConfigured) return "composite";
  return "mock";
}

export function getProviderForAsset(symbol: string): MarketDataProvider {
  const entry = getSymbolEntry(symbol);
  if (!entry) return createMarketDataProvider();
  return createMarketDataProvider();
}
