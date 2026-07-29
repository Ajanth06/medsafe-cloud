import type { Metadata } from "next";
import { LogOut, Shield } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { AppHeader } from "@/components/app/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getUserOrRedirect } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Konto",
  description: "Dein AARYX-Konto.",
};

export default async function ProfilePage() {
  const { user, displayName } = await getUserOrRedirect();

  return (
    <>
      <AppHeader title="Konto" subtitle={user.email ?? ""} />

      <main className="mx-auto max-w-lg space-y-4 px-5 py-6">
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="text-lg font-semibold text-foreground">{displayName}</p>
            <p className="text-sm text-muted">{user.email}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
              <div>
                <p className="font-medium">Zugang geschützt</p>
                <p className="text-sm text-muted">
                  AARYX ist nur für freigeschaltete Konten. Keine Gesundheitsdaten.
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
