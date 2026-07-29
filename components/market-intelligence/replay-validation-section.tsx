"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ReplaySummary {
  scenarioId: string;
  name: string;
  passed: boolean;
  failures: string[];
  warnings: string[];
  metrics?: {
    marketToAlertMs?: number;
    alertsGenerated: number;
    anomalyDetected: boolean;
    highestSeverity?: string;
  };
  durationMs: number;
}

export function ReplayValidationSection() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ReplaySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAll() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/market/replay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runAll: true }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { results: ReplaySummary[] };
      setResults(data.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Replay failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Historical Replay & Validation</h2>
          <p className="text-sm text-muted">
            Phase 7 — replay demo scenarios and measure detection → news → AI → alert latency.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void runAll()}>
          {loading ? "Running…" : "Run All Scenarios"}
        </Button>
      </div>

      {error && (
        <Card>
          <CardContent className="p-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      {results && (
        <div className="space-y-2">
          {results.map((r) => (
            <Card key={r.scenarioId} className={r.passed ? "border-emerald-200" : "border-amber-200"}>
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-foreground">{r.name}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      r.passed ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {r.passed ? "PASS" : "FAIL"}
                  </span>
                </div>
                {r.metrics && (
                  <p className="font-mono text-xs text-muted">
                    Alerts: {r.metrics.alertsGenerated} · Anomaly: {r.metrics.anomalyDetected ? "yes" : "no"}
                    {r.metrics.highestSeverity ? ` · Severity: ${r.metrics.highestSeverity}` : ""}
                    {r.metrics.marketToAlertMs != null ? ` · Market→Alert: ${r.metrics.marketToAlertMs}ms` : ""}
                  </p>
                )}
                {r.failures.length > 0 && (
                  <ul className="list-inside list-disc text-xs text-amber-800">
                    {r.failures.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
