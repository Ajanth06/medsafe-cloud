"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, Check, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { HealthDocument } from "@/lib/types/health";

interface DocumentDetailViewProps {
  document: HealthDocument;
}

export function DocumentDetailView({ document }: DocumentDetailViewProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const isImage = document.mimeType?.startsWith("image/");
  const isPdf = document.mimeType === "application/pdf";
  const hasFile = Boolean(document.fileUrl);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{document.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {document.source} · {document.date}
        </p>
      </div>

      {hasFile && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2 className="font-semibold">Dein Dokument</h2>
            </div>

            {isImage && document.fileUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={document.fileUrl}
                alt={document.title}
                className="w-full rounded-2xl border border-border object-contain"
              />
            )}

            {document.fileUrl && (
              <Link href={document.fileUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" fullWidth>
                  <ExternalLink className="h-4 w-4" />
                  {isPdf ? "PDF öffnen" : "Datei öffnen"}
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 className="font-semibold">Zusammenfassung</h2>
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">
            {document.summary ||
              "Dein Dokument wurde gespeichert. Die KI-Analyse wird bald verfügbar sein."}
          </p>
        </CardContent>
      </Card>

      {document.keyPoints.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-4 font-semibold">Wichtige Punkte</h2>
            <ul className="space-y-3">
              {document.keyPoints.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-50">
                    <Check className="h-3 w-3 text-green-600" aria-hidden="true" />
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {document.originalPreview && (
        showOriginal ? (
          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted" aria-hidden="true" />
                <h2 className="font-semibold">Original</h2>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted">
                {document.originalPreview}
              </pre>
            </CardContent>
          </Card>
        ) : (
          <Button variant="outline" fullWidth onClick={() => setShowOriginal(true)}>
            Original anzeigen
          </Button>
        )
      )}
    </div>
  );
}
