import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/market-intelligence/api/auth";
import { withUserRateLimit } from "@/lib/market-intelligence/api/rate-limit";
import { getQuotesSnapshotReady } from "@/lib/market-intelligence/services/market-stream-service";

export const dynamic = "force-dynamic";

/**
 * Fast quotes endpoint: returns cached stream state immediately.
 * Background refresh is kicked if cache is older than ~1.5s.
 */
export async function GET() {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  const limited = await withUserRateLimit(auth.userId, "quotes");
  if (limited) return limited;

  const state = await getQuotesSnapshotReady(1_500);

  return NextResponse.json({
    quotes: state.quotes,
    lastPollAt: state.lastPollAt,
    isDemo: state.isDemo,
    error: state.error,
    refreshing: state.refreshing,
  });
}
