"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useLabels, useMi } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";
import type { AIAnalysis } from "@/lib/types/market";

interface AIAssessmentProps {
  analysis: AIAnalysis;
}

const sentimentColor: Record<string, string> = {
  BULLISH: "text-emerald-600",
  BEARISH: "text-red-600",
  NEUTRAL: "text-slate-600",
  WATCH: "text-amber-600",
};

export function AIAssessment({ analysis }: AIAssessmentProps) {
  const t = useMi();
  const { tRegime, tPressure, tConfidence } = useLabels();

  return (
    <Card className="border-white/10 bg-[#101c29]/90 text-slate-100">
      <CardContent className="space-y-4 p-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {t.aiAssessment}
          </p>
          <p className="mt-1 text-xs text-amber-400/80">
            {t.demoDisclaimer}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              {t.marketRegime}
            </p>
            <p className="mt-0.5 font-mono font-semibold text-white">
              {tRegime(analysis.marketRegime.replace(/-/g, "_"))}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              {t.confidence}
            </p>
            <p className="mt-0.5 font-mono font-semibold text-white">
              {tConfidence(analysis.confidence)}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          {analysis.assessments.map((item) => (
            <div
              key={item.asset}
              className="flex items-center justify-between rounded-lg bg-white/[0.06] px-3 py-2"
            >
              <span className="text-sm text-slate-300">{item.asset}</span>
              <span
                className={cn(
                  "font-mono text-xs font-semibold",
                  sentimentColor[item.sentiment] ?? "text-slate-400",
                )}
              >
                {tPressure(item.sentiment)}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t border-slate-700 pt-3 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              {t.potentialCauseLabel}
            </p>
            <p className="mt-0.5 leading-relaxed text-slate-300">
              {analysis.potentialCause}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              {t.keyRisk}
            </p>
            <p className="mt-0.5 leading-relaxed text-slate-300">{analysis.keyRisk}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
