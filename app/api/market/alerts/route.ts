import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/market-intelligence/api/auth";
import { withUserRateLimit } from "@/lib/market-intelligence/api/rate-limit";
import { getUnreadAlertCount } from "@/lib/market-intelligence/operations/in-app-alert-store";
import { getAlertsForApi } from "@/lib/market-intelligence/persistence/hydrate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  const limited = await withUserRateLimit(auth.userId, "alerts");
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const tab = (searchParams.get("tab") ?? "ALL") as "ACTIVE" | "HIGH_PRIORITY" | "ALL" | "RESOLVED";

  const allAlerts = await getAlertsForApi();
  let alerts = allAlerts;
  switch (tab) {
    case "ACTIVE":
      alerts = allAlerts.filter((a) => a.eventStatus === "ACTIVE" || a.eventStatus === "MONITORING");
      break;
    case "HIGH_PRIORITY":
      alerts = allAlerts.filter((a) => a.severity === "HIGH" || a.severity === "CRITICAL");
      break;
    case "RESOLVED":
      alerts = allAlerts.filter((a) => a.eventStatus === "RESOLVED");
      break;
  }

  return Response.json({
    alerts,
    unreadCount: getUnreadAlertCount(),
  });
}
