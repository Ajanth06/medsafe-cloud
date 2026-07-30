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
 * Default: OilPriceAPI live for WTI/Brent + Yahoo Investing-style for the rest.
 * Pass an explicit type only for single-provider tests.
 */
export function createMarketDataProvider(
  type?: MarketDataProviderType,
): MarketDataProvider {
  const marketConfig = getMarketProviderConfig();
  const oilConfig = getOilPriceApiConfig();

  // Default / yahoo / investing / composite → hybrid (oil live + yahoo rest)
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

  // yahoo / investing alone = Yahoo only (no oil priority)
  if (type === "yahoo" || type === "investing") {
    marketLogger.info("Using Yahoo Finance only (no OilPriceAPI priority)");
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
  return createMarketDataProvider();
}
