import Link from "next/link";
import { CalendarDays, FileText, Lock, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getGreeting } from "@/lib/demo-data";

interface WelcomeDashboardProps {
  displayName: string;
}

const actionCards = [
  {
    emoji: "📄",
    icon: FileText,
    title: "Dokument hochladen",
    description: "Arztbrief, Befund oder Laborwert hinzufügen.",
    href: "/documents",
  },
  {
    emoji: "🤖",
    icon: Sparkles,
    title: "KI-Zusammenfassung",
    description: "Erhalte eine einfache Erklärung deiner medizinischen Dokumente.",
    href: "/ai",
  },
  {
    emoji: "📅",
    icon: CalendarDays,
    title: "Timeline aufbauen",
    description:
      "Medikamente, Arztbesuche und Therapien automatisch chronologisch ordnen.",
    href: "/timeline",
  },
] as const;

export function WelcomeDashboard({ displayName }: WelcomeDashboardProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
        <p className="text-sm text-muted">{getGreeting()},</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
          {displayName}!
        </h1>
        <p className="mt-4 text-base font-medium text-foreground">
          Willkommen bei MedSafe Cloud.
        </p>
        <p className="mt-1 text-base font-medium text-foreground">Schön, dass du da bist.</p>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Deine digitale Gesundheitszentrale ist im Moment noch leer, aber bereit, von
          dir gefüllt zu werden.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Lade deinen ersten Arztbrief, Befund oder Laborwert hoch. Die KI erstellt
          daraus eine verständliche Zusammenfassung und beginnt automatisch, deine
          medizinische Timeline aufzubauen.
        </p>
      </section>

      <div className="space-y-3">
        {actionCards.map(({ emoji, icon: Icon, title, description, href }) => (
          <Link key={title} href={href}>
            <Card className="transition-shadow hover:shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
              <CardContent className="flex gap-4 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl">
                  <span aria-hidden="true">{emoji}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                    <h3 className="font-semibold text-foreground">{title}</h3>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-dashed border-border bg-card/60 p-5">
        <div className="flex items-start gap-3">
          <span className="text-lg" aria-hidden="true">
            🔒
          </span>
          <div>
            <p className="font-semibold text-foreground">Deine Daten bleiben privat.</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Nur du hast Zugriff auf deine Gesundheitsdaten.
            </p>
          </div>
          <Lock className="ml-auto h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        </div>
      </section>
    </div>
  );
}
