import type { SymbolRegistryEntry } from "@/lib/market-intelligence/config/symbol-registry";
import type {
  DataAvailability,
  FuturesContractInfo,
  MarketStatus,
  NormalizedMarketQuote,
} from "@/lib/types/market";
import type { PolygonSnapshotTicker } from "@/lib/market-intelligence/providers/polygon/polygon-client";

interface NormalizeInput {
  entry: SymbolRegistryEntry;
  contractSymbol: string;
  contract?: FuturesContractInfo;
  snapshot: PolygonSnapshotTicker;
  receivedAt: string;
  processedAt: string;
  latencyMs: number | null;
  isRealtime: boolean;
  delaySeconds: number;
  dataAvailability: DataAvailability;
}

export function normalizePolygonQuote(input: NormalizeInput): NormalizedMarketQuote | null {
  const { snapshot, entry } = input;

  const price =
    snapshot.lastTrade?.p ??
    snapshot.lastQuote?.P ??
    snapshot.day?.c ??
    snapshot.session?.close ??
    snapshot.fmvs?.fmv;

  if (!price || price <= 0) return null;

  const previousClose = snapshot.prevDay?.c ?? snapshot.day?.o ?? price;
  const absoluteChange = price - previousClose;
  const percentageChange =
    snapshot.todaysChangePerc ??
    snapshot.session?.change_percent ??
    (previousClose !== 0 ? (absoluteChange / previousClose) * 100 : 0);

  const providerTs = snapshot.lastTrade?.t ?? snapshot.lastQuote?.t ?? snapshot.updated;
  const providerTimestamp = providerTs != null ? parsePolygonTimestamp(providerTs) : null;

  return {
    assetId: entry.assetId,
    symbol: entry.internalSymbol,
    providerSymbol: input.contractSymbol,
    contractSymbol: input.contractSymbol,
    name: entry.name,
    instrumentLabel: entry.instrumentLabel,
    assetClass: entry.assetClass,
    exchange: entry.exchange,
    currency: entry.currency,
    price,
    bid: snapshot.lastQuote?.p,
    ask: snapshot.lastQuote?.P,
    previousClose,
    absoluteChange,
    percentageChange,
    timestamp: providerTimestamp ?? input.receivedAt,
    receivedAt: input.receivedAt,
    processedAt: input.processedAt,
    providerTimestamp,
    marketStatus: inferMarketStatus(entry),
    isRealtime: input.isRealtime,
    delaySeconds: input.delaySeconds,
    dataAvailability: input.dataAvailability,
    source: "polygon",
    staleAfterSeconds: entry.staleAfterSeconds,
    contract: input.contract,
    latency: {
      providerToServerMs: latencyMs(providerTimestamp, input.receivedAt),
      serverProcessingMs:
        new Date(input.processedAt).getTime() - new Date(input.receivedAt).getTime(),
      totalPipelineMs:
        latencyMs(providerTimestamp, input.processedAt),
    },
  };
}

function latencyMs(from: string | null, to: string): number | null {
  if (!from) return null;
  return new Date(to).getTime() - new Date(from).getTime();
}

/** Polygon uses ms for aggregates; futures trades may use ns. */
export function parsePolygonTimestamp(timestamp: number): string {
  let ms = timestamp;
  if (timestamp > 1e15) {
    ms = Math.floor(timestamp / 1_000_000);
  } else if (timestamp > 1e13) {
    ms = Math.floor(timestamp / 1_000);
  }
  return new Date(ms).toISOString();
}

function inferMarketStatus(entry: SymbolRegistryEntry): MarketStatus {
  if (entry.assetClass === "crypto") return "OPEN";
  return "OPEN";
}

export function unavailableQuote(entry: SymbolRegistryEntry): NormalizedMarketQuote {
  return {
    assetId: entry.assetId,
    symbol: entry.internalSymbol,
    providerSymbol: entry.polygon.restTicker ?? entry.polygon.productCode ?? entry.internalSymbol,
    name: entry.name,
    instrumentLabel: entry.instrumentLabel,
    assetClass: entry.assetClass,
    exchange: entry.exchange,
    currency: entry.currency,
    price: 0,
    previousClose: 0,
    absoluteChange: 0,
    percentageChange: 0,
    timestamp: new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    processedAt: new Date().toISOString(),
    marketStatus: "CLOSED",
    isRealtime: false,
    dataAvailability: "UNAVAILABLE",
    source: "polygon",
    staleAfterSeconds: entry.staleAfterSeconds,
  };
}
