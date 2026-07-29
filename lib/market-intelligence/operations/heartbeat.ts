import { getOperationsConfig } from "@/lib/market-intelligence/config/operations-config";
import { isMiPersistenceEnabled } from "@/lib/market-intelligence/persistence/config";
import { persistHeartbeat } from "@/lib/market-intelligence/persistence/heartbeats-repository";
import type { WorkerHeartbeat } from "@/lib/types/market";

const heartbeats = new Map<string, WorkerHeartbeat>();

export function recordHeartbeat(workerId: string, workerType: string, metadata?: Record<string, unknown>): WorkerHeartbeat {
  const beat: WorkerHeartbeat = {
    workerId,
    workerType,
    lastBeatAt: new Date().toISOString(),
    status: "ONLINE",
    metadata,
  };
  heartbeats.set(workerId, beat);
  if (isMiPersistenceEnabled()) void persistHeartbeat(beat);
  return beat;
}

export function getWorkerHeartbeats(): WorkerHeartbeat[] {
  const config = getOperationsConfig();
  const now = Date.now();

  return [...heartbeats.values()].map((beat) => {
    const ageMs = now - new Date(beat.lastBeatAt).getTime();
    let status: WorkerHeartbeat["status"] = "ONLINE";
    if (ageMs > config.heartbeatStaleMs * 2) status = "OFFLINE";
    else if (ageMs > config.heartbeatStaleMs) status = "DEGRADED";
    return { ...beat, status };
  });
}

export function getWorkerHeartbeat(workerId: string): WorkerHeartbeat | null {
  return getWorkerHeartbeats().find((b) => b.workerId === workerId) ?? null;
}

export function resetHeartbeats(): void {
  heartbeats.clear();
}
