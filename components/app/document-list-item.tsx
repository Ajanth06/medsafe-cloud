import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { HealthDocument } from "@/lib/types/health";

interface DocumentListItemProps {
  document: HealthDocument;
}

export function DocumentListItem({ document }: DocumentListItemProps) {
  return (
    <Link href={`/documents/${document.id}`}>
      <Card className="transition-shadow hover:shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg">
            📄
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">{document.title}</p>
            <p className="text-sm text-muted">{document.source}</p>
            <p className="text-xs text-muted">{document.date}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {document.analyzed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                KI analysiert
              </span>
            )}
            <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
