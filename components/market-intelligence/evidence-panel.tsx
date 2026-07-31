"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useLabels, useMi } from "@/components/i18n/locale-provider";
import type { AIAnalysisResult } from "@/lib/types/market";

interface EvidencePanelProps {
  analysis: AIAnalysisResult;
}

export function EvidencePanel({ analysis }: EvidencePanelProps) {
  const t = useMi();
  const { tEvidenceCount } = useLabels();

  const marketEvidence = analysis.evidence.filter((e) => e.type === "MARKET");
  const newsEvidence = analysis.evidence.filter((e) => e.type === "NEWS");
  const officialEvidence = analysis.evidence.filter((e) => e.type === "OFFICIAL");

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">
          {tEvidenceCount(analysis.evidence.length)}
        </p>

        {marketEvidence.length > 0 && (
          <EvidenceGroup title={t.marketEvidence} items={marketEvidence} />
        )}
        {newsEvidence.length > 0 && (
          <EvidenceGroup title={t.newsEvidence} items={newsEvidence} />
        )}
        {officialEvidence.length > 0 && (
          <EvidenceGroup title={t.officialEvidence} items={officialEvidence} />
        )}

        {analysis.uncertaintyReasons.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase text-amber-700">{t.uncertainty}</p>
            <ul className="mt-1 text-xs text-muted">
              {analysis.uncertaintyReasons.map((u, i) => (
                <li key={i}>• {u}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EvidenceGroup({
  title,
  items,
}: {
  title: string;
  items: AIAnalysisResult["evidence"];
}) {
  return (
    <div>
      <p className="text-xs font-medium text-foreground">{title}</p>
      <ul className="mt-1 space-y-0.5">
        {items.map((e) => (
          <li key={e.id} className="font-mono text-xs text-muted">
            {e.label ?? e.id}
          </li>
        ))}
      </ul>
    </div>
  );
}
