import {
  Activity,
  Building2,
  Droplets,
  FileText,
  Pill,
  Scan,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { TimelineEvent } from "@/lib/types/health";

const iconMap = {
  blood: Droplets,
  pill: Pill,
  hospital: Building2,
  document: FileText,
  scan: Scan,
} as const;

interface TimelineViewProps {
  events: TimelineEvent[];
  year?: number;
}

export function TimelineView({ events, year = 2026 }: TimelineViewProps) {
  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">{year}</h2>
      <div className="relative">
        <div
          className="absolute bottom-2 left-[1.125rem] top-2 w-px bg-border"
          aria-hidden="true"
        />
        <div className="space-y-4">
          {events.map((event) => {
            const Icon = iconMap[event.icon];
            return (
              <Card key={event.id} className="relative ml-0 overflow-visible">
                <CardContent className="flex items-center gap-4 p-4 pl-12">
                  <span className="absolute left-3 flex h-9 w-9 items-center justify-center rounded-full border-4 border-background bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{event.label}</p>
                    <p className="text-sm text-muted">{event.date}</p>
                  </div>
                  <Activity className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
