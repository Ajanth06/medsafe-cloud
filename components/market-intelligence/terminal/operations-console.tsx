"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatTime } from "@/lib/market-intelligence/format";
import { cn } from "@/lib/utils";

interface OperationsData {
  health: {
    marketMonitoring: string;
    newsMonitoring: string;
    alertEngine: string;
    telegram: string;
    lastPipelineRunAt?: string;
    hostingNote?: string;
    workers: { workerId: string; workerType: string; lastBeatAt: string; status: string }[];
  };
  watchdog: { healthy: boolean; issues: string[] };
  persistenceEnabled: boolean;
  jobs: { pending: number; running: number; failed: number; deadLetter: number };
  deliveryStats: { generated: number; failed: number; suppressed: number };
}

export function OperationsConsole() {
  const [data, setData] = useState<OperationsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/market/worker/status");
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setData((await res.json()) as OperationsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load operations status");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return <p className="text-sm text-muted">Loading operations console…</p>;
  }

  if (error && !data) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">System Operations</h2>
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Pipeline</p>
            <StatusLine label="Market monitoring" value={data.health.marketMonitoring} />
            <StatusLine label="News monitoring" value={data.health.newsMonitoring} />
            <StatusLine label="Alert engine" value={data.health.alertEngine} />
            <StatusLine label="Telegram" value={data.health.telegram} />
            {data.health.lastPipelineRunAt && (
              <p className="text-xs text-muted">
                Last run: {formatTime(data.health.lastPipelineRunAt)} CET
              </p>
            )}
            <p className="text-xs text-muted">
              Persistence: {data.persistenceEnabled ? "ON" : "in-memory"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Job Queue</p>
            <Metric label="Pending" value={data.jobs.pending} />
            <Metric label="Running" value={data.jobs.running} />
            <Metric label="Failed" value={data.jobs.failed} warn={data.jobs.failed > 0} />
            <Metric label="Dead letter" value={data.jobs.deadLetter} warn={data.jobs.deadLetter > 0} />
            <div className="border-t border-border pt-2">
              <Metric label="Alerts generated" value={data.deliveryStats.generated} />
              <Metric label="Suppressed" value={data.deliveryStats.suppressed} />
              <Metric label="Delivery failed" value={data.deliveryStats.failed} warn={data.deliveryStats.failed > 0} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={cn(!data.watchdog.healthy && "border-amber-300")}>
        <CardContent className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Watchdog</p>
          <p className={cn("mt-1 text-sm font-medium", data.watchdog.healthy ? "text-emerald-700" : "text-amber-700")}>
            {data.watchdog.healthy ? "All systems nominal" : "Issues detected"}
          </p>
          {data.watchdog.issues.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-xs text-muted">
              {data.watchdog.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {data.health.workers.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted">Workers</p>
            <div className="space-y-1">
              {data.health.workers.map((w) => (
                <p key={w.workerId} className="font-mono text-xs text-muted">
                  {w.workerType} · {w.status} · {formatTime(w.lastBeatAt)} CET
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.health.hostingNote && (
        <p className="text-xs leading-relaxed text-amber-800">{data.health.hostingNote}</p>
      )}
    </div>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  const ok = value === "ACTIVE" || value === "ONLINE" || value === "READY";
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={cn("font-mono text-xs uppercase", ok ? "text-emerald-700" : "text-amber-700")}>
        {value}
      </span>
    </div>
  );
}

function Metric({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={cn("font-mono font-semibold", warn && value > 0 && "text-amber-700")}>{value}</span>
    </div>
  );
}
