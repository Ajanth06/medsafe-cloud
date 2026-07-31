"use client";

import { useMemo } from "react";
import { Brain } from "lucide-react";
import { useLabels, useMi } from "@/components/i18n/locale-provider";
import type { IntelligenceEventCluster } from "@/lib/types/market";

interface AiShortAssessmentProps {
  intelligenceEvents: IntelligenceEventCluster[];
}

function isWeakAiText(text: string): boolean {
  return /nicht bestätigt|möglicher zusammenhang mit:|weitere bestätigung kann|demo|not confirmed|possible link/i.test(
    text,
  );
}

/**
 * Compact AI blurb — only when a real live analysis exists.
 * Hides deterministic/demo filler that just repeats the headline.
 */
export function AiShortAssessment({
  intelligenceEvents,
}: AiShortAssessmentProps) {
  const t = useMi();
  const { tRegime, tConfidence } = useLabels();

  const top = useMemo(() => {
    return intelligenceEvents.find((c) => {
      if (c.priority !== "HIGH" && c.priority !== "CRITICAL") return false;
      const ai = c.aiAnalysisResult;
      if (!ai || ai.mode !== "LIVE") return false;
      if (isWeakAiText(ai.summary) || ai.summary === c.headline) return false;
      return true;
    });
  }, [intelligenceEvents]);

  if (!top?.aiAnalysisResult) return null;

  const ai = top.aiAnalysisResult;
  const summary = ai.summary.slice(0, 240);
  const cause =
    ai.possibleCause?.description && !isWeakAiText(ai.possibleCause.description)
      ? ai.possibleCause.description
      : null;
  const risk =
    ai.keyRisks?.[0] && !isWeakAiText(ai.keyRisks[0]) ? ai.keyRisks[0] : null;
  const watch = ai.whatToWatchNext?.[0]?.description ?? null;

  return (
    <section
      className="rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-500/10 via-[#121c2a] to-[#101820] p-3.5 md:p-4"
      aria-label={t.aiAssessmentAria}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-md bg-violet-500/25 px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider text-violet-100">
          <Brain className="h-3 w-3" aria-hidden="true" />
          {t.aiThreeLines}
        </span>
        <span className="font-mono text-[10px] uppercase text-slate-400">
          {tRegime(String(ai.marketRegime).replace(/-/g, "_"))}
        </span>
        <span className="font-mono text-[10px] uppercase text-slate-400">
          {tConfidence(ai.confidence)}
        </span>
      </div>

      <p className="mt-2 text-sm font-semibold text-white">{top.headline}</p>
      <ol className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-300">
        <li>
          <span className="font-semibold text-slate-200">{t.aiSituation} </span>
          {summary}
        </li>
        {cause && (
          <li>
            <span className="font-semibold text-slate-200">{t.aiCause} </span>
            {cause}
          </li>
        )}
        {(risk || watch) && (
          <li>
            <span className="font-semibold text-slate-200">{t.aiRiskWatch} </span>
            {risk ?? watch}
          </li>
        )}
      </ol>
      <p className="mt-2 text-[10px] text-slate-500">
        {t.aiShortDisclaimer}
      </p>
    </section>
  );
}
