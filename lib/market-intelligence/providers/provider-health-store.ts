import { getMiDb } from "@/lib/supabase/mi-db";
import { isMiPersistenceEnabled } from "@/lib/market-intelligence/persistence/config";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";

export interface ProviderHealthRecord {
  id: string;
  provider: string;
  providerType: string;
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  lastSuccess?: string;
  lastFailure?: string;
  latencyMs?: number;
  errorCount: number;
  dataStale: boolean;
  updatedAt: string;
}

const store = new Map<string, ProviderHealthRecord>();

function key(provider: string, providerType: string): string {
  return `${providerType}:${provider}`;
}

export function recordProviderSuccess(input: {
  provider: string;
  providerType: string;
  latencyMs?: number;
}): void {
  const id = key(input.provider, input.providerType);
  const now = new Date().toISOString();
  const record: ProviderHealthRecord = {
    id,
    provider: input.provider,
    providerType: input.providerType,
    status: "ONLINE",
    lastSuccess: now,
    latencyMs: input.latencyMs,
    errorCount: store.get(id)?.errorCount ?? 0,
    dataStale: false,
    updatedAt: now,
  };
  store.set(id, record);
  if (isMiPersistenceEnabled()) void persistHealth(record);
}

export function recordProviderFailure(input: {
  provider: string;
  providerType: string;
  error?: string;
}): void {
  const id = key(input.provider, input.providerType);
  const prev = store.get(id);
  const now = new Date().toISOString();
  const record: ProviderHealthRecord = {
    id,
    provider: input.provider,
    providerType: input.providerType,
    status: "DEGRADED",
    lastSuccess: prev?.lastSuccess,
    lastFailure: now,
    latencyMs: prev?.latencyMs,
    errorCount: (prev?.errorCount ?? 0) + 1,
    dataStale: true,
    updatedAt: now,
  };
  store.set(id, record);
  marketLogger.warn("provider_health_degraded", { provider: input.provider, error: input.error });
  if (isMiPersistenceEnabled()) void persistHealth(record);
}

async function persistHealth(record: ProviderHealthRecord): Promise<void> {
  const db = getMiDb();
  if (!db) return;
  await db.from("mi_provider_health").upsert(
    {
      id: record.id,
      provider: record.provider,
      provider_type: record.providerType,
      status: record.status,
      last_success: record.lastSuccess ?? null,
      last_failure: record.lastFailure ?? null,
      latency_ms: record.latencyMs ?? null,
      error_count: record.errorCount,
      data_stale: record.dataStale,
      updated_at: record.updatedAt,
    },
    { onConflict: "id" },
  );
}

export function getProviderHealthRecords(): ProviderHealthRecord[] {
  return [...store.values()];
}

export function resetProviderHealthStore(): void {
  store.clear();
}
