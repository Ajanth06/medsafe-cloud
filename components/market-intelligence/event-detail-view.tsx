"use client";

import Link from "next/link";
import { AIMarketAssessment } from "@/components/market-intelligence/ai-market-assessment";
import { EvidencePanel } from "@/components/market-intelligence/evidence-panel";
import { SeverityBadge } from "@/components/market-intelligence/severity-badge";
import { SourceVerificationBadge } from "@/components/market-intelligence/source-verification-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatTime } from "@/lib/market-intelligence/format";
import { useLabels, useMi } from "@/components/i18n/locale-provider";
import type {
  DeliveredAlert,
  IntelligenceEventCluster,
  IntelligenceAlert,
  MarketEvent,
} from "@/lib/types/market";

interface EventDetailViewProps {
  eventId: string;
  alert?: DeliveredAlert;
  intelAlert?: IntelligenceAlert;
  cluster?: IntelligenceEventCluster;
  marketEvent?: MarketEvent;
}

export function EventDetailView({
  eventId,
  alert,
  intelAlert,
  cluster,
  marketEvent,
}: EventDetailViewProps) {
  const t = useMi();
  const { tSourcesCount } = useLabels();

  const title = alert?.title ?? cluster?.headline ?? marketEvent?.description ?? t.marketEventDefault;
  const severity = alert?.severity ?? intelAlert?.severity ?? cluster?.priority ?? marketEvent?.severity;

  return (
    <div className="space-y-6">
      <Link href="/market-intelligence?view=oil&oilView=geo" className="text-sm text-blue-600 hover:underline">
        {t.backToIntel}
      </Link>

      <header className="space-y-3 border-b border-border pb-6">
        <div className="flex flex-wrap items-center gap-2">
          {severity && <SeverityBadge severity={severity} />}
          {cluster && <SourceVerificationBadge status={cluster.verification.status} sourceCount={cluster.independentSourceCount} />}
          {cluster?.state && (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
              {cluster.state.replace(/_/g, " ")}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">{title}</h1>
        <p className="font-mono text-xs text-muted">{t.eventId}: {eventId}</p>
      </header>

      {alert && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">{t.alertDelivery}</h2>
            <p className="text-sm whitespace-pre-wrap text-foreground">{alert.body.replace(/<[^>]+>/g, "")}</p>
            {alert.affectedAssets.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {alert.affectedAssets.map((a) => (
                  <span key={a.symbol} className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs">
                    {a.symbol} {a.changePercent >= 0 ? "+" : ""}
                    {a.changePercent.toFixed(1)}%
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {marketEvent && (
        <Card>
          <CardContent className="space-y-2 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">{t.marketAnomaly}</h2>
            <p className="text-sm text-foreground">
              {marketEvent.symbol} {marketEvent.direction} {marketEvent.percentageChange.toFixed(2)}% {t.inWindow}{" "}
              {marketEvent.windowMinutes}m
            </p>
            <p className="text-xs text-muted">
              {t.detected} {formatTime(marketEvent.detectedAt)} CET · {t.replaySeverity}: {marketEvent.severity}
            </p>
          </CardContent>
        </Card>
      )}

      {cluster && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">{t.intelligenceCluster}</h2>
            <p className="text-sm text-foreground">{cluster.summary}</p>

            {cluster.leadLag && (
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{t.leadLag}</p>
                <p className="mt-1 text-sm font-medium">{cluster.leadLag.label}</p>
              </div>
            )}

            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                {tSourcesCount(cluster.independentSourceCount)}
              </p>
              <ol className="space-y-2">
                {cluster.sources.map((source) => (
                  <li key={source.id} className="flex gap-3 text-xs">
                    <span className="shrink-0 font-mono text-muted">{formatTime(source.publishedAt)}</span>
                    <div>
                      <p className="font-medium text-foreground">{source.sourceName}</p>
                      <p className="text-muted">{source.headline}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {cluster?.aiAnalysisResult && (
        <div className="grid gap-4 xl:grid-cols-2">
          <AIMarketAssessment analysis={cluster.aiAnalysisResult} />
          <EvidencePanel analysis={cluster.aiAnalysisResult} />
        </div>
      )}

      {!alert && !cluster && !marketEvent && (
        <p className="text-sm text-muted">{t.eventNotFound}</p>
      )}
    </div>
  );
}
