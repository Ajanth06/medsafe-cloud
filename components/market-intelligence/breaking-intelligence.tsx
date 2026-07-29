import { AIMarketAssessment } from "@/components/market-intelligence/ai-market-assessment";
import { AIAssessment } from "@/components/market-intelligence/ai-assessment";
import { SeverityBadge } from "@/components/market-intelligence/severity-badge";
import { SourceVerificationBadge } from "@/components/market-intelligence/source-verification-badge";
import { Card, CardContent } from "@/components/ui/card";
import { buildDemoAnalysis } from "@/lib/market-intelligence/services/ai-analysis";
import { formatChange, formatTime } from "@/lib/market-intelligence/format";
import { cn } from "@/lib/utils";
import type { NewsEvent } from "@/lib/types/market";

interface BreakingIntelligenceProps {
  events: NewsEvent[];
}

export function BreakingIntelligence({ events }: BreakingIntelligenceProps) {
  return (
    <section aria-labelledby="breaking-intelligence-heading">
      <h2
        id="breaking-intelligence-heading"
        className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted"
      >
        Breaking Intelligence
      </h2>
      <div className="space-y-4">
        {events.map((event) => {
          const analysis = buildDemoAnalysis(event);
          const isCritical = event.severity === "CRITICAL";

          return (
            <div
              key={event.id}
              className={cn(
                "grid gap-4",
                isCritical ? "lg:grid-cols-2" : "lg:grid-cols-1",
              )}
            >
              <Card
                className={cn(
                  isCritical && "border-red-300 bg-red-50/30 ring-1 ring-red-200",
                )}
              >
                <CardContent className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={event.severity} />
                    <span className="font-mono text-xs text-muted">
                      {formatTime(event.timestamp)} CET
                    </span>
                    <SourceVerificationBadge
                      status={event.sourceVerification.status}
                      sourceCount={event.sourceVerification.sourceCount}
                    />
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {event.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">
                      {event.summary}
                    </p>
                  </div>

                  <div className="text-xs text-muted">
                    <span className="font-medium text-foreground">Sources:</span>{" "}
                    {event.sourceVerification.sources.join(", ")}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                      Status:
                    </span>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                        event.sourceVerification.status === "UNVERIFIED" || event.sourceVerification.status === "SINGLE_SOURCE"
                          ? "bg-amber-50 text-amber-700"
                          : event.sourceVerification.status === "CONFLICTING"
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700",
                      )}
                    >
                      {event.sourceVerification.status === "UNVERIFIED"
                        ? "UNVERIFIED"
                        : event.status}
                    </span>
                  </div>

                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                      Affected Markets
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {event.affectedMarkets.map((market) => (
                        <span
                          key={market.symbol}
                          className={cn(
                            "rounded-lg border px-2.5 py-1 font-mono text-xs font-medium",
                            market.changePercent >= 0
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-red-200 bg-red-50 text-red-700",
                          )}
                        >
                          {market.name} {formatChange(market.changePercent, true)}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {isCritical && <AIAssessment analysis={analysis} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}
