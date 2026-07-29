import { Card, CardContent } from "@/components/ui/card";
import { miDe, tConfidence, tPressure, tRegime } from "@/lib/market-intelligence/i18n/de";
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
  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardContent className="space-y-4 p-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {miDe.aiAssessment}
          </p>
          <p className="mt-1 text-xs text-amber-400/80">
            {miDe.demoDisclaimer}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              {miDe.marketRegime}
            </p>
            <p className="mt-0.5 font-mono font-semibold text-white">
              {tRegime(analysis.marketRegime.replace(/-/g, "_"))}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              {miDe.confidence}
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
              className="flex items-center justify-between rounded-lg bg-slate-800/60 px-3 py-2"
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
              {miDe.potentialCauseLabel}
            </p>
            <p className="mt-0.5 leading-relaxed text-slate-300">
              {analysis.potentialCause}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              {miDe.keyRisk}
            </p>
            <p className="mt-0.5 leading-relaxed text-slate-300">{analysis.keyRisk}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
