import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/market-intelligence/api/auth";
import { withUserRateLimit } from "@/lib/market-intelligence/api/rate-limit";
import { getStreamState, pollMarketData } from "@/lib/market-intelligence/services/market-stream-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  const limited = await withUserRateLimit(auth.userId, "quotes");
  if (limited) return limited;

  await pollMarketData();
  const state = getStreamState();

  return NextResponse.json({
    quotes: state.quotes,
    lastPollAt: state.lastPollAt,
    isDemo: state.isDemo,
    error: state.lastError,
  });
}
