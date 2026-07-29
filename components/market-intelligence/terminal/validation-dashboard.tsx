"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { miDe, tStatus } from "@/lib/market-intelligence/i18n/de";
import { cn } from "@/lib/utils";

interface ValidationCheck {
  id: string;
  name: string;
  status: "PASS" | "WARN" | "FAIL";
  detail: string;
}

interface ValidationReport {
  generatedAt: string;
  overallStatus: "HEALTHY" | "DEGRADED" | "CRITICAL";
  checks: ValidationCheck[];
  metrics: {
    persistenceEnabled: boolean;
    isLive: boolean;
    replayPassRate: number | null;
    jobsDeadLetter: number;
  };
}

export function ValidationDashboard() {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState(true);

  async function runCheck() {
    setLoading(true);
    try {
      const res = await fetch("/api/market/validation", { method: "POST" });
      if (res.ok) setReport((await res.json()) as ValidationReport);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/market/validation");
        if (res.ok) setReport((await res.json()) as ValidationReport);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading && !report) {
    return <p className="text-sm text-muted">{miDe.loadingValidation}</p>;
  }

  if (!report) return null;

  const statusColor = {
    HEALTHY: "text-emerald-700",
    DEGRADED: "text-amber-700",
    CRITICAL: "text-red-700",
  }[report.overallStatus];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{miDe.validationTitle}</h2>
          <p className={cn("text-sm font-medium", statusColor)}>{miDe.statusLabel}: {tStatus(report.overallStatus)}</p>
        </div>
        <button
          type="button"
          onClick={() => void runCheck()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white"
        >
          {miDe.runHealthCheck}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label={miDe.persistence} value={report.metrics.persistenceEnabled ? miDe.persistenceOn : miDe.persistenceOff} />
        <MetricCard label={miDe.liveData} value={report.metrics.isLive ? miDe.liveData : miDe.demoData} />
        <MetricCard
          label={miDe.replayPassRate}
          value={report.metrics.replayPassRate != null ? `${report.metrics.replayPassRate}%` : "—"}
        />
      </div>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {report.checks.map((check) => (
            <div key={check.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{check.name}</p>
                <p className="text-xs text-muted">{check.detail}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                  check.status === "PASS" && "bg-emerald-100 text-emerald-800",
                  check.status === "WARN" && "bg-amber-100 text-amber-800",
                  check.status === "FAIL" && "bg-red-100 text-red-800",
                )}
              >
                {tStatus(check.status)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">{label}</p>
        <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
