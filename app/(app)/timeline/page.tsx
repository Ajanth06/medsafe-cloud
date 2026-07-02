import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EmptyState } from "@/components/app/empty-state";
import { TimelineView } from "@/components/app/timeline-view";
import { requireOnboardingComplete } from "@/lib/auth";
import { getUserTimelineEvents } from "@/lib/data/health";

export const metadata: Metadata = {
  title: "Timeline",
  description: "Deine medizinische Geschichte chronologisch.",
};

export default async function TimelinePage() {
  await requireOnboardingComplete();
  const timelineEvents = await getUserTimelineEvents();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-5 py-4">
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card"
            aria-label="Zurück zur Startseite"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-base font-semibold">Timeline</h1>
            <p className="text-xs text-muted">Nur deine Ereignisse</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 py-6">
        {timelineEvents.length > 0 ? (
          <TimelineView events={timelineEvents} />
        ) : (
          <EmptyState
            icon="🕒"
            title="Timeline ist noch leer"
            description="Wenn du Dokumente hochlädst, sortiert MedSafe Cloud deine medizinischen Ereignisse automatisch chronologisch ein."
          />
        )}
      </main>
    </>
  );
}
