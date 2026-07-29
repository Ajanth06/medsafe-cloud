import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/market-intelligence/api/auth";
import { acknowledgeAlert, markAlertRead } from "@/lib/market-intelligence/operations/in-app-alert-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { action?: "read" | "acknowledge" };
  const alert =
    body.action === "read" ? markAlertRead(id) : acknowledgeAlert(id, "ACKNOWLEDGED");

  if (!alert) {
    return Response.json({ error: "Alert not found" }, { status: 404 });
  }

  return Response.json({ alert });
}
