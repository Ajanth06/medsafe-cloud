import { miDe } from "@/lib/market-intelligence/i18n/de";
import { cn } from "@/lib/utils";
import type { DataAvailability } from "@/lib/types/market";

interface LiveIndicatorProps {
  isLive?: boolean;
  dataAvailability?: DataAvailability;
}

export function LiveIndicator({ isLive = false, dataAvailability }: LiveIndicatorProps) {
  if (!isLive) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1">
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-200">
          {dataAvailability === "DEMO" ? miDe.demoData : miDe.noLiveFeed}
        </span>
      </div>
    );
  }

  const isDelayed = dataAvailability === "DELAYED";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1",
        isDelayed
          ? "border-orange-300/25 bg-orange-400/10"
          : "border-cyan-300/25 bg-cyan-400/10",
      )}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
            isDelayed ? "bg-orange-400" : "bg-cyan-400",
          )}
        />
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            isDelayed ? "bg-orange-500" : "bg-cyan-500",
          )}
        />
      </span>
      <span
        className={cn(
          "text-[11px] font-semibold uppercase tracking-widest",
          isDelayed ? "text-orange-200" : "text-cyan-200",
        )}
      >
        {isDelayed ? miDe.delayedFeed : miDe.liveMonitoring}
      </span>
    </div>
  );
}
