"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { signInWithEmail } from "@/app/auth/actions";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { RememberMeCheckbox } from "@/components/auth/remember-me-checkbox";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { readRememberMeFromCheckbox, setRememberMe } from "@/lib/session-policy";
import { cn } from "@/lib/utils";

function AaryxLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex h-11 w-11 rotate-[-3deg] items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-[#d24b2f] shadow-[0_10px_24px_rgba(210,75,47,0.25)] transition-transform hover:rotate-3">
        <span className="font-mono text-[10px] font-black tracking-wider text-white">
          AX
        </span>
      </div>
      <span className="font-mono text-lg font-semibold tracking-[0.2em] text-foreground">
        AARYX
      </span>
    </div>
  );
}

interface AuthFormProps {
  error?: string;
  message?: string;
  signupEnabled?: boolean;
  oauthLoginEnabled?: boolean;
}

export function AuthForm({
  error,
  message,
  signupEnabled = false,
  oauthLoginEnabled = true,
}: AuthFormProps) {
  return (
    <Card
      suppressHydrationWarning
      className="w-full max-w-[420px] rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_24px_80px_rgba(23,23,23,0.13)] backdrop-blur-xl"
    >
      <CardHeader className="space-y-4 p-5 pb-0 lg:p-7 lg:pb-0">
        <AaryxLogo />
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold leading-[1.08] tracking-[-0.04em] text-[#171717] lg:text-[1.75rem]">
            Willkommen zurück<span className="text-[#d24b2f]">.</span>
          </h1>
          <p className="text-sm font-medium leading-relaxed text-[#3f3a32]/70">
            Dein Markt schläft nie. Dein Terminal wartet schon.
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-3.5 p-5 pt-4 lg:p-7 lg:pt-5">
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
          className="space-y-3.5"
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
            className="h-12 border-[#171717]/10 bg-[#fefaf1]/80 focus-visible:border-[#d24b2f]/50 focus-visible:ring-[#d24b2f]/15"
            required
          />

          <Input
            id="password"
            label="Passwort"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Dein Passwort"
            className="h-12 border-[#171717]/10 bg-[#fefaf1]/80 focus-visible:border-cyan-600/50 focus-visible:ring-cyan-500/15"
            required
          />

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="rounded text-sm font-semibold text-[#d24b2f] hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
            >
              Passwort vergessen?
            </Link>
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            className="h-12 rounded-2xl bg-gradient-to-r from-[#d24b2f] via-orange-500 to-orange-400 text-base font-bold shadow-[0_12px_28px_rgba(210,75,47,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(210,75,47,0.3)] lg:h-[3.25rem]"
          >
            Terminal öffnen
          </Button>
        </form>

        {oauthLoginEnabled && (
          <>
            <div className="relative flex items-center py-1">
              <div className="grow border-t border-border" />
              <span className="mx-4 shrink-0 text-xs font-medium uppercase tracking-wider text-muted">
                oder
              </span>
              <div className="grow border-t border-border" />
            </div>

            <OAuthButtons />
          </>
        )}

        <RememberMeCheckbox />
      </CardContent>

      <CardFooter className="flex-col gap-2.5 p-5 pb-5 pt-1 lg:gap-3 lg:p-7 lg:pb-6 lg:pt-1">
        {signupEnabled && (
          <p className="text-center text-sm text-muted">
            Noch kein Konto?{" "}
            <Link
              href="/signup"
              className="rounded font-medium text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              Registrieren
            </Link>
          </p>
        )}

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Ohne &quot;Angemeldet bleiben&quot; wirst du nach 15 Minuten Inaktivität abgemeldet.
        </p>
      </CardFooter>
    </Card>
  );
}
