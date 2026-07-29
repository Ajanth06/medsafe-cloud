import { requireWorkerSecret } from "@/lib/market-intelligence/api/auth";
import { runOperationsTick } from "@/lib/market-intelligence/operations/operations-orchestrator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const denied = requireWorkerSecret(request);
  if (denied) return denied;

  const result = await runOperationsTick();
  return Response.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}
