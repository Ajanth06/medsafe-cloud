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
    /** Futures product code for front-month resolution (e.g. CL, BZ) */
    productCode?: string;
    /** Static REST ticker when not futures (e.g. C:EURUSD, X:BTCUSD, I:SPX) */
    restTicker?: string;
    /** Expected delay on free/delayed plans in seconds; 0 = realtime */
    defaultDelaySeconds: number;
  };
}

/**
 * Central symbol mapping — provider-specific symbols must NOT leak into UI.
 *
 * WTI:  NYMEX WTI continuous futures (CL=F) — Investing-style
 * Brent: ICE Brent continuous futures (BZ=F) — Investing-style
 * Gold:  COMEX Gold Futures (GC=F)
 * NDX:   NASDAQ-100 Index (^NDX)
 * SPX:   S&P 500 Index (^GSPC)
 * DAX:   DAX Index (^GDAXI) — Investing-style cash index
 * EURUSD: Forex pair EURUSD=X
 * BTC:   Crypto BTC-USD
 */
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
    staleAfterSeconds: 30,
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
    staleAfterSeconds: 30,
    polygon: {
      market: "futures",
      productCode: "BZ",
      defaultDelaySeconds: 0,
    },
  },
  {
    internalSymbol: "GOLD",
    assetId: "gold",
    name: "Gold",
    instrumentLabel: "Front Month Futures (COMEX GC)",
    assetClass: "commodity",
    exchange: "COMEX/CME",
    currency: "USD",
    priority: "standard",
    staleAfterSeconds: 60,
    polygon: {
      market: "futures",
      productCode: "GC",
      defaultDelaySeconds: 0,
    },
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
    polygon: {
      market: "indices",
      restTicker: "I:NDX",
      defaultDelaySeconds: 900,
    },
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
    polygon: {
      market: "indices",
      restTicker: "I:SPX",
      defaultDelaySeconds: 900,
    },
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
    polygon: {
      market: "indices",
      restTicker: "I:GDAXI",
      defaultDelaySeconds: 900,
    },
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
    polygon: {
      market: "forex",
      restTicker: "C:EURUSD",
      defaultDelaySeconds: 0,
    },
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
    polygon: {
      market: "crypto",
      restTicker: "X:BTCUSD",
      defaultDelaySeconds: 0,
    },
  },
];

export const TRACKED_SYMBOLS = SYMBOL_REGISTRY.map((e) => e.internalSymbol);
export const PRIMARY_SYMBOLS = ["WTI", "BRENT"] as const;

export function getSymbolEntry(symbol: string): SymbolRegistryEntry | undefined {
  return SYMBOL_REGISTRY.find((e) => e.internalSymbol === symbol);
}

export function getSymbolEntryById(assetId: string): SymbolRegistryEntry | undefined {
  return SYMBOL_REGISTRY.find((e) => e.assetId === assetId);
}
