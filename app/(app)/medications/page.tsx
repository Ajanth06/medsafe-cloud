import type { Metadata } from "next";
import { AppHeader } from "@/components/app/app-header";
import { EmptyState } from "@/components/app/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { getUserOrRedirect } from "@/lib/auth";
import { getUserMedications } from "@/lib/data/health";

export const metadata: Metadata = {
  title: "Medikamente",
  description: "Deine Medikamente und Therapien.",
};

export default async function MedicationsPage() {
  await getUserOrRedirect();
  const medications = await getUserMedications();

  return (
    <>
      <AppHeader
        title="Medikamente"
        subtitle={`${medications.length} aktiv · nur dein Konto`}
      />

      <main className="mx-auto max-w-lg space-y-4 px-5 py-6">
        {medications.length > 0 ? (
          medications.map((med) => (
            <Card key={med.id}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <span className="text-2xl" aria-hidden="true">
                    💊
                  </span>
                  <div>
                    <h2 className="font-semibold">{med.name}</h2>
                    {med.schedule && (
                      <p className="mt-1 text-sm text-primary">{med.schedule}</p>
                    )}
                    {med.note && <p className="mt-2 text-sm text-muted">{med.note}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <EmptyState
            icon="💊"
            title="Noch keine Medikamente"
            description="Sobald die KI Medikamente aus deinen Dokumenten erkennt, erscheinen sie hier — nur in deinem Account."
          />
        )}
      </main>
    </>
  );
}
