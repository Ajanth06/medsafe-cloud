import type { Metadata } from "next";
import { Lock, Shield } from "lucide-react";
import { completeOnboarding } from "@/app/onboarding/actions";
import { SessionTimeoutGuard } from "@/components/app/session-timeout-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireOnboardingPending } from "@/lib/auth";
import { splitFullName } from "@/lib/profile";

export const metadata: Metadata = {
  title: "Profil einrichten",
  description: "Richte dein persönliches MedSafe Cloud Profil ein.",
};

interface OnboardingPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const { profile } = await requireOnboardingPending();
  const { error } = await searchParams;

  const prefilled = splitFullName(profile.fullName);
  const firstName = profile.firstName ?? prefilled.firstName;
  const lastName = profile.lastName ?? prefilled.lastName;

  return (
    <div className="min-h-dvh bg-background">
      <SessionTimeoutGuard />
      <main className="mx-auto max-w-lg px-6 py-10">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-sm">
            <Shield className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <span className="text-lg font-semibold tracking-tight">MedSafe Cloud</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Dein persönliches Profil</h1>
          <p className="text-sm leading-relaxed text-muted">
            Bevor es losgeht, hinterlege deine privaten Daten. Sie werden nur in deinem
            Account gespeichert und sind für niemanden sonst sichtbar.
          </p>
        </div>

        <form action={completeOnboarding} className="mt-8 space-y-4">
          {error && (
            <p
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="first_name"
              name="first_name"
              label="Vorname"
              defaultValue={firstName}
              placeholder="z. B. Ajanth"
              required
              autoComplete="given-name"
            />

            <Input
              id="last_name"
              name="last_name"
              label="Nachname"
              defaultValue={lastName}
              placeholder="z. B. Ragunathan"
              required
              autoComplete="family-name"
            />
          </div>

          <Input
            id="date_of_birth"
            name="date_of_birth"
            label="Geburtsdatum"
            type="date"
            defaultValue={profile.dateOfBirth ?? ""}
            required
          />

          <Select
            id="gender"
            name="gender"
            label="Geschlecht (optional)"
            defaultValue={profile.gender ?? ""}
          >
            <option value="">Keine Angabe</option>
            <option value="weiblich">Weiblich</option>
            <option value="männlich">Männlich</option>
            <option value="divers">Divers</option>
          </Select>

          <Input
            id="primary_diagnosis"
            name="primary_diagnosis"
            label="Hauptdiagnose (optional)"
            defaultValue={profile.primaryDiagnosis ?? ""}
            placeholder="z. B. Multiple Sklerose"
          />

          <Input
            id="treating_clinic"
            name="treating_clinic"
            label="Behandelnde Klinik (optional)"
            defaultValue={profile.treatingClinic ?? ""}
            placeholder="z. B. Charité Berlin"
          />

          <Input
            id="emergency_contact"
            name="emergency_contact"
            label="Notfallkontakt (optional)"
            defaultValue={profile.emergencyContact ?? ""}
            placeholder="Name & Telefonnummer"
          />

          <Select
            id="language"
            name="language"
            label="Sprache"
            defaultValue={profile.language ?? "de"}
            required
          >
            <option value="de">Deutsch</option>
            <option value="en">English</option>
          </Select>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card px-4 py-4">
            <input
              type="checkbox"
              name="privacy_accepted"
              required
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-sm leading-relaxed text-muted">
              Ich habe verstanden, dass meine Gesundheitsdaten verschlüsselt gespeichert
              werden und nur ich Zugriff auf mein Konto habe.
            </span>
          </label>

          <Button type="submit" fullWidth size="lg">
            Profil speichern & weiter
          </Button>
        </form>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Deine Daten bleiben privat und gehören nur dir.
        </p>
      </main>
    </div>
  );
}
