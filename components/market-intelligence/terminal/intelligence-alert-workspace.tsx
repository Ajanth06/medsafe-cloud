"use client";

import {
  BellRing,
  Brain,
  CircleAlert,
  Gauge,
  Waves,
} from "lucide-react";
import { useMi } from "@/components/i18n/locale-provider";
import { formatChange, formatTime } from "@/lib/market-intelligence/format";
import { cn } from "@/lib/utils";
import type {
  DeliveredAlert,
  IntelligenceAlert,
  IntelligenceEventCluster,
} from "@/lib/types/market";

interface IntelligenceAlertWorkspaceProps {
  intelligenceAlerts: IntelligenceAlert[];
  deliveredAlerts: DeliveredAlert[];
  intelligenceEvents: IntelligenceEventCluster[];
  paused?: boolean;
}

type AlertItem = {
  id: string;
  eventId?: string;
  severity: IntelligenceAlert["severity"];
  title: string;
  happened: string;
  why: string;
  assets: IntelligenceAlert["affectedAssets"];
  risk: string;
  ai: string;
  timestamp: string;
  category: string;
};

function categoryFor(title: string, description: string) {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes("hormuz")) return "HORMUZ ALERT";
  if (text.includes("opec")) return "OPEC ALERT";
  if (/supply|pipeline|outage|disruption/.test(text)) return "SUPPLY ALERT";
  if (/iran|israel|sanction|military|attack|geopolit/.test(text)) {
    return "GEOPOLITICAL ALERT";
  }
  if (/volatil/.test(text)) return "VOLATILITY ALERT";
  return "PRICE ALERT";
}

function severityTone(severity: IntelligenceAlert["severity"]) {
  if (severity === "CRITICAL") {
    return "border-red-400/35 bg-red-500/[0.08]";
  }
  if (severity === "HIGH") {
    return "border-orange-400/30 bg-orange-500/[0.07]";
  }
  if (severity === "MEDIUM") {
    return "border-amber-400/25 bg-amber-500/[0.05]";
  }
  return "border-cyan-400/20 bg-cyan-500/[0.04]";
}

export function IntelligenceAlertWorkspace({
  intelligenceAlerts,
  deliveredAlerts,
  intelligenceEvents,
  paused = false,
}: IntelligenceAlertWorkspaceProps) {
  const t = useMi();
  const normalized: AlertItem[] = intelligenceAlerts.map((alert) => {
    const related = intelligenceEvents.find(
      (event) =>
        event.id === alert.id ||
        event.headline.toLowerCase() === alert.title.toLowerCase(),
    );
    return {
      id: alert.id,
      severity: alert.severity,
      title: alert.title,
      happened: alert.description,
      why:
        related?.aiAnalysisResult?.impactAssessment ??
        related?.summary ??
        alert.possibleEvent ??
        t.alertThresholdFallback,
      assets: alert.affectedAssets,
      risk: `${alert.severity} · ${t.confidence} ${alert.confidenceScore}/100`,
      ai:
        related?.aiAnalysisResult?.summary ??
        alert.possibleEvent ??
        t.alertNoAiFallback,
      timestamp: alert.timestamps.alertCreatedAt ?? new Date().toISOString(),
      category: categoryFor(alert.title, alert.description),
    };
  });

  const knownTitles = new Set(normalized.map((alert) => alert.title.toLowerCase()));
  for (const alert of deliveredAlerts) {
    if (knownTitles.has(alert.title.toLowerCase())) continue;
    const related = intelligenceEvents.find(
      (event) =>
        event.id === alert.intelligenceEventId || event.id === alert.eventId,
    );
    normalized.push({
      id: alert.id,
      eventId: alert.eventId,
      severity: alert.severity,
      title: alert.title,
      happened: alert.body,
      why:
        related?.aiAnalysisResult?.impactAssessment ??
        related?.summary ??
        alert.materialChange?.[0] ??
        t.alertMaterialChangeFallback,
      assets: alert.affectedAssets,
      risk: `${alert.severity}${alert.confidenceScore != null ? ` · ${t.confidence} ${alert.confidenceScore}/100` : ""}`,
      ai:
        related?.aiAnalysisResult?.summary ??
        t.alertWatchingAiFallback,
      timestamp: alert.createdAt,
      category: categoryFor(alert.title, alert.body),
    });
  }
  normalized.sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  );

  return (
    <div className="space-y-5">
      <header>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">
          {t.alertsHistoryEyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-white">
          {t.alertsWhatHappenedTitle}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {t.alertsWorkspaceSubtitle}
        </p>
      </header>

      {normalized.length === 0 ? (
        <section className="rounded-2xl border border-white/10 bg-[#101c29]/90 p-8 text-center">
          <BellRing className="mx-auto h-6 w-6 text-slate-500" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-white">
            {paused ? t.alertsPausedTitle : t.alertsEmptyTitle}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {paused ? t.alertsPausedHint : t.alertsEmptyHint}
          </p>
        </section>
      ) : (
        <section className="space-y-3" aria-label={t.alertsHistoryEyebrow}>
          {normalized.map((alert) => (
            <article
              key={alert.id}
              className={cn(
                "rounded-2xl border p-4 md:p-5",
                severityTone(alert.severity),
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-black/20 px-2 py-1 font-mono text-[9px] font-black uppercase tracking-wider text-white">
                  {alert.category}
                </span>
                <span
                  className={cn(
                    "rounded-md px-2 py-1 font-mono text-[9px] font-black",
                    alert.severity === "CRITICAL"
                      ? "bg-red-500/20 text-red-200"
                      : alert.severity === "HIGH"
                        ? "bg-orange-500/20 text-orange-200"
                        : alert.severity === "MEDIUM"
                          ? "bg-amber-500/20 text-amber-200"
                          : "bg-cyan-500/15 text-cyan-200",
                  )}
                >
                  {alert.severity}
                </span>
                <span className="ml-auto font-mono text-[9px] text-slate-500">
                  {formatTime(alert.timestamp)} CET
                </span>
              </div>
              <h3 className="mt-3 text-base font-semibold text-white">
                {alert.title}
              </h3>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <InfoBlock
                  icon={CircleAlert}
                  label={t.whatHappened}
                  text={alert.happened}
                />
                <InfoBlock
                  icon={Gauge}
                  label={t.whyImportant}
                  text={alert.why}
                />
                <div className="rounded-xl border border-white/8 bg-black/15 p-3">
                  <div className="flex items-center gap-2">
                    <Waves className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {t.meaningForOil}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {alert.assets.length ? (
                      alert.assets.map((asset) => (
                        <span
                          key={asset.symbol}
                          className={cn(
                            "rounded-md px-2 py-1 font-mono text-[10px] font-semibold",
                            asset.changePercent >= 0
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-red-500/10 text-red-300",
                          )}
                        >
                          {asset.symbol} {formatChange(asset.changePercent, true)}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">
                        {t.marketImpactPending}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 font-mono text-[10px] text-slate-400">
                    {t.riskPrefix} {alert.risk}
                  </p>
                </div>
                <InfoBlock
                  icon={Brain}
                  label={t.whatAiSays}
                  text={alert.ai}
                  accent
                />
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

function InfoBlock({
  icon: Icon,
  label,
  text,
  accent = false,
}: {
  icon: typeof Brain;
  label: string;
  text: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        accent
          ? "border-violet-400/15 bg-violet-500/[0.06]"
          : "border-white/8 bg-black/15",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={cn("h-4 w-4", accent ? "text-violet-300" : "text-orange-300")}
          aria-hidden="true"
        />
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-300">{text}</p>
    </div>
  );
}
