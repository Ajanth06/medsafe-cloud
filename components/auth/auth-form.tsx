"use client";

import Link from "next/link";
import { Lock, Shield } from "lucide-react";
import { signInWithEmail } from "@/app/auth/actions";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { RememberMeCheckbox } from "@/components/auth/remember-me-checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readRememberMeFromCheckbox, setRememberMe } from "@/lib/session-policy";
import { cn } from "@/lib/utils";

function MedSafeLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-sm">
        <Shield className="h-5 w-5 text-white" aria-hidden="true" />
      </div>
      <span className="text-lg font-semibold tracking-tight text-foreground">
        MedSafe Cloud
      </span>
    </div>
  );
}

interface AuthFormProps {
  error?: string;
  message?: string;
}

export function AuthForm({ error, message }: AuthFormProps) {
  return (
    <div
      suppressHydrationWarning
      className="w-full max-w-[440px] lg:max-w-[480px]"
    >
      <MedSafeLogo className="mb-8 lg:hidden" />

      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
          Schön, dass du da bist
        </h1>
        <p className="text-sm text-muted lg:text-base">
          Melde dich an und greife sicher auf deine Gesundheitsdaten zu.
        </p>
      </div>

      <div className="space-y-5">
        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/50 dark:text-green-300"
          >
            {message}
          </p>
        )}

        <form
          action={signInWithEmail}
          className="space-y-4"
          noValidate
          onSubmit={() => {
            setRememberMe(readRememberMeFromCheckbox());
          }}
        >
          <Input
            id="email"
            label="E-Mail"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="du@beispiel.de"
            required
            className="h-12"
          />

          <Input
            id="password"
            label="Passwort"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Dein Passwort"
            required
            className="h-12"
          />

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="rounded text-sm font-medium text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              Passwort vergessen?
            </Link>
          </div>

          <Button type="submit" fullWidth size="lg" className="h-12 text-base lg:h-14">
            Anmelden
          </Button>
        </form>

        <div className="relative flex items-center py-1">
          <div className="grow border-t border-border" />
          <span className="mx-4 shrink-0 text-xs font-medium uppercase tracking-wider text-muted">
            oder
          </span>
          <div className="grow border-t border-border" />
        </div>

        <OAuthButtons />

        <RememberMeCheckbox />
      </div>

      <div className="mt-8 space-y-5">
        <p className="text-center text-sm text-muted">
          Noch kein Konto?{" "}
          <Link
            href="/signup"
            className="rounded font-medium text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            Registrieren
          </Link>
        </p>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Ohne &quot;Angemeldet bleiben&quot; wirst du nach 15 Minuten Inaktivität abgemeldet.
        </p>
      </div>
    </div>
  );
}
