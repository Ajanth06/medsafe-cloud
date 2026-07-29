import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AIAnalysisResult } from "@/lib/types/market";
import { formatTime } from "@/lib/market-intelligence/format";

interface AIMarketAssessmentProps {
  analysis: AIAnalysisResult;
}

const pressureLabel: Record<string, string> = {
  STRONG_BULLISH_PRESSURE: "Strong Bullish Pressure",
  BULLISH_PRESSURE: "Bullish Pressure",
  NEUTRAL: "Neutral",
  BEARISH_PRESSURE: "Bearish Pressure",
  STRONG_BEARISH_PRESSURE: "Strong Bearish Pressure",
  UNCERTAIN: "Uncertain",
};

const regimeLabel = (regime: string) => regime.replace(/_/g, " ");

export function AIMarketAssessment({ analysis }: AIMarketAssessmentProps) {
  const isDemo = analysis.mode === "DEMO" || analysis.mode === "FALLBACK";

  return (
    <Card className="border-slate-800 bg-slate-900 text-slate-100">
      <CardContent className="space-y-4 p-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            AI Market Assessment
          </p>
          {isDemo && (
            <p className="mt-1 text-xs text-amber-400/90">
              {analysis.mode === "DEMO" ? "AI DEMO MODE" : "Deterministic fallback — AI unavailable"}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            v{analysis.version} · {analysis.model} · {formatTime(analysis.generatedAt)} CET
          </p>
        </div>

        <div>
          <p className="text-sm font-medium text-white">{analysis.summary}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Market Regime</p>
            <p className="mt-0.5 font-mono text-xs font-semibold text-white">
              {regimeLabel(analysis.marketRegime)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Confidence</p>
            <p className="mt-0.5 font-mono text-xs font-semibold text-white">
              {analysis.confidence} — {analysis.confidenceScore}/100
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Reaction Phase</p>
            <p className="mt-0.5 font-mono text-xs text-slate-300">
              {analysis.reactionPhase.replace(/_/g, " ")}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Significance</p>
            <p className="mt-0.5 font-mono text-xs text-slate-300">{analysis.eventSignificance}</p>
          </div>
        </div>

        {analysis.affectedAssets.length > 0 && (
          <div className="space-y-1.5">
            {analysis.affectedAssets.map((item) => (
              <div
                key={item.asset}
                className="flex items-center justify-between rounded-lg bg-slate-800/60 px-3 py-2"
              >
                <span className="text-sm text-slate-300">{item.asset}</span>
                <span className="font-mono text-xs font-semibold text-emerald-400">
                  {pressureLabel[item.pressure] ?? item.pressure}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3 border-t border-slate-700 pt-3 text-sm">
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Observed Facts
            </p>
            <ul className="mt-1 space-y-1">
              {analysis.facts.slice(0, 5).map((f) => (
                <li key={f.id} className="text-xs leading-relaxed text-slate-300">
                  {f.statement}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              AI Interpretation
            </p>
            <ul className="mt-1 space-y-1">
              {analysis.interpretations.map((line, i) => (
                <li key={i} className="text-xs italic leading-relaxed text-slate-400">
                  {line}
                </li>
              ))}
            </ul>
          </section>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Possible Cause</p>
            <p className="mt-0.5 leading-relaxed text-slate-300">
              {analysis.possibleCause.description}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Causality: {analysis.possibleCause.causalityStatus.replace(/_/g, " ")}
            </p>
          </div>

          {analysis.alternativeExplanations.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Alternative Explanations
              </p>
              <ul className="mt-0.5 list-inside list-disc text-xs text-slate-400">
                {analysis.alternativeExplanations.map((alt, i) => (
                  <li key={i}>{alt}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.marketAlreadyMoved && (
            <div className={cn("rounded-lg bg-amber-900/30 px-3 py-2 text-xs text-amber-200")}>
              Market Already Moved: {analysis.moveAssessment}
            </div>
          )}

          {analysis.whatToWatchNext.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">What to Watch</p>
              <ul className="mt-1 space-y-1">
                {analysis.whatToWatchNext.map((item, i) => (
                  <li key={i} className="text-xs text-slate-300">
                    • {item.description}
                    {item.relatedAsset && (
                      <span className="ml-1 font-mono text-slate-500">({item.relatedAsset})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.whyThisAlert && analysis.whyThisAlert.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Why This Alert</p>
              <ol className="mt-1 list-inside list-decimal text-xs text-slate-300">
                {analysis.whyThisAlert.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
