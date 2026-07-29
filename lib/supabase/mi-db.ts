import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/admin";

/** Untyped MI tables client — full Database types come in Phase 8. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMiDb(): SupabaseClient<any> | null {
  return createServiceClient() as SupabaseClient<any> | null;
}
