import type { NormalizedMarketQuote } from "@/lib/types/market";

export interface TickValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateTick(
  quote: Partial<NormalizedMarketQuote>,
  previousPrice?: number,
): TickValidationResult {
  if (!quote.price || quote.price <= 0) {
    return { valid: false, reason: "Price is zero or negative" };
  }

  if (quote.bid !== undefined && quote.ask !== undefined && quote.bid > quote.ask) {
    return { valid: false, reason: "Bid greater than ask" };
  }

  if (previousPrice !== undefined && previousPrice > 0) {
    const jumpPercent = Math.abs((quote.price - previousPrice) / previousPrice) * 100;
    if (jumpPercent > 80) {
      return { valid: false, reason: `Suspicious price jump: ${jumpPercent.toFixed(1)}%` };
    }
  }

  if (quote.providerTimestamp) {
    const ageMs = Date.now() - new Date(quote.providerTimestamp).getTime();
    if (ageMs > 24 * 60 * 60 * 1000) {
      return { valid: false, reason: "Provider timestamp too old" };
    }
  }

  return { valid: true };
}

export function isStale(
  lastUpdate: string | null,
  staleAfterSeconds: number,
  nowMs: number = Date.now(),
): boolean {
  if (!lastUpdate) return true;
  const ageMs = nowMs - new Date(lastUpdate).getTime();
  return ageMs > staleAfterSeconds * 1000;
}
