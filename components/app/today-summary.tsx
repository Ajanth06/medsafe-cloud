import { Card, CardContent } from "@/components/ui/card";
import type { TodayItem } from "@/lib/types/health";

interface TodaySummaryProps {
  items: TodayItem[];
}

export function TodaySummary({ items }: TodaySummaryProps) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
        Heute
      </h2>
      <Card>
        <CardContent className="divide-y divide-border p-0">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-3 px-5 py-3.5">
              <span className="text-lg" aria-hidden="true">
                {item.icon}
              </span>
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
