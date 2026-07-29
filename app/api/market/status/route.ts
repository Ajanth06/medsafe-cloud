import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/market-intelligence/api/auth";
import { buildSystemHealth } from "@/lib/market-intelligence/providers/provider-health";
import { getProviderHealthRecords } from "@/lib/market-intelligence/providers/provider-health-store";
import { getStreamState } from "@/lib/market-intelligence/services/market-stream-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  const state = getStreamState();
  const health = await buildSystemHealth({
    lastPollAt: state.lastPollAt,
    lastError: state.lastError,
    websocketState: state.websocketState,
    isDemo: state.isDemo,
    quotes: state.quotes,
  });

  return NextResponse.json({
    ...health,
    providerHealth: getProviderHealthRecords(),
  });
}
