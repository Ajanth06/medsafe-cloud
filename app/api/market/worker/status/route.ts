import { NextResponse } from "next/server";
import { requireApiUserOrWorker } from "@/lib/market-intelligence/api/auth";
import { getDeliveryRecords, getDeliveryStats } from "@/lib/market-intelligence/operations/alert-delivery-engine";
import { getUnreadAlertCount } from "@/lib/market-intelligence/operations/in-app-alert-store";
import { getJobStats } from "@/lib/market-intelligence/operations/job-queue";
import { buildOperationsHealth, runWatchdog } from "@/lib/market-intelligence/operations/system-watchdog";
import { listDeliveryRecordsFromDb } from "@/lib/market-intelligence/persistence/alerts-repository";
import { isMiPersistenceEnabled } from "@/lib/market-intelligence/persistence/config";
import { getAlertsForApi, getJobsForStatus } from "@/lib/market-intelligence/persistence/hydrate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireApiUserOrWorker(request);
  if (auth instanceof NextResponse) return auth;

  const health = buildOperationsHealth();
  const watchdog = runWatchdog();
  const { recent, deadLetter } = await getJobsForStatus();
  const alerts = await getAlertsForApi();
  const recentDeliveries = isMiPersistenceEnabled()
    ? await listDeliveryRecordsFromDb(20)
    : getDeliveryRecords(20);

  return Response.json({
    health,
    watchdog,
    persistenceEnabled: isMiPersistenceEnabled(),
    jobs: getJobStats(),
    recentJobs: recent,
    deadLetter,
    deliveryStats: getDeliveryStats(),
    recentDeliveries,
    alerts: {
      unreadCount: getUnreadAlertCount(),
      recent: alerts.slice(0, 20),
    },
  });
}
