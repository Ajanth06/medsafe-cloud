import { Card, CardContent } from "@/components/ui/card";
import { formatTime } from "@/lib/market-intelligence/format";
import { cn } from "@/lib/utils";
import type { IntelligenceEvent } from "@/lib/types/market";

const categoryColors: Record<IntelligenceEvent["category"], string> = {
  detection: "bg-blue-500",
  threshold: "bg-orange-500",
  news: "bg-purple-500",
  verification: "bg-emerald-500",
  classification: "bg-amber-500",
  ai: "bg-slate-700",
  correlation: "bg-cyan-500",
  oil: "bg-yellow-600",
  alert: "bg-red-500",
};

interface IntelligenceTimelineProps {
  events: IntelligenceEvent[];
}

export function IntelligenceTimeline({ events }: IntelligenceTimelineProps) {
  return (
    <section aria-labelledby="intelligence-timeline-heading">
      <h2
        id="intelligence-timeline-heading"
        className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted"
      >
        Intelligence Timeline
      </h2>
      <Card>
        <CardContent className="p-5">
          <ol className="relative space-y-0">
            {events.map((event, index) => (
              <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
                {index < events.length - 1 && (
                  <span
                    className="absolute left-[5px] top-3 h-full w-px bg-border"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                    categoryColors[event.category],
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs text-muted">
                    {formatTime(event.timestamp)} CET
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-foreground">
                    {event.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{event.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </section>
  );
}
