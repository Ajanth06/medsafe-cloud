import { enqueueJob, claimJob, claimJobAsync, completeJob, failJob } from "@/lib/market-intelligence/operations/job-queue";
import { isMiPersistenceEnabled } from "@/lib/market-intelligence/persistence/config";
import { getStreamState } from "@/lib/market-intelligence/services/market-stream-service";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import type { AlertPerformanceTracking } from "@/lib/types/market";

const SNAPSHOT_OFFSETS_MS = [60_000, 300_000, 900_000, 1_800_000, 3_600_000] as const;
const snapshotTracking = new Map<string, AlertPerformanceTracking & { scheduledAt: string[] }>();

export function schedulePerformanceSnapshots(input: {
  alertId: string;
  eventId: string;
  assets: string[];
  priceAtAlert: number;
}): void {
  const now = Date.now();
  const scheduledAt = SNAPSHOT_OFFSETS_MS.map((offset) => new Date(now + offset).toISOString());

  snapshotTracking.set(input.alertId, {
    priceAtAlert: input.priceAtAlert,
    snapshots: [],
    scheduledAt: [...scheduledAt],
  });

  for (const offset of SNAPSHOT_OFFSETS_MS) {
    enqueueJob({
      type: "PERFORMANCE_SNAPSHOT",
      payload: {
        alertId: input.alertId,
        eventId: input.eventId,
        assets: input.assets,
        offsetMs: offset,
        priceAtAlert: input.priceAtAlert,
      },
      idempotencyKey: `snapshot-${input.alertId}-${offset}`,
    });
  }

  marketLogger.info("performance_snapshots_scheduled", { alertId: input.alertId, offsets: SNAPSHOT_OFFSETS_MS.length });
}

export async function processPerformanceSnapshotJobs(): Promise<number> {
  let processed = 0;

  while (true) {
    const job = isMiPersistenceEnabled()
      ? await claimJobAsync("PERFORMANCE_SNAPSHOT")
      : claimJob("PERFORMANCE_SNAPSHOT");
    if (!job) break;

    try {
      const payload = job.payload ?? {};
      const alertId = String(payload.alertId ?? "");
      const offsetMs = Number(payload.offsetMs ?? 0);
      const priceAtAlert = Number(payload.priceAtAlert ?? 0);

      const state = getStreamState();
      const symbol = Array.isArray(payload.assets) ? String(payload.assets[0] ?? "WTI") : "WTI";
      const quote = state.quotes.find((q) => q.symbol === symbol);
      const currentPrice = quote?.price ?? priceAtAlert;

      const tracking = snapshotTracking.get(alertId);
      if (tracking && priceAtAlert > 0) {
        const minutesAfter = offsetMs / 60_000;
        const changePercent = ((currentPrice - priceAtAlert) / priceAtAlert) * 100;
        tracking.snapshots.push({ minutesAfter, price: currentPrice, changePercent });

        if (minutesAfter === 5) tracking.priceAfter5m = currentPrice;
        if (minutesAfter === 15) tracking.priceAfter15m = currentPrice;
        if (minutesAfter === 30) tracking.priceAfter30m = currentPrice;
        if (minutesAfter === 60) tracking.priceAfter60m = currentPrice;

        const moves = tracking.snapshots.map((s) => s.changePercent);
        tracking.maxMoveAfterAlert = Math.max(...moves, tracking.maxMoveAfterAlert ?? -Infinity);
        tracking.maxAdverseMove = Math.min(...moves, tracking.maxAdverseMove ?? Infinity);
      }

      completeJob(job.id);
      processed += 1;
    } catch (error) {
      failJob(job.id, error instanceof Error ? error.message : String(error));
    }
  }

  return processed;
}

export function getPerformanceTracking(alertId: string): (AlertPerformanceTracking & { scheduledAt?: string[] }) | null {
  return snapshotTracking.get(alertId) ?? null;
}

export function resetPerformanceSnapshots(): void {
  snapshotTracking.clear();
}
