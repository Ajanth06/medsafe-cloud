import { isMiPersistenceEnabled } from "@/lib/market-intelligence/persistence/config";
import { listDeliveredAlertsFromDb } from "@/lib/market-intelligence/persistence/alerts-repository";
import { listHeartbeatsFromDb } from "@/lib/market-intelligence/persistence/heartbeats-repository";
import { listDeadLetterJobs, listRecentJobs } from "@/lib/market-intelligence/persistence/jobs-repository";
import { getInAppAlerts } from "@/lib/market-intelligence/operations/in-app-alert-store";
import { getWorkerHeartbeats } from "@/lib/market-intelligence/operations/heartbeat";
import { getDeadLetterJobs, getJobs } from "@/lib/market-intelligence/operations/job-queue";

/** Merge in-memory state with DB for cross-instance reads (DB wins on conflicts). */
export async function hydrateOperationsFromDb(): Promise<void> {
  if (!isMiPersistenceEnabled()) return;

  const [alerts, heartbeats] = await Promise.all([
    listDeliveredAlertsFromDb(200),
    listHeartbeatsFromDb(),
  ]);

  for (const alert of alerts.reverse()) {
    const { addInAppAlert } = await import("@/lib/market-intelligence/operations/in-app-alert-store");
    addInAppAlert(alert);
  }

  for (const beat of heartbeats) {
    const { recordHeartbeat } = await import("@/lib/market-intelligence/operations/heartbeat");
    recordHeartbeat(beat.workerId, beat.workerType, beat.metadata);
  }
}

export async function getJobsForStatus(): Promise<{
  recent: ReturnType<typeof getJobs>;
  deadLetter: ReturnType<typeof getDeadLetterJobs>;
}> {
  if (!isMiPersistenceEnabled()) {
    return { recent: getJobs().slice(-20), deadLetter: getDeadLetterJobs().slice(-10) };
  }

  const [recent, deadLetter] = await Promise.all([listRecentJobs(20), listDeadLetterJobs(10)]);
  return { recent, deadLetter };
}

export async function getAlertsForApi(): Promise<ReturnType<typeof getInAppAlerts>> {
  if (!isMiPersistenceEnabled()) return getInAppAlerts({ tab: "ALL" });

  const dbAlerts = await listDeliveredAlertsFromDb(100);
  const memoryAlerts = getInAppAlerts({ tab: "ALL" });
  const merged = new Map<string, (typeof dbAlerts)[number]>();
  for (const alert of dbAlerts) merged.set(alert.id, alert);
  for (const alert of memoryAlerts) merged.set(alert.id, alert);
  return [...merged.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function getHeartbeatsForStatus(): Promise<ReturnType<typeof getWorkerHeartbeats>> {
  if (!isMiPersistenceEnabled()) return getWorkerHeartbeats();

  const dbBeats = await listHeartbeatsFromDb();
  const memoryBeats = getWorkerHeartbeats();
  const merged = new Map<string, (typeof dbBeats)[number]>();
  for (const beat of dbBeats) merged.set(beat.workerId, beat);
  for (const beat of memoryBeats) merged.set(beat.workerId, beat);
  return [...merged.values()];
}
