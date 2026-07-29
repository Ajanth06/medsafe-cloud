import { NextResponse } from "next/server";
import {
  requireApiUser,
  requireApiUserOrWorker,
} from "@/lib/market-intelligence/api/auth";
import { withUserRateLimit } from "@/lib/market-intelligence/api/rate-limit";
import {
  listReplayScenarios,
  runAllReplayScenarios,
  runReplayScenario,
} from "@/lib/market-intelligence/replay/replay-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET() {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  return Response.json({
    scenarios: listReplayScenarios(),
    usage: "POST with { scenarioId } or { runAll: true }",
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUserOrWorker(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.userId) {
    const limited = await withUserRateLimit(auth.userId, "replay");
    if (limited) return limited;
  }

  const body = (await request.json().catch(() => ({}))) as {
    scenarioId?: string;
    runAll?: boolean;
    skipDelivery?: boolean;
  };

  if (body.runAll) {
    const results = await runAllReplayScenarios();
    const passed = results.filter((r) => r.validation.passed).length;
    return Response.json({
      summary: { total: results.length, passed, failed: results.length - passed },
      results: results.map((r) => ({
        scenarioId: r.scenario.id,
        name: r.scenario.name,
        passed: r.validation.passed,
        failures: r.validation.failures,
        warnings: r.validation.warnings,
        metrics: r.validation.metrics,
        stages: r.validation.stages,
        durationMs: r.durationMs,
      })),
    });
  }

  if (!body.scenarioId) {
    return Response.json({ error: "scenarioId or runAll required" }, { status: 400 });
  }

  const result = await runReplayScenario(body.scenarioId, { skipDelivery: body.skipDelivery });
  return Response.json({
    scenarioId: result.scenario.id,
    name: result.scenario.name,
    passed: result.validation.passed,
    failures: result.validation.failures,
    warnings: result.validation.warnings,
    metrics: result.validation.metrics,
    stages: result.validation.stages,
    alerts: result.validation.alerts.map((a) => ({
      id: a.id,
      severity: a.severity,
      alertType: a.alertType,
      title: a.title,
    })),
    durationMs: result.durationMs,
  });
}
