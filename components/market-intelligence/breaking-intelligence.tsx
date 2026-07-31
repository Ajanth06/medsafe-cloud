"use client";

import { AIAssessment } from "@/components/market-intelligence/ai-assessment";
import { AIMarketAssessment } from "@/components/market-intelligence/ai-market-assessment";
import { SeverityBadge } from "@/components/market-intelligence/severity-badge";
import { SourceVerificationBadge } from "@/components/market-intelligence/source-verification-badge";
import { Card, CardContent } from "@/components/ui/card";
import { buildDemoAnalysis } from "@/lib/market-intelligence/services/ai-analysis";
import { formatChange, formatTime } from "@/lib/market-intelligence/format";
import { flashTopicLabel } from "@/lib/i18n/news-labels";
import { useLabels, useMi } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";
import type { IntelligenceEventCluster, NewsEvent } from "@/lib/types/market";

interface BreakingIntelligenceProps {
  events: NewsEvent[];
  intelligenceEvents?: IntelligenceEventCluster[];
}

export function BreakingIntelligence({
  events,
  intelligenceEvents = [],
}: BreakingIntelligenceProps) {
  const t = useMi();
  const { tVerification, tEventStatus } = useLabels();

  return (
    <section aria-labelledby="breaking-intelligence-heading">
      <h2
        id="breaking-intelligence-heading"
        className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted"
      >
        {t.breakingIntel}
      </h2>
      <div className="space-y-4">
        {events.map((event) => {
          const cluster = intelligenceEvents.find((c) => c.id === event.id);
          const liveAi = cluster?.aiAnalysisResult;
          const showAi =
            event.severity === "CRITICAL" ||
            event.severity === "HIGH" ||
            Boolean(liveAi);
          const fallback = buildDemoAnalysis(event);

          return (
            <div
              key={event.id}
              className={cn(
                "grid gap-4",
                showAi ? "lg:grid-cols-2" : "lg:grid-cols-1",
              )}
            >
              <Card
                className={cn(
                  event.severity === "CRITICAL" &&
                    "border-red-300 bg-red-50/30 ring-1 ring-red-200",
                )}
              >
                <CardContent className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    {event.isFlash && (
                      <span className="rounded-md bg-orange-500 px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider text-white">
                        Flash
                      </span>
                    )}
                    {event.flashTopic && (
                      <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-slate-200">
                        {flashTopicLabel(event.flashTopic, t)}
                      </span>
                    )}
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
                      {event.url ? (
                        <a
                          href={event.url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-orange-600 hover:underline"
                        >
                          {event.title}
                        </a>
                      ) : (
                        event.title
                      )}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">
                      {event.summary}
                    </p>
                  </div>

                  <div className="text-xs text-muted">
                    <span className="font-medium text-foreground">{t.sources}:</span>{" "}
                    {event.sourceVerification.sources.join(", ")}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                      {t.statusLabel}:
                    </span>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                        event.sourceVerification.status === "UNVERIFIED" ||
                          event.sourceVerification.status === "SINGLE_SOURCE"
                          ? "bg-amber-50 text-amber-700"
                          : event.sourceVerification.status === "CONFLICTING"
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700",
                      )}
                    >
                      {event.sourceVerification.status === "UNVERIFIED"
                        ? tVerification("UNVERIFIED")
                        : tEventStatus(event.status)}
                    </span>
                  </div>

                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                      {t.affectedMarkets}
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

              {showAi &&
                (liveAi ? (
                  <AIMarketAssessment analysis={liveAi} />
                ) : (
                  <AIAssessment analysis={fallback} />
                ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
