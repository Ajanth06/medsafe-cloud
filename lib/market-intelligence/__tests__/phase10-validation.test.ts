import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProductionValidationReport } from "@/lib/market-intelligence/validation/production-validator";

describe("phase10 production validation", () => {
  it("builds validation report with checks", async () => {
    const report = await buildProductionValidationReport();
    assert.ok(report.generatedAt);
    assert.ok(["HEALTHY", "DEGRADED", "CRITICAL"].includes(report.overallStatus));
    assert.ok(report.checks.length >= 5);
    assert.ok(report.checks.some((c) => c.id === "supabase"));
    assert.ok(report.checks.some((c) => c.id === "market-data"));
    assert.equal(typeof report.metrics.persistenceEnabled, "boolean");
  });
});
