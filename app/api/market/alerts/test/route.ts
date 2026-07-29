import { requireWorkerSecret } from "@/lib/market-intelligence/api/auth";
import { sendTestAlert } from "@/lib/market-intelligence/operations/operations-orchestrator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = requireWorkerSecret(request);
  if (denied) return denied;

  const result = await sendTestAlert();
  return Response.json({ result });
}
