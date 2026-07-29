import { getMiDb } from "@/lib/supabase/mi-db";
import { getWorkerInstanceId } from "@/lib/market-intelligence/persistence/config";
import { jobToRow, rowToJob } from "@/lib/market-intelligence/persistence/mappers";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import type { BackgroundJob, BackgroundJobType } from "@/lib/types/market";

export async function persistJob(job: BackgroundJob): Promise<void> {
  const supabase = getMiDb();
  if (!supabase) return;

  const { error } = await supabase.from("mi_background_jobs").upsert(jobToRow(job), { onConflict: "id" });
  if (error) marketLogger.warn("persist_job_failed", { jobId: job.id, error: error.message });
}

export async function persistDeadLetterJob(job: BackgroundJob): Promise<void> {
  const supabase = getMiDb();
  if (!supabase) return;

  const { error: jobError } = await supabase.from("mi_background_jobs").upsert(jobToRow(job), { onConflict: "id" });
  if (jobError) marketLogger.warn("persist_job_failed", { jobId: job.id, error: jobError.message });

  const { error } = await supabase.from("mi_dead_letter_jobs").upsert({
    id: job.id,
    job_type: job.type,
    event_id: typeof job.payload?.eventId === "string" ? job.payload.eventId : null,
    payload: job.payload ?? {},
    error: job.lastError ?? null,
    attempts: job.attempts,
    created_at: job.completedAt ?? new Date().toISOString(),
  });
  if (error) marketLogger.warn("persist_dead_letter_failed", { jobId: job.id, error: error.message });
}

export async function claimJobFromDb(type?: BackgroundJobType): Promise<BackgroundJob | null> {
  const supabase = getMiDb();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("mi_claim_background_job", {
    p_job_type: type ?? null,
    p_instance_id: getWorkerInstanceId(),
  });

  if (error) {
    marketLogger.warn("claim_job_db_failed", { error: error.message });
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return rowToJob(row as Record<string, unknown>);
}

export async function findJobByIdempotencyKey(key: string): Promise<BackgroundJob | null> {
  const supabase = getMiDb();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("mi_background_jobs")
    .select("*")
    .eq("idempotency_key", key)
    .not("status", "in", '("COMPLETED","CANCELLED","DEAD_LETTER")')
    .maybeSingle();

  if (error || !data) return null;
  return rowToJob(data as Record<string, unknown>);
}

export async function listRecentJobs(limit = 50): Promise<BackgroundJob[]> {
  const supabase = getMiDb();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("mi_background_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((row) => rowToJob(row as Record<string, unknown>));
}

export async function listDeadLetterJobs(limit = 20): Promise<BackgroundJob[]> {
  const supabase = getMiDb();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("mi_dead_letter_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((row) =>
    rowToJob({
      id: row.id,
      job_type: row.job_type,
      status: "DEAD_LETTER",
      payload: row.payload,
      created_at: row.created_at,
      attempts: row.attempts,
      last_error: row.error,
    } as Record<string, unknown>),
  );
}
