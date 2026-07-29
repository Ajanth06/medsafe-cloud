#!/usr/bin/env npx tsx
/**
 * AARYX production validation — runs health report and optional replay suite.
 * Usage: npm run mi:validate
 */
import { buildProductionValidationReport } from "../lib/market-intelligence/validation/production-validator";
import { runAllReplayScenarios } from "../lib/market-intelligence/replay/replay-engine";
import { persistValidationRun } from "../lib/market-intelligence/persistence/validation-repository";

async function main(): Promise<void> {
  console.log("=== AARYX Production Validation ===\n");

  const report = await buildProductionValidationReport();
  console.log(`Overall: ${report.overallStatus}`);
  for (const check of report.checks) {
    console.log(`  [${check.status}] ${check.name}: ${check.detail}`);
  }

  await persistValidationRun({
    runType: "HEALTH_CHECK",
    passed: report.overallStatus === "HEALTHY",
    metrics: report.metrics as unknown as Record<string, unknown>,
    failures: report.checks.filter((c) => c.status === "FAIL").map((c) => c.detail),
    warnings: report.checks.filter((c) => c.status === "WARN").map((c) => c.detail),
  });

  console.log("\n=== Replay Scenarios ===\n");
  const results = await runAllReplayScenarios();
  const passed = results.filter((r) => r.validation.passed).length;
  console.log(`Replay: ${passed}/${results.length} passed`);

  for (const r of results) {
    console.log(`  ${r.validation.passed ? "✓" : "✗"} ${r.scenario.id} (${r.durationMs}ms)`);
    if (!r.validation.passed) {
      for (const f of r.validation.failures) console.log(`      - ${f}`);
    }
  }

  await persistValidationRun({
    runType: "REPLAY",
    passed: passed === results.length,
    totalScenarios: results.length,
    passedScenarios: passed,
    failedScenarios: results.length - passed,
    metrics: { passRate: Math.round((passed / results.length) * 100) },
  });

  console.log("\nValidation complete.");
  process.exit(passed === results.length && report.overallStatus !== "CRITICAL" ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
