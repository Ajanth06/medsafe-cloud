import { tDataAvailability } from "@/lib/market-intelligence/i18n/de";
import { cn } from "@/lib/utils";
import type { DataAvailability } from "@/lib/types/market";

const styles: Record<DataAvailability, string> = {
  LIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DELAYED: "bg-orange-50 text-orange-700 border-orange-200",
  DEMO: "bg-amber-50 text-amber-700 border-amber-200",
  UNAVAILABLE: "bg-red-50 text-red-700 border-red-200",
  STALE: "bg-slate-100 text-slate-600 border-slate-200",
};

interface DataAvailabilityBadgeProps {
  availability: DataAvailability;
  className?: string;
}

export function DataAvailabilityBadge({
  availability,
  className,
}: DataAvailabilityBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase",
        styles[availability],
        className,
      )}
    >
      {tDataAvailability(availability)}
    </span>
  );
}
