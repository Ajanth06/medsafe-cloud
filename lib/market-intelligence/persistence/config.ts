import { isServiceClientConfigured } from "@/lib/supabase/admin";

export function isMiPersistenceEnabled(): boolean {
  return process.env.MI_PERSISTENCE_ENABLED !== "false" && isServiceClientConfigured();
}

export function getWorkerInstanceId(): string {
  return (
    process.env.WORKER_INSTANCE_ID ??
    process.env.VERCEL_REGION ??
    process.env.HOSTNAME ??
    "local-worker"
  );
}
