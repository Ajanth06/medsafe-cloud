import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/market-intelligence/api/auth";
import { getNewsProviderConfig } from "@/lib/market-intelligence/config/news-provider-config";
import { createNewsProvider, createOfficialSourceProvider } from "@/lib/market-intelligence/providers/news/news-provider-factory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  const config = getNewsProviderConfig();
  const newsProvider = createNewsProvider();
  const official = createOfficialSourceProvider();

  const [newsHealth, officialHealth] = await Promise.all([
    newsProvider.getProviderHealth(),
    official.getProviderHealth(),
  ]);

  return Response.json({
    newsEngine: config.isConfigured ? "ACTIVE" : "NOT_CONFIGURED",
    providers: [newsHealth, officialHealth],
    officialSources: officialHealth.status === "ONLINE" ? "ACTIVE" : "READY",
    verificationEngine: "ACTIVE",
    eventCorrelation: "ACTIVE",
    isLive: config.isConfigured,
  });
}
