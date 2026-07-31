import type { AssetClass } from "@/lib/types/market";

export type PolygonMarketType = "futures" | "forex" | "crypto" | "indices";

export interface SymbolRegistryEntry {
  internalSymbol: string;
  assetId: string;
  name: string;
  instrumentLabel: string;
  assetClass: AssetClass;
  exchange: string;
  currency: string;
  priority: "primary" | "standard";
  staleAfterSeconds: number;
  polygon: {
    market: PolygonMarketType;
    productCode?: string;
    restTicker?: string;
    defaultDelaySeconds: number;
  };
}

/** Active: oil only. */
export const SYMBOL_REGISTRY: SymbolRegistryEntry[] = [
  {
    internalSymbol: "WTI",
    assetId: "wti",
    name: "WTI Crude Oil",
    instrumentLabel: "WTI Futures (CL=F)",
    assetClass: "commodity",
    exchange: "NYMEX/CME",
    currency: "USD",
    priority: "primary",
    staleAfterSeconds: 180,
    polygon: {
      market: "futures",
      productCode: "CL",
      defaultDelaySeconds: 0,
    },
  },
  {
    internalSymbol: "BRENT",
    assetId: "brent",
    name: "Brent Crude Oil",
    instrumentLabel: "Brent Futures (BZ=F)",
    assetClass: "commodity",
    exchange: "ICE",
    currency: "USD",
    priority: "primary",
    staleAfterSeconds: 180,
    polygon: {
      market: "futures",
      productCode: "BZ",
      defaultDelaySeconds: 0,
    },
  },
];

/** Parked — not polled. */
export const DORMANT_SYMBOL_REGISTRY: SymbolRegistryEntry[] = [
  {
    internalSymbol: "GOLD",
    assetId: "gold",
    name: "Gold",
    instrumentLabel: "Gold Futures (GC=F)",
    assetClass: "commodity",
    exchange: "COMEX/CME",
    currency: "USD",
    priority: "standard",
    staleAfterSeconds: 60,
    polygon: { market: "futures", productCode: "GC", defaultDelaySeconds: 0 },
  },
  {
    internalSymbol: "EURUSD",
    assetId: "eurusd",
    name: "EUR/USD",
    instrumentLabel: "Forex Pair",
    assetClass: "forex",
    exchange: "FX",
    currency: "USD",
    priority: "standard",
    staleAfterSeconds: 30,
    polygon: { market: "forex", restTicker: "C:EURUSD", defaultDelaySeconds: 0 },
  },
  {
    internalSymbol: "NDX",
    assetId: "ndx",
    name: "NASDAQ 100",
    instrumentLabel: "Cash Index (I:NDX)",
    assetClass: "index",
    exchange: "NASDAQ",
    currency: "USD",
    priority: "standard",
    staleAfterSeconds: 60,
    polygon: { market: "indices", restTicker: "I:NDX", defaultDelaySeconds: 900 },
  },
  {
    internalSymbol: "SPX",
    assetId: "spx",
    name: "S&P 500",
    instrumentLabel: "Cash Index (I:SPX)",
    assetClass: "index",
    exchange: "NYSE",
    currency: "USD",
    priority: "standard",
    staleAfterSeconds: 60,
    polygon: { market: "indices", restTicker: "I:SPX", defaultDelaySeconds: 900 },
  },
  {
    internalSymbol: "DAX",
    assetId: "dax",
    name: "DAX",
    instrumentLabel: "DAX Cash Index (^GDAXI)",
    assetClass: "index",
    exchange: "XETRA",
    currency: "EUR",
    priority: "standard",
    staleAfterSeconds: 120,
    polygon: { market: "indices", restTicker: "I:GDAXI", defaultDelaySeconds: 900 },
  },
  {
    internalSymbol: "BTC",
    assetId: "btc",
    name: "Bitcoin",
    instrumentLabel: "Crypto (BTC/USD)",
    assetClass: "crypto",
    exchange: "Crypto",
    currency: "USD",
    priority: "standard",
    staleAfterSeconds: 30,
    polygon: { market: "crypto", restTicker: "X:BTCUSD", defaultDelaySeconds: 0 },
  },
];

export const TRACKED_SYMBOLS = SYMBOL_REGISTRY.map((e) => e.internalSymbol);
export const PRIMARY_SYMBOLS = ["WTI", "BRENT"] as const;

export function getSymbolEntry(symbol: string): SymbolRegistryEntry | undefined {
  return (
    SYMBOL_REGISTRY.find((e) => e.internalSymbol === symbol) ??
    DORMANT_SYMBOL_REGISTRY.find((e) => e.internalSymbol === symbol)
  );
}

export function getSymbolEntryById(assetId: string): SymbolRegistryEntry | undefined {
  return (
    SYMBOL_REGISTRY.find((e) => e.assetId === assetId) ??
    DORMANT_SYMBOL_REGISTRY.find((e) => e.assetId === assetId)
  );
}
