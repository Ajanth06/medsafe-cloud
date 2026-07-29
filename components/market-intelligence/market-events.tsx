import { SeverityBadge } from "@/components/market-intelligence/severity-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatChange, formatTime } from "@/lib/market-intelligence/format";
import { miDe, tEventStatus } from "@/lib/market-intelligence/i18n/de";
import { cn } from "@/lib/utils";
import type { MarketEvent } from "@/lib/types/market";

interface MarketEventsProps {
  events: MarketEvent[];
}

export function MarketEvents({ events }: MarketEventsProps) {
  return (
    <section aria-labelledby="market-events-heading">
      <h2
        id="market-events-heading"
        className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted"
      >
        {miDe.marketEvents}
      </h2>
      <div className="space-y-2">
        {events.map((event) => (
          <Card
            key={event.id}
            className={cn(
              event.severity === "CRITICAL" &&
                "border-red-300 bg-red-50/50 ring-1 ring-red-200",
            )}
          >
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted">
                    {formatTime(event.timestamp)} CET
                  </span>
                  <SeverityBadge severity={event.severity} />
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-600">
                    {event.eventType.replace("_", " ")}
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {event.asset}{" "}
                  <span
                    className={cn(
                      "font-mono",
                      event.priceChangePercent >= 0 ? "text-emerald-600" : "text-red-600",
                    )}
                  >
                    {formatChange(event.priceChangePercent, true)}
                  </span>{" "}
                  <span className="font-normal text-muted">
                    / {event.windowMinutes} {miDe.minutesShort}
                  </span>
                </p>
                <p className="text-xs text-muted">{event.description}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 self-start rounded-md px-2 py-1 text-[10px] font-semibold uppercase sm:self-center",
                  event.status === "ACTIVE"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-slate-100 text-slate-600",
                )}
              >
                {tEventStatus(event.status)}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
