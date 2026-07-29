import { Card, CardContent } from "@/components/ui/card";
import { SeverityBadge } from "@/components/market-intelligence/severity-badge";
import { formatTime } from "@/lib/market-intelligence/format";
import type { LiveFeedEntry } from "@/lib/types/market";

interface LiveIntelligenceFeedProps {
  entries: LiveFeedEntry[];
}

export function LiveIntelligenceFeed({ entries }: LiveIntelligenceFeedProps) {
  if (entries.length === 0) return null;

  return (
    <section aria-labelledby="live-feed-heading">
      <h2
        id="live-feed-heading"
        className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted"
      >
        Live Intelligence Feed
      </h2>
      <Card>
        <CardContent className="p-0">
          <ol className="divide-y divide-border">
            {entries.slice(0, 12).map((entry) => (
              <li key={entry.id} className="flex gap-4 px-4 py-3">
                <time
                  className="shrink-0 font-mono text-xs text-muted"
                  dateTime={entry.timestamp}
                >
                  {formatTime(entry.timestamp)}
                </time>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{entry.title}</p>
                    {entry.severity && (
                      <SeverityBadge severity={entry.severity} />
                    )}
                  </div>
                  {entry.description && (
                    <p className="mt-0.5 text-xs text-muted">{entry.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </section>
  );
}
