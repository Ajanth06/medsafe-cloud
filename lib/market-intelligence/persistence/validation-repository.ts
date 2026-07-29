import { getMiDb } from "@/lib/supabase/mi-db";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";

export interface ValidationRunRecord {
  runType: "REPLAY" | "HEALTH_CHECK" | "LIVE_AUDIT";
  scenarioId?: string;
  passed: boolean;
  totalScenarios?: number;
  passedScenarios?: number;
  failedScenarios?: number;
  metrics?: Record<string, unknown>;
  failures?: string[];
  warnings?: string[];
  durationMs?: number;
  environment?: string;
}

export async function persistValidationRun(record: ValidationRunRecord): Promise<string | null> {
  const supabase = getMiDb();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("mi_validation_runs")
    .insert({
      run_type: record.runType,
      scenario_id: record.scenarioId ?? null,
      passed: record.passed,
      total_scenarios: record.totalScenarios ?? null,
      passed_scenarios: record.passedScenarios ?? null,
      failed_scenarios: record.failedScenarios ?? null,
      metrics: record.metrics ?? {},
      failures: record.failures ?? [],
      warnings: record.warnings ?? [],
      duration_ms: record.durationMs ?? null,
      environment: record.environment ?? process.env.NODE_ENV ?? "development",
    })
    .select("id")
    .single();

  if (error) {
    marketLogger.warn("persist_validation_run_failed", { error: error.message });
    return null;
  }

  return data?.id ? String(data.id) : null;
}

export async function listValidationRuns(
  limit = 20,
): Promise<Array<ValidationRunRecord & { id: string; createdAt: string }>> {
  const supabase = getMiDb();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("mi_validation_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    id: String(row.id),
    createdAt: String(row.created_at),
    runType: row.run_type as ValidationRunRecord["runType"],
    scenarioId: row.scenario_id ? String(row.scenario_id) : undefined,
    passed: Boolean(row.passed),
    totalScenarios: row.total_scenarios != null ? Number(row.total_scenarios) : undefined,
    passedScenarios: row.passed_scenarios != null ? Number(row.passed_scenarios) : undefined,
    failedScenarios: row.failed_scenarios != null ? Number(row.failed_scenarios) : undefined,
    metrics: (row.metrics as Record<string, unknown>) ?? {},
    failures: (row.failures as string[]) ?? [],
    warnings: (row.warnings as string[]) ?? [],
    durationMs: row.duration_ms != null ? Number(row.duration_ms) : undefined,
    environment: row.environment ? String(row.environment) : undefined,
  }));
}
