import type { BrentWTISpread, NormalizedMarketQuote } from "@/lib/types/market";

export function calculateBrentWTISpread(
  brent: NormalizedMarketQuote | null,
  wti: NormalizedMarketQuote | null,
  previousSpread?: number,
): BrentWTISpread | null {
  if (!brent || !wti) return null;

  const spread = brent.price - wti.price;
  const prev = previousSpread ?? spread;
  const spreadChange = spread - prev;
  const spreadChangePercent = prev !== 0 ? (spreadChange / Math.abs(prev)) * 100 : 0;

  return {
    brentPrice: brent.price,
    wtiPrice: wti.price,
    spread,
    previousSpread: prev,
    spreadChange,
    spreadChangePercent,
    timestamp: brent.timestamp,
  };
}
