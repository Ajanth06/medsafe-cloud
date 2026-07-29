import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let adminClient: ReturnType<typeof createSupabaseClient> | null = null;

/**
 * Service-role Supabase client for AARYX Market Intelligence only.
 * Never import in client components or expose to the browser.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  if (!adminClient) {
    adminClient = createSupabaseClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return adminClient;
}

export function isServiceClientConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
