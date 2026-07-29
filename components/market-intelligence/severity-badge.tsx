import { tSeverity } from "@/lib/market-intelligence/i18n/de";
import { cn } from "@/lib/utils";
import type { AlertSeverity, EventSeverity } from "@/lib/types/market";

const severityStyles: Record<EventSeverity | AlertSeverity | "INFO", string> = {
  INFO: "bg-slate-50 text-slate-600 border-slate-200",
  LOW: "bg-slate-100 text-slate-600 border-slate-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200",
  CRITICAL: "bg-red-50 text-red-700 border-red-300 ring-1 ring-red-200",
};

interface SeverityBadgeProps {
  severity: EventSeverity | AlertSeverity;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        severityStyles[severity],
        className,
      )}
    >
      {tSeverity(severity)}
    </span>
  );
}
