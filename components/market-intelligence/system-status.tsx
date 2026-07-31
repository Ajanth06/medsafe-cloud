"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatTime } from "@/lib/market-intelligence/format";
import { useLabels, useMi } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";
import type { EngineStatus, FeedConnectionState, OperationsHealth, ProviderHealthStatus, SystemHealth } from "@/lib/types/market";

interface SystemStatusProps {
  health: SystemHealth;
}

function StatusDot({ status }: { status: ProviderHealthStatus | EngineStatus | FeedConnectionState }) {
  const online =
    status === "ONLINE" ||
    status === "ACTIVE" ||
    status === "READY" ||
    status === "CONNECTED";
  const stale = status === "STALE" || status === "DEGRADED" || status === "RECONNECTING";
  const offline =
    status === "OFFLINE" ||
    status === "NOT_CONFIGURED" ||
    status === "DISCONNECTED";

  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        online && "bg-emerald-500",
        stale && "bg-amber-500",
        offline && "bg-red-400",
        !online && !stale && !offline && "bg-slate-400",
      )}
      aria-hidden="true"
    />
  );
}

function StatusRow({
  label,
  status,
}: {
  label: string;
  status: ProviderHealthStatus | EngineStatus | FeedConnectionState;
}) {
  const { tStatus } = useLabels();
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="flex items-center gap-2 font-medium text-foreground">
        <StatusDot status={status} />
        <span className="font-mono text-xs uppercase">{tStatus(status)}</span>
      </span>
    </div>
  );
}

function OperationsRows({
  ops,
  labels,
}: {
  ops: OperationsHealth;
  labels: {
    marketMonitoring: string;
    newsMonitoring: string;
    alertEngine: string;
    lastPipeline: string;
  };
}) {
  const { tStatus } = useLabels();
  return (
    <div className="space-y-2">
      <StatusRow label={labels.marketMonitoring} status={ops.marketMonitoring} />
      <StatusRow label={labels.newsMonitoring} status={ops.newsMonitoring} />
      <StatusRow label={labels.alertEngine} status={ops.alertEngine} />
      <StatusRow label="Telegram" status={ops.telegram} />
      {ops.lastPipelineRunAt && (
        <p className="text-xs text-muted">
          {labels.lastPipeline}: {formatTime(ops.lastPipelineRunAt)} CET
        </p>
      )}
      {ops.hostingNote && (
        <p className="text-[10px] leading-relaxed text-amber-700">{ops.hostingNote}</p>
      )}
      {ops.workers.length > 0 && (
        <div className="space-y-1 pt-1">
          {ops.workers.map((w) => (
            <p key={w.workerId} className="font-mono text-[10px] text-muted">
              {w.workerType}: {formatTime(w.lastBeatAt)} — {tStatus(w.status)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function SystemStatus({ health }: SystemStatusProps) {
  const t = useMi();

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">
          {t.systemStatus}
        </p>
        <div className="space-y-2">
          <StatusRow
            label={t.marketProvider}
            status={health.providerConfigured ? health.marketData : "NOT_CONFIGURED"}
          />
          <StatusRow label="WTI" status={health.wtiFeed} />
          <StatusRow label="BRENT" status={health.brentFeed} />
          {health.goldFeed && <StatusRow label={t.gold} status={health.goldFeed} />}
          <StatusRow label={t.restFallback} status={health.restFallback} />
          <StatusRow label={t.eventDetection} status={health.eventDetection} />
          <StatusRow label={t.newsEngine} status={health.newsEngine} />
          {health.newsHealth && (
            <>
              <div className="rounded-lg border border-border/60 bg-muted/20 px-2.5 py-2 text-xs">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">
                  {t.newsSource}
                </p>
                <p className="mt-1 font-medium text-foreground">
                  {health.newsHealth.primarySource}
                </p>
                <p className="mt-0.5 text-muted">{health.newsHealth.officialSourceLabel}</p>
                {health.newsHealth.lastNewsAt && (
                  <p className="mt-1 text-[10px] text-muted">
                    {t.lastNews}: {formatTime(health.newsHealth.lastNewsAt)} CET
                  </p>
                )}
              </div>
              <StatusRow label={t.verification} status={health.newsHealth.verificationEngine} />
              <StatusRow label={t.eventCorrelation} status={health.newsHealth.eventCorrelation} />
            </>
          )}
          <StatusRow label={t.aiEngine} status={health.aiEngine} />
          {health.operationsHealth && (
            <>
              <div className="border-t border-border pt-2">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted">{t.aaryx247Status}</p>
                <OperationsRows ops={health.operationsHealth} labels={t} />
              </div>
            </>
          )}
        </div>
        <div className="border-t border-border pt-2 text-xs text-muted">
          <p>
            {t.sourceLabel}: <span className="font-medium text-foreground">{health.dataSource}</span>
          </p>
          {health.lastHeartbeat && (
            <p className="mt-1">{t.lastHeartbeat}: {formatTime(health.lastHeartbeat)} CET</p>
          )}
          {health.averageLatencyMs != null && (
            <p className="mt-1">{t.avgLatency}: {health.averageLatencyMs}ms</p>
          )}
          {!health.isLive && (
            <p className="mt-1 font-medium text-amber-700">
              {t.noProviderWarning}
            </p>
          )}
          {health.newsHealth && !health.newsHealth.isLive && (
            <p className="mt-1 font-medium text-amber-700">
              {t.newsDemoWarning}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
