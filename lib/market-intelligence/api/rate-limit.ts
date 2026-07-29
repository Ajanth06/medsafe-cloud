import { NextResponse } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}

export function rateLimitResponse(retryAfterSec = 60): NextResponse {
  return NextResponse.json(
    { error: "Too many requests", retryAfterSec },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}

export function resetRateLimits(): void {
  buckets.clear();
}

/** Standard limits for Phase 8 */
export const RATE_LIMITS = {
  quotes: { limit: 60, windowMs: 60_000 },
  stream: { limit: 10, windowMs: 60_000 },
  aiAnalyze: { limit: 20, windowMs: 60_000 },
  alerts: { limit: 120, windowMs: 60_000 },
  replay: { limit: 10, windowMs: 60_000 },
} as const;

export async function withUserRateLimit(
  userId: string,
  route: keyof typeof RATE_LIMITS,
): Promise<NextResponse | null> {
  const { limit, windowMs } = RATE_LIMITS[route];
  const ok = checkRateLimit(`${route}:${userId}`, limit, windowMs);
  if (!ok) return rateLimitResponse(Math.ceil(windowMs / 1000));
  return null;
}
