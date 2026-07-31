"use client";

import { useMemo } from "react";
import {
  Activity,
  Brain,
  Flame,
  Gauge,
  Link2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { formatChange } from "@/lib/market-intelligence/format";
import { tConfidence, tRegime } from "@/lib/market-intelligence/i18n/de";
import { cn } from "@/lib/utils";
import type {
  EnrichedMarketQuote,
  IntelligenceEventCluster,
  OilCorrelationResult,
} from "@/lib/types/market";

interface KiIntelligencePanelProps {
  wti?: EnrichedMarketQuote;
  brent?: EnrichedMarketQuote;
  oilCorrelation: OilCorrelationResult | null;
  intelligenceEvents: IntelligenceEventCluster[];
}

type KiCard = {
  id: string;
  tone: "hot" | "up" | "down" | "neutral" | "ai";
  badge: string;
  title: string;
  body: string;
  meta?: string;
};

function toneClasses(tone: KiCard["tone"]) {
  switch (tone) {
    case "hot":
      return "border-orange-400/30 bg-orange-500/10";
    case "up":
      return "border-emerald-400/25 bg-emerald-500/10";
    case "down":
      return "border-red-400/25 bg-red-500/10";
    case "ai":
      return "border-violet-400/25 bg-violet-500/10";
    default:
      return "border-white/10 bg-white/[0.04]";
  }
}

function ToneIcon({ tone }: { tone: KiCard["tone"] }) {
  const cls = "h-4 w-4 shrink-0";
  switch (tone) {
    case "hot":
      return <Flame className={cn(cls, "text-orange-300")} aria-hidden />;
    case "up":
      return <TrendingUp className={cn(cls, "text-emerald-300")} aria-hidden />;
    case "down":
      return <TrendingDown className={cn(cls, "text-red-300")} aria-hidden />;
    case "ai":
      return <Brain className={cn(cls, "text-violet-300")} aria-hidden />;
    default:
      return <Activity className={cn(cls, "text-cyan-300")} aria-hidden />;
  }
}

/**
 * KI Intelligence — structured signal cards (like Alerts): volatility, correlation, AI.
 */
export function KiIntelligencePanel({
  wti,
  brent,
  oilCorrelation,
  intelligenceEvents,
}: KiIntelligencePanelProps) {
  const cards = useMemo(() => {
    const out: KiCard[] = [];
    const oils = [wti, brent].filter(
      (q): q is EnrichedMarketQuote => Boolean(q && q.price > 0),
    );

    for (const q of oils) {
      const abs = Math.abs(q.percentageChange);
      const hot =
        q.volatilityStatus === "HIGH_VOLATILITY" ||
        q.volatilityStatus === "ELEVATED" ||
        abs >= 0.8;
      if (hot) {
        out.push({
          id: `vol-${q.symbol}`,
          tone: "hot",
          badge: "HOT · Volatilität",
          title: `${q.symbol}: erhöhte Bewegung`,
          body: `${formatChange(q.percentageChange, true)} am Tag · Status ${q.volatilityStatus.replace(/_/g, " ")}.`,
          meta: `5M ${formatChange(q.returns.m5 ?? 0, true)} · 15M ${formatChange(q.returns.m15 ?? 0, true)}`,
        });
      } else if (abs >= 0.35) {
        out.push({
          id: `move-${q.symbol}`,
          tone: q.percentageChange >= 0 ? "up" : "down",
          badge: q.percentageChange >= 0 ? "Aufwärts" : "Abwärts",
          title: `${q.symbol} ${formatChange(q.percentageChange, true)}`,
          body: "Moderate Tagesbewegung — weiter beobachten.",
          meta: `1H ${formatChange(q.returns.m60 ?? 0, true)}`,
        });
      }
    }

    if (oilCorrelation?.bothConfirmed) {
      out.push({
        id: "corr-oil",
        tone: "hot",
        badge: "Korrelation",
        title: "WTI + Brent bestätigt",
        body: oilCorrelation.description,
        meta: "Ölmärkte bewegen sich gemeinsam",
      });
    } else if (oilCorrelation && !oilCorrelation.bothConfirmed) {
      out.push({
        id: "corr-indep",
        tone: "neutral",
        badge: "Korrelation",
        title: "Unabhängige Öl-Bewegung",
        body: oilCorrelation.description,
      });
    }

    const aiCluster = intelligenceEvents.find((c) => {
      if (c.priority !== "HIGH" && c.priority !== "CRITICAL") return false;
      const ai = c.aiAnalysisResult;
      return Boolean(ai && ai.mode === "LIVE");
    });
    if (aiCluster?.aiAnalysisResult) {
      const ai = aiCluster.aiAnalysisResult;
      out.push({
        id: `ai-${aiCluster.id}`,
        tone: "ai",
        badge: "KI · Einschätzung",
        title: aiCluster.headline,
        body: ai.summary.slice(0, 220),
        meta: `${tRegime(String(ai.marketRegime).replace(/-/g, "_"))} · ${tConfidence(ai.confidence)}`,
      });
    }

    if (out.length === 0) {
      out.push({
        id: "calm",
        tone: "neutral",
        badge: "Lage",
        title: "Kein HOT-Signal",
        body: "WTI/Brent ohne erhöhte Volatilität. KI-Hinweise erscheinen bei starken Moves oder Live-Analyse.",
      });
    }

    return out;
  }, [wti, brent, oilCorrelation, intelligenceEvents]);

  return (
    <section aria-labelledby="ki-intelligence-heading" className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/20 text-violet-200">
          <Brain className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h2
            id="ki-intelligence-heading"
            className="text-sm font-semibold uppercase tracking-wider text-slate-200"
          >
            KI Intelligence
          </h2>
          <p className="text-[11px] text-slate-500">
            HOT · Volatilität · Korrelation · Einschätzung
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {cards.map((card) => (
          <article
            key={card.id}
            className={cn(
              "rounded-xl border p-3.5 transition",
              toneClasses(card.tone),
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <ToneIcon tone={card.tone} />
              <span className="rounded-md bg-black/20 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-200">
                {card.badge}
              </span>
              {card.tone === "hot" && (
                <Gauge className="h-3.5 w-3.5 text-orange-300" aria-hidden />
              )}
              {card.id.startsWith("corr") && (
                <Link2 className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
              )}
            </div>
            <h3 className="mt-2 text-sm font-semibold text-white">{card.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              {card.body}
            </p>
            {card.meta && (
              <p className="mt-2 font-mono text-[10px] text-slate-500">
                {card.meta}
              </p>
            )}
          </article>
        ))}
      </div>
      <p className="text-[10px] text-slate-500">
        Keine Anlageberatung — strukturierte Signale für den Öl-Terminal.
      </p>
    </section>
  );
}
