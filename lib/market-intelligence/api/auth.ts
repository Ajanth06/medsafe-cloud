import { NextResponse } from "next/server";
import { getOperationsConfig } from "@/lib/market-intelligence/config/operations-config";
import { createClient } from "@/lib/supabase/server";

export async function requireApiUser(): Promise<{ userId: string } | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return { userId: user.id };
}

export function isWorkerAuthorized(request: Request): boolean {
  const config = getOperationsConfig();
  const secret = config.workerSecret;

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const header = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");
  return header === `Bearer ${secret}` || cronHeader === secret;
}

/** Returns 401 response if unauthorized, null if OK. Fails closed in production. */
export function requireWorkerSecret(request: Request): NextResponse | null {
  if (!isWorkerAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Accepts either authenticated user session or worker secret (for cron/CI). */
export async function requireApiUserOrWorker(request: Request): Promise<{ userId?: string } | NextResponse> {
  if (isWorkerAuthorized(request)) {
    return {};
  }
  return requireApiUser();
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
