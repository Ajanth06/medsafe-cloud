import { getPriceHistoryBuffer } from "@/lib/market-intelligence/engine/price-history-buffer";
import type { OilNewsReaction, PriceSnapshot } from "@/lib/types/market";

function priceNear(
  snapshots: PriceSnapshot[],
  targetMs: number,
): number | undefined {
  if (!snapshots.length) return undefined;
  let best = snapshots[0];
  let bestDiff = Math.abs(new Date(best.timestamp).getTime() - targetMs);
  for (const s of snapshots) {
    const d = Math.abs(new Date(s.timestamp).getTime() - targetMs);
    if (d < bestDiff) {
      best = s;
      bestDiff = d;
    }
  }
  if (bestDiff > 20 * 60_000) return undefined;
  return best.price;
}

/**
 * Snapshot oil prices around a news timestamp (best-effort from in-memory buffer).
 */
export function buildOilReaction(newsAt: string): OilNewsReaction {
  const buffer = getPriceHistoryBuffer();
  const base = new Date(newsAt).getTime();
  if (Number.isNaN(base)) return {};

  const wti = buffer.getSnapshots("WTI");
  const brent = buffer.getSnapshots("BRENT");

  return {
    wtiPriceAtNews: priceNear(wti, base),
    brentPriceAtNews: priceNear(brent, base),
    wtiAfter1m: priceNear(wti, base + 60_000),
    wtiAfter5m: priceNear(wti, base + 5 * 60_000),
    wtiAfter15m: priceNear(wti, base + 15 * 60_000),
    wtiAfter30m: priceNear(wti, base + 30 * 60_000),
    wtiAfter60m: priceNear(wti, base + 60 * 60_000),
    brentAfter1m: priceNear(brent, base + 60_000),
    brentAfter5m: priceNear(brent, base + 5 * 60_000),
    brentAfter15m: priceNear(brent, base + 15 * 60_000),
    brentAfter30m: priceNear(brent, base + 30 * 60_000),
    brentAfter60m: priceNear(brent, base + 60 * 60_000),
  };
}
