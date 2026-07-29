import { Card, CardContent } from "@/components/ui/card";
import { formatTime } from "@/lib/market-intelligence/format";
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
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="flex items-center gap-2 font-medium text-foreground">
        <StatusDot status={status} />
        <span className="font-mono text-xs uppercase">{status}</span>
      </span>
    </div>
  );
}

function OperationsRows({ ops }: { ops: OperationsHealth }) {
  return (
    <div className="space-y-2">
      <StatusRow label="Market Monitoring" status={ops.marketMonitoring} />
      <StatusRow label="News Monitoring" status={ops.newsMonitoring} />
      <StatusRow label="Alert Engine" status={ops.alertEngine} />
      <StatusRow label="Telegram" status={ops.telegram} />
      {ops.lastPipelineRunAt && (
        <p className="text-xs text-muted">
          Last pipeline: {formatTime(ops.lastPipelineRunAt)} CET
        </p>
      )}
      {ops.hostingNote && (
        <p className="text-[10px] leading-relaxed text-amber-700">{ops.hostingNote}</p>
      )}
      {ops.workers.length > 0 && (
        <div className="space-y-1 pt-1">
          {ops.workers.map((w) => (
            <p key={w.workerId} className="font-mono text-[10px] text-muted">
              {w.workerType}: {formatTime(w.lastBeatAt)} — {w.status}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function SystemStatus({ health }: SystemStatusProps) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">
          System Status
        </p>
        <div className="space-y-2">
          <StatusRow
            label="Market Provider"
            status={health.providerConfigured ? health.marketData : "NOT_CONFIGURED"}
          />
          <StatusRow label="WTI" status={health.wtiFeed} />
          <StatusRow label="Brent" status={health.brentFeed} />
          {health.goldFeed && <StatusRow label="Gold" status={health.goldFeed} />}
          <StatusRow label="WebSocket" status={health.websocket} />
          <StatusRow label="REST Fallback" status={health.restFallback} />
          <StatusRow label="Event Detection" status={health.eventDetection} />
          <StatusRow label="News Engine" status={health.newsEngine} />
          {health.newsHealth && (
            <>
              <StatusRow label="Verification" status={health.newsHealth.verificationEngine} />
              <StatusRow label="Event Correlation" status={health.newsHealth.eventCorrelation} />
            </>
          )}
          <StatusRow label="AI Engine" status={health.aiEngine} />
          {health.operationsHealth && (
            <>
              <div className="border-t border-border pt-2">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted">AARYX 24/7 Status</p>
                <OperationsRows ops={health.operationsHealth} />
              </div>
            </>
          )}
        </div>
        <div className="border-t border-border pt-2 text-xs text-muted">
          <p>
            Source: <span className="font-medium text-foreground">{health.dataSource}</span>
          </p>
          {health.lastHeartbeat && (
            <p className="mt-1">Last heartbeat: {formatTime(health.lastHeartbeat)} CET</p>
          )}
          {health.averageLatencyMs != null && (
            <p className="mt-1">Avg latency: {health.averageLatencyMs}ms</p>
          )}
          {!health.isLive && (
            <p className="mt-1 font-medium text-amber-700">
              No live provider configured — showing DEMO DATA
            </p>
          )}
          {health.newsHealth && !health.newsHealth.isLive && (
            <p className="mt-1 font-medium text-amber-700">
              News: DEMO / TEST DATA — set NEWS_API_KEY for live news
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}