import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, ChevronRight } from "lucide-react";
import { AiSummaryCard } from "@/components/app/ai-summary-card";
import { AppHeader } from "@/components/app/app-header";
import { EmptyState } from "@/components/app/empty-state";
import { HealthCard } from "@/components/app/health-card";
import { TodaySummary } from "@/components/app/today-summary";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getUserOrRedirect } from "@/lib/auth";
import { getUserDashboardData } from "@/lib/data/health";
import { emptyAiSummary, getGreeting } from "@/lib/demo-data";

export const metadata: Metadata = {
  title: "Home",
  description: "Dein persönliches Gesundheits-Dashboard.",
};

export default async function DashboardPage() {
  const { displayName } = await getUserOrRedirect();
  const { stats, todayItems, aiSummary } = await getUserDashboardData();

  return (
    <>
      <AppHeader />

      <main className="mx-auto max-w-lg space-y-6 px-5 py-6">
        <section>
          <p className="text-sm text-muted">{getGreeting()},</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            {displayName}
          </h1>
        </section>

        <HealthCard name={displayName} stats={stats} />

        {todayItems.length > 0 ? (
          <TodaySummary items={todayItems} />
        ) : (
          <EmptyState
            icon="📋"
            title="Noch nichts für heute"
            description="Sobald du Dokumente oder Medikamente hinzufügst, erscheinen hier deine persönlichen Hinweise."
            action={
              <Link href="/documents">
                <Button size="sm">Dokument hochladen</Button>
              </Link>
            }
          />
        )}

        <AiSummaryCard
          text={aiSummary ?? emptyAiSummary}
          showDetailsLink={Boolean(aiSummary)}
        />

        <Link href="/timeline">
          <Card className="transition-shadow hover:shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
            <CardContent className="flex items-center gap-4 p-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                <CalendarClock className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Medizinische Timeline</p>
                <p className="text-sm text-muted">
                  Alle Ereignisse chronologisch — nur deine Daten
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />
            </CardContent>
          </Card>
        </Link>

        <section className="rounded-2xl border border-dashed border-border bg-card/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Deine Daten bleiben privat
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Jeder Account sieht nur seine eigenen Dokumente, Medikamente und
            KI-Zusammenfassungen. Niemand sonst hat Zugriff.
          </p>
        </section>
      </main>
    </>
  );
}
