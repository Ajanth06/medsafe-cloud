"use client";

import { formatTime } from "@/lib/market-intelligence/format";
import { cn } from "@/lib/utils";
import type { SystemHealth } from "@/lib/types/market";

interface SystemHealthPillProps {
  health: SystemHealth;
}

function tone(
  status: string | undefined,
): "ok" | "warn" | "bad" {
  if (!status) return "warn";
  if (
    status === "ONLINE" ||
    status === "ACTIVE" ||
    status === "READY" ||
    status === "CONNECTED" ||
    status === "HEALTHY"
  ) {
    return "ok";
  }
  if (
    status === "STALE" ||
    status === "DEGRADED" ||
    status === "RECONNECTING" ||
    status === "IDLE"
  ) {
    return "warn";
  }
  return "bad";
}

function Dot({ status }: { status: string | undefined }) {
  const t = tone(status);
  return (
    <span
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full",
        t === "ok" && "bg-emerald-400",
        t === "warn" && "bg-amber-400",
        t === "bad" && "bg-red-400",
      )}
      aria-hidden="true"
    />
  );
}

/**
 * Compact health strip for mobile + overview (Yahoo / RSS / Worker).
 */
export function SystemHealthPill({ health }: SystemHealthPillProps) {
  const news = health.newsHealth;
  const ops = health.operationsHealth;
  const worker =
    ops?.workers?.find((w) => w.workerType === "market" || w.workerType === "news") ??
    ops?.workers?.[0];

  const items = [
    {
      label: "Yahoo",
      status: health.marketData ?? health.wtiFeed,
    },
    {
      label: "RSS",
      status: news?.isLive
        ? "ONLINE"
        : news?.newsEngine === "ACTIVE"
          ? "ONLINE"
          : news?.newsEngine ?? health.newsEngine,
    },
    {
      label: "KI",
      status: health.aiEngine,
    },
    {
      label: "Worker",
      status: worker?.status ?? (ops?.marketMonitoring === "ACTIVE" ? "ACTIVE" : "IDLE"),
    },
  ];

  const worst = items.some((i) => tone(i.status) === "bad")
    ? "bad"
    : items.some((i) => tone(i.status) === "warn")
      ? "warn"
      : "ok";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border px-3 py-2",
        worst === "ok" && "border-emerald-400/20 bg-emerald-500/5",
        worst === "warn" && "border-amber-400/25 bg-amber-500/5",
        worst === "bad" && "border-red-400/30 bg-red-500/10",
      )}
      aria-label="Systemstatus"
    >
      <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-400">
        Status
      </span>
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-1.5 font-mono text-[10px] text-slate-300"
        >
          <Dot status={item.status} />
          {item.label}
        </span>
      ))}
      {health.lastMarketUpdate && (
        <span className="ml-auto font-mono text-[9px] text-slate-500">
          Kurs {formatTime(health.lastMarketUpdate)}
        </span>
      )}
    </div>
  );
}
