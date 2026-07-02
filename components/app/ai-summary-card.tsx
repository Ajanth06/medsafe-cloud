import { Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

interface AiSummaryCardProps {
  title?: string;
  text: string;
  showDetailsLink?: boolean;
}

export function AiSummaryCard({
  title = "KI-Zusammenfassung",
  text,
  showDetailsLink = true,
}: AiSummaryCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
            <Bot className="h-4 w-4 text-primary" aria-hidden="true" />
          </span>
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>

        <blockquote className="whitespace-pre-line border-l-2 border-primary/30 pl-4 text-sm leading-relaxed text-foreground/90">
          &ldquo;{text}&rdquo;
        </blockquote>

        {showDetailsLink && (
          <div className="mt-4">
            <Link href="/ai">
              <Button variant="outline" size="sm">
                <Sparkles className="h-4 w-4" />
                Details anzeigen
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
