"use client";

import {
  Activity,
  Brain,
  CheckCircle2,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { formatChange } from "@/lib/market-intelligence/format";
import { cn } from "@/lib/utils";
import type {
  EnrichedMarketQuote,
  IntelligenceEventCluster,
  NewsEvent,
} from "@/lib/types/market";

interface AiIntelligenceViewProps {
  wti?: EnrichedMarketQuote;
  brent?: EnrichedMarketQuote;
  breakingNews: NewsEvent[];
  intelligenceEvents: IntelligenceEventCluster[];
}

type RiskLevel = "LOW" | "MEDIUM" | "ELEVATED" | "HIGH" | "CRITICAL";

const BULLISH_TERMS = [
  "iran",
  "hormuz",
  "sanction",
  "strike",
  "attack",
  "disruption",
  "outage",
  "cut",
  "houthis",
  "red sea",
];
const BEARISH_TERMS = [
  "inventory build",
  "demand weakness",
  "weak demand",
  "production increase",
  "output increase",
  "oversupply",
];

function levelFromScore(score: number): RiskLevel {
  if (score >= 85) return "CRITICAL";
  if (score >= 65) return "HIGH";
  if (score >= 45) return "ELEVATED";
  if (score >= 25) return "MEDIUM";
  return "LOW";
}

function levelTone(level: RiskLevel): string {
  if (level === "CRITICAL") return "text-red-300 bg-red-500/15";
  if (level === "HIGH") return "text-orange-200 bg-orange-500/15";
  if (level === "ELEVATED") return "text-amber-200 bg-amber-500/15";
  if (level === "MEDIUM") return "text-cyan-200 bg-cyan-500/10";
  return "text-emerald-300 bg-emerald-500/10";
}

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export function AiIntelligenceView({
  wti,
  brent,
  breakingNews,
  intelligenceEvents,
}: AiIntelligenceViewProps) {
  const latestAi = [...intelligenceEvents]
    .filter((event) => event.aiAnalysisResult)
    .sort(
      (left, right) =>
        new Date(right.latestUpdateAt).getTime() -
        new Date(left.latestUpdateAt).getTime(),
    )[0];
  const ai = latestAi?.aiAnalysisResult;
  const combinedText = [
    ...breakingNews.map((item) => `${item.title} ${item.summary}`),
    ...intelligenceEvents.map(
      (item) => `${item.headline} ${item.summary}`,
    ),
  ]
    .join(" ")
    .toLowerCase();
  const priorityScore = Math.max(
    0,
    ...intelligenceEvents.map((event) => event.priorityScore),
  );
  const oilVolatility = Math.max(
    Math.abs(wti?.percentageChange ?? 0),
    Math.abs(brent?.percentageChange ?? 0),
  );
  const volatilityScore = Math.min(
    100,
    oilVolatility * 25 +
      ([wti, brent].some(
        (quote) => quote?.volatilityStatus === "HIGH_VOLATILITY",
      )
        ? 40
        : [wti, brent].some(
              (quote) => quote?.volatilityStatus === "ELEVATED",
            )
          ? 20
          : 0),
  );
  const hormuzScore = containsAny(combinedText, [
    "hormuz",
    "strait disruption",
    "strait closure",
  ])
    ? Math.max(60, priorityScore)
    : 15;
  const supplyScore = containsAny(combinedText, [
    "supply",
    "outage",
    "production cut",
    "pipeline",
    "shipping disruption",
    "red sea",
  ])
    ? Math.max(50, priorityScore)
    : 20;
  const overallScore = Math.round(
    Math.max(priorityScore, volatilityScore, hormuzScore * 0.85),
  );
  const riskLevel = levelFromScore(overallScore);
  const bullish = BULLISH_TERMS.filter((term) => combinedText.includes(term))
    .slice(0, 4)
    .map((term) => term.replace(/\b\w/g, (letter) => letter.toUpperCase()));
  const bearish = BEARISH_TERMS.filter((term) => combinedText.includes(term))
    .slice(0, 4)
    .map((term) => term.replace(/\b\w/g, (letter) => letter.toUpperCase()));
  const averageOilMove =
    ((wti?.percentageChange ?? 0) + (brent?.percentageChange ?? 0)) /
    ([wti, brent].filter(Boolean).length || 1);
  const bias =
    averageOilMove > 0.25 || bullish.length > bearish.length
      ? "BULLISH"
      : averageOilMove < -0.25 || bearish.length > bullish.length
        ? "BEARISH"
        : "NEUTRAL";
  const confidence = ai?.confidenceScore ?? Math.min(78, 45 + overallScore / 3);

  const metrics = [
    {
      label: "WTI Volatilität",
      value: levelFromScore(volatilityScore),
      detail: wti ? formatChange(wti.percentageChange, true) : "—",
    },
    {
      label: "Brent Momentum",
      value:
        (brent?.percentageChange ?? 0) > 0.2
          ? "BULLISH"
          : (brent?.percentageChange ?? 0) < -0.2
            ? "BEARISH"
            : "NEUTRAL",
      detail: brent ? formatChange(brent.percentageChange, true) : "—",
    },
    {
      label: "Hormuz-Risiko",
      value: levelFromScore(hormuzScore),
      detail: containsAny(combinedText, ["hormuz"])
        ? "Aktive Erwähnungen"
        : "Keine bestätigte Störung",
    },
    {
      label: "Angebotsrisiko",
      value: levelFromScore(supplyScore),
      detail: "News- und Ereignislage",
    },
  ];

  return (
    <div className="space-y-5">
      <header>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300">
          AI-powered Market & Geopolitical Intelligence
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-white">
          KI Intelligence Brief
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Zusammenhänge zwischen News, Ölpreisen, Volatilität und geopolitischen
          Risiken.
        </p>
      </header>

      <section className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/12 via-[#101c29] to-[#0c1722] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet-500/20 text-violet-200">
              <Brain className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                Oil Risk Level
              </p>
              <p className={cn("mt-1 inline-flex rounded-md px-2 py-1 font-mono text-sm font-black", levelTone(riskLevel))}>
                {riskLevel}
              </p>
            </div>
          </div>
          <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-[10px] uppercase text-slate-400">
            {ai?.mode === "LIVE" ? "Live-KI-Analyse" : "Systemeinschätzung"}
          </span>
        </div>
        <h3 className="mt-5 text-base font-semibold text-white">
          {latestAi?.headline ?? "Aktuelle Öl- und Risikolage"}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          {ai?.summary ??
            "Die Einschätzung wird aus aktuellen Ölbewegungen, priorisierten Nachrichten und geopolitischen Risikomerkmalen gebildet. Es liegt derzeit keine neue verifizierte Live-KI-Zusammenfassung vor."}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-xl border border-white/10 bg-[#101c29]/90 p-4"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {metric.label}
            </p>
            <p className="mt-2 font-mono text-sm font-bold text-white">
              {metric.value}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <FactorCard
          title="Bullish Factors"
          items={bullish}
          fallback="Keine dominanten bullishen Faktoren erkannt."
          positive
        />
        <FactorCard
          title="Bearish Factors"
          items={bearish}
          fallback="Keine dominanten bearishen Faktoren erkannt."
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#101c29]/90 p-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-cyan-300" aria-hidden="true" />
          <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
            AI Conclusion
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <ConclusionMetric label="Short-term Oil Bias" value={bias} />
          <ConclusionMetric
            label="Confidence"
            value={`${Math.round(confidence)} %`}
          />
          <ConclusionMetric
            label="Risk"
            value={riskLevel}
          />
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-black/20 p-3 text-xs text-slate-400">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            Keine Anlageberatung. Nicht bestätigte Ereignisse werden als Risiko,
            nicht als Tatsache behandelt.
          </p>
        </div>
      </section>
    </div>
  );
}

function FactorCard({
  title,
  items,
  fallback,
  positive = false,
}: {
  title: string;
  items: string[];
  fallback: string;
  positive?: boolean;
}) {
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <article
      className={cn(
        "rounded-2xl border p-4",
        positive
          ? "border-emerald-400/20 bg-emerald-500/[0.06]"
          : "border-red-400/20 bg-red-500/[0.06]",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            "h-4 w-4",
            positive ? "text-emerald-300" : "text-red-300",
          )}
          aria-hidden="true"
        />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <ul className="mt-3 space-y-2 text-xs text-slate-300">
        {items.length ? (
          items.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <Activity className="h-3 w-3 shrink-0 text-slate-500" aria-hidden="true" />
              {item}
            </li>
          ))
        ) : (
          <li className="text-slate-500">{fallback}</li>
        )}
      </ul>
    </article>
  );
}

function ConclusionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.04] p-3">
      <p className="text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-sm font-bold text-white">{value}</p>
    </div>
  );
}
