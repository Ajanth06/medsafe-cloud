import { NextResponse } from "next/server";
import { requireApiUserOrWorker } from "@/lib/market-intelligence/api/auth";
import { buildProductionValidationReport } from "@/lib/market-intelligence/validation/production-validator";
import { persistValidationRun } from "@/lib/market-intelligence/persistence/validation-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireApiUserOrWorker(request);
  if (auth instanceof NextResponse) return auth;

  const report = await buildProductionValidationReport();
  return NextResponse.json(report);
}

export async function POST(request: Request) {
  const auth = await requireApiUserOrWorker(request);
  if (auth instanceof NextResponse) return auth;

  const report = await buildProductionValidationReport();

  await persistValidationRun({
    runType: "HEALTH_CHECK",
    passed: report.overallStatus === "HEALTHY",
    metrics: report.metrics as unknown as Record<string, unknown>,
    failures: report.checks.filter((c) => c.status === "FAIL").map((c) => c.detail),
    warnings: report.checks.filter((c) => c.status === "WARN").map((c) => c.detail),
    environment: report.environment,
  });

  return NextResponse.json(report);
}
