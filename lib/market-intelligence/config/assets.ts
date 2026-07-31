import type { MarketAssetDefinition } from "@/lib/types/market";

/**
 * Active terminal focus: oil only (WTI + Brent).
 * Everything else stays dormant for later.
 */
export const ACTIVE_MARKET_SYMBOLS = ["WTI", "BRENT"] as const;

export type ActiveMarketSymbol = (typeof ACTIVE_MARKET_SYMBOLS)[number];

export const MARKET_ASSETS: MarketAssetDefinition[] = [
  {
    assetId: "wti",
    symbol: "WTI",
    providerSymbol: "CL=F",
    name: "WTI Crude Oil",
    assetClass: "commodity",
    priority: "primary",
  },
  {
    assetId: "brent",
    symbol: "BRENT",
    providerSymbol: "BZ=F",
    name: "Brent Crude Oil",
    assetClass: "commodity",
    priority: "primary",
  },
];

/** Parked — not polled, not shown. */
export const DORMANT_ASSETS: MarketAssetDefinition[] = [
  {
    assetId: "gold",
    symbol: "GOLD",
    providerSymbol: "GC=F",
    name: "Gold",
    assetClass: "commodity",
  },
  {
    assetId: "eurusd",
    symbol: "EURUSD",
    providerSymbol: "EURUSD=X",
    name: "EUR/USD",
    assetClass: "forex",
  },
  {
    assetId: "dax",
    symbol: "DAX",
    providerSymbol: "^GDAXI",
    name: "DAX",
    assetClass: "index",
  },
  {
    assetId: "ndx",
    symbol: "NDX",
    providerSymbol: "^NDX",
    name: "NASDAQ 100",
    assetClass: "index",
  },
  {
    assetId: "spx",
    symbol: "SPX",
    providerSymbol: "^GSPC",
    name: "S&P 500",
    assetClass: "index",
  },
  {
    assetId: "btc",
    symbol: "BTC",
    providerSymbol: "BTC-USD",
    name: "Bitcoin",
    assetClass: "crypto",
  },
];

/** Future assets — registry only. */
export const FUTURE_ASSETS: MarketAssetDefinition[] = [
  { assetId: "silver", symbol: "SILVER", providerSymbol: "SI=F", name: "Silver", assetClass: "commodity" },
  { assetId: "natgas", symbol: "NATGAS", providerSymbol: "NG=F", name: "Natural Gas", assetClass: "commodity" },
  { assetId: "vix", symbol: "VIX", providerSymbol: "^VIX", name: "VIX", assetClass: "volatility" },
  { assetId: "usdjpy", symbol: "USDJPY", providerSymbol: "USDJPY=X", name: "USD/JPY", assetClass: "forex" },
  { assetId: "eurchf", symbol: "EURCHF", providerSymbol: "EURCHF=X", name: "EUR/CHF", assetClass: "forex" },
  { assetId: "us10y", symbol: "US10Y", providerSymbol: "^TNX", name: "US 10Y Treasury Yield", assetClass: "bond" },
  { assetId: "eth", symbol: "ETH", providerSymbol: "ETH-USD", name: "Ethereum", assetClass: "crypto" },
];

export const TRACKED_SYMBOLS = MARKET_ASSETS.map((a) => a.symbol);

export const PRIMARY_SYMBOLS = ["WTI", "BRENT"] as const;

export function isActiveMarketSymbol(symbol: string): boolean {
  return (ACTIVE_MARKET_SYMBOLS as readonly string[]).includes(symbol);
}

export function getAssetBySymbol(symbol: string): MarketAssetDefinition | undefined {
  return MARKET_ASSETS.find((a) => a.symbol === symbol);
}

export function getAssetById(assetId: string): MarketAssetDefinition | undefined {
  return MARKET_ASSETS.find((a) => a.assetId === assetId);
}

export const OIL_KEYWORDS = [
  "oil",
  "WTI",
  "Brent",
  "crude",
  "Iran",
  "Israel",
  "Middle East",
  "OPEC",
  "Saudi Arabia",
  "Russia",
  "US military",
  "Hormuz",
  "pipeline",
  "sanctions",
  "attack",
  "missile",
  "explosion",
  "supply",
  "energy",
] as const;
