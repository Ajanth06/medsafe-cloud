import { getMiDb } from "@/lib/supabase/mi-db";
import { heartbeatToRow, rowToHeartbeat } from "@/lib/market-intelligence/persistence/mappers";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import type { WorkerHeartbeat } from "@/lib/types/market";

export async function persistHeartbeat(beat: WorkerHeartbeat): Promise<void> {
  const supabase = getMiDb();
  if (!supabase) return;

  const { error } = await supabase
    .from("mi_worker_heartbeats")
    .upsert(heartbeatToRow(beat), { onConflict: "worker_id" });

  if (error) marketLogger.warn("persist_heartbeat_failed", { workerId: beat.workerId, error: error.message });
}

export async function listHeartbeatsFromDb(): Promise<WorkerHeartbeat[]> {
  const supabase = getMiDb();
  if (!supabase) return [];

  const { data, error } = await supabase.from("mi_worker_heartbeats").select("*");
  if (error || !data) return [];
  return data.map((row) => rowToHeartbeat(row as Record<string, unknown>));
}
