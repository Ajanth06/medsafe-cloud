import { Newspaper } from "lucide-react";
import { miDe, tStatus } from "@/lib/market-intelligence/i18n/de";
import { cn } from "@/lib/utils";
import type { EngineStatus, NewsSystemHealth, OperationsHealth } from "@/lib/types/market";

interface NewsStatusBadgeProps {
  newsHealth?: NewsSystemHealth;
  newsEngine: EngineStatus;
  operationsHealth?: OperationsHealth;
  variant?: "dark" | "light";
}

function resolveMode(props: NewsStatusBadgeProps): {
  label: string;
  tone: "live" | "demo" | "offline";
  source: string;
} {
  const monitoring = props.operationsHealth?.newsMonitoring;
  const isLive = props.newsHealth?.isLive ?? props.newsEngine === "ACTIVE";
  const primary =
    props.newsHealth?.primarySource ??
    (isLive ? "Oil RSS (Free)" : "Demo-News");
  const official =
    props.newsHealth?.officialSourceLabel ?? "Free Oil RSS + Official (EIA, Fed)";
  const source = `${primary} · ${official}`;

  if (monitoring === "OFFLINE") {
    return {
      label: miDe.newsMonitoringOff,
      tone: "offline",
      source,
    };
  }

  if (isLive) {
    return { label: miDe.newsLive, tone: "live", source };
  }

  return { label: miDe.newsDemo, tone: "demo", source };
}

export function NewsStatusBadge(props: NewsStatusBadgeProps) {
  const { label, tone, source } = resolveMode(props);
  const engineLabel = tStatus(props.newsEngine);
  const light = props.variant === "light";

  return (
    <div
      className={cn(
        "inline-flex max-w-full flex-col gap-0.5 rounded-2xl border px-3 py-1.5",
        tone === "live" &&
          (light
            ? "border-cyan-200 bg-cyan-50"
            : "border-emerald-300/40 bg-emerald-500/10"),
        tone === "demo" &&
          (light
            ? "border-amber-200 bg-amber-50"
            : "border-amber-300/40 bg-amber-500/10"),
        tone === "offline" &&
          (light
            ? "border-red-200 bg-red-50"
            : "border-red-300/40 bg-red-500/10"),
      )}
      title={`${miDe.newsSource}: ${source}`}
    >
      <span className="inline-flex items-center gap-2">
        <Newspaper
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            tone === "live" && (light ? "text-cyan-600" : "text-emerald-300"),
            tone === "demo" && (light ? "text-amber-600" : "text-amber-300"),
            tone === "offline" && (light ? "text-red-600" : "text-red-300"),
          )}
          aria-hidden="true"
        />
        <span
          className={cn(
            "text-[11px] font-semibold uppercase tracking-widest",
            tone === "live" && (light ? "text-cyan-800" : "text-emerald-100"),
            tone === "demo" && (light ? "text-amber-800" : "text-amber-100"),
            tone === "offline" && (light ? "text-red-800" : "text-red-100"),
          )}
        >
          {miDe.newsStatus}: {label}
        </span>
        <span
          className={cn(
            "hidden font-mono text-[10px] uppercase sm:inline",
            light ? "text-slate-500" : "text-slate-400",
          )}
        >
          {engineLabel}
        </span>
      </span>
      <span
        className={cn(
          "hidden truncate pl-5 text-[10px] leading-tight md:block",
          light ? "text-slate-600" : "text-slate-300",
        )}
      >
        {source}
      </span>
    </div>
  );
}
