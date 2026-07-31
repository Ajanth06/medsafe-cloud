"use client";

import Link from "next/link";
import { AIMarketAssessment } from "@/components/market-intelligence/ai-market-assessment";
import { EvidencePanel } from "@/components/market-intelligence/evidence-panel";
import { SourceVerificationBadge } from "@/components/market-intelligence/source-verification-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatTime } from "@/lib/market-intelligence/format";
import { useLabels, useMi } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";
import type { IntelligenceEventCluster } from "@/lib/types/market";

interface IntelligenceEventsSectionProps {
  events: IntelligenceEventCluster[];
}

export function IntelligenceEventsSection({ events }: IntelligenceEventsSectionProps) {
  const t = useMi();
  const { tVerification, tSourcesCount } = useLabels();

  if (events.length === 0) return null;

  return (
    <section aria-labelledby="intelligence-events-heading">
      <h2
        id="intelligence-events-heading"
        className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted"
      >
        {t.intelEvents}
      </h2>
      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.id} className="space-y-4">
          <Card className={cn(event.dataAvailability === "DEMO" && "border-dashed")}>
            <CardContent className="space-y-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                {event.dataAvailability === "DEMO" && (
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                    {t.demoData}
                  </span>
                )}
                {event.state === "UNVERIFIED" && (
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                    {tVerification("UNVERIFIED")}
                  </span>
                )}
                {event.state === "CONFLICTING" && (
                  <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                    {t.conflictingReports}
                  </span>
                )}
                {event.watchMode && (
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-700">
                    {tVerification("WATCH_MODE")}
                  </span>
                )}
                <SourceVerificationBadge
                  status={event.verification.status}
                  sourceCount={event.independentSourceCount}
                />
                <span className="font-mono text-xs text-muted">
                  {formatTime(event.firstReportAt)} CET
                </span>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {event.eventType.replace(/_/g, " ")}
                </p>
                <h3 className="text-base font-semibold text-foreground">
                  <Link href={`/market-intelligence/events/${event.id}`} className="hover:text-blue-600 hover:underline">
                    {event.headline}
                  </Link>
                </h3>
                <p className="mt-1 text-sm text-muted">{event.summary}</p>
              </div>

              {event.leadLag && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {t.whatDetectedFirst}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">{event.leadLag.label}</p>
                  {!event.leadLag.isReliable && (
                    <p className="mt-0.5 text-xs text-muted">{t.timingApproximate}</p>
                  )}
                </div>
              )}

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {tSourcesCount(event.independentSourceCount)}
                </p>
                <div className="space-y-1">
                  {event.sources.slice(0, 5).map((source) => (
                    <div key={source.id} className="flex items-baseline gap-2 text-xs">
                      <span className="font-mono text-muted">{formatTime(source.publishedAt)}</span>
                      <span className="font-medium text-foreground">{source.sourceName}</span>
                      <span className="text-muted">{source.role.replace(/_/g, " ").toLowerCase()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {event.potentiallyAffectedMarkets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {event.potentiallyAffectedMarkets.map((symbol) => (
                    <span
                      key={symbol}
                      className="rounded-md border border-border px-2 py-0.5 font-mono text-xs"
                    >
                      {symbol}
                      {event.marketRelevance[symbol] && (
                        <span className="ml-1 text-muted">({event.marketRelevance[symbol]})</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          {event.aiAnalysisResult && (
            <div className="grid gap-4 lg:grid-cols-2">
              <AIMarketAssessment analysis={event.aiAnalysisResult} />
              <EvidencePanel analysis={event.aiAnalysisResult} />
            </div>
          )}
          </div>
        ))}
      </div>
    </section>
  );
}
