import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, LogOut, Shield } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { AppHeader } from "@/components/app/app-header";
import { HealthCard } from "@/components/app/health-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireOnboardingComplete } from "@/lib/auth";
import { getUserHealthStats } from "@/lib/data/health";

export const metadata: Metadata = {
  title: "Profil",
  description: "Dein MedSafe Cloud Profil.",
};

export default async function ProfilePage() {
  const { user, displayName } = await requireOnboardingComplete();
  const stats = await getUserHealthStats();

  return (
    <>
      <AppHeader title="Profil" subtitle={user.email ?? ""} />

      <main className="mx-auto max-w-lg space-y-4 px-5 py-6">
        <HealthCard name={displayName} stats={stats} />

        <Link href="/timeline">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                <CalendarClock className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold">Timeline</p>
                <p className="text-sm text-muted">Nur deine chronologische Historie</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
              <div>
                <p className="font-medium">Deine Daten sind geschützt</p>
                <p className="text-sm text-muted">
                  Jeder Account ist isoliert. Du siehst nur deine eigenen Dokumente
                  und Zusammenfassungen.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form action={signOut}>
          <Button type="submit" variant="outline" fullWidth>
            <LogOut className="h-4 w-4" />
            Abmelden
          </Button>
        </form>
      </main>
    </>
  );
}
