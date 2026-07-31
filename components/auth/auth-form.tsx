"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { signInWithEmail } from "@/app/auth/actions";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { RememberMeCheckbox } from "@/components/auth/remember-me-checkbox";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLocale } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readRememberMeFromCheckbox, setRememberMe } from "@/lib/session-policy";
import type { AppLocale } from "@/lib/i18n/locales";

interface AuthFormProps {
  error?: string;
  message?: string;
  signupEnabled?: boolean;
  oauthLoginEnabled?: boolean;
}

const AUTH_COPY: Record<
  AppLocale,
  {
    terminal: string;
    signIn: string;
    access: string;
    email: string;
    password: string;
    forgot: string;
    open: string;
    or: string;
    noAccount: string;
    register: string;
    sessionNote: string;
  }
> = {
  de: {
    terminal: "Terminal",
    signIn: "Anmelden",
    access: "Zugang für autorisierte Nutzer.",
    email: "E-Mail",
    password: "Passwort",
    forgot: "Passwort vergessen?",
    open: "Terminal öffnen",
    or: "oder",
    noAccount: "Noch kein Konto?",
    register: "Registrieren",
    sessionNote:
      "Ohne „Angemeldet bleiben“ Abmeldung nach 15 Min. Inaktivität.",
  },
  en: {
    terminal: "Terminal",
    signIn: "Sign in",
    access: "Access for authorized users.",
    email: "Email",
    password: "Password",
    forgot: "Forgot password?",
    open: "Open terminal",
    or: "or",
    noAccount: "No account yet?",
    register: "Sign up",
    sessionNote:
      "Without “Stay signed in”, you are signed out after 15 min of inactivity.",
  },
  ta: {
    terminal: "டெர்மினல்",
    signIn: "உள்நுழைக",
    access: "அனுமதிக்கப்பட்ட பயனர்களுக்கான அணுகல்.",
    email: "மின்னஞ்சல்",
    password: "கடவுச்சொல்",
    forgot: "கடவுச்சொல் மறந்துவிட்டதா?",
    open: "டெர்மினல் திற",
    or: "அல்லது",
    noAccount: "கணக்கு இல்லையா?",
    register: "பதிவு",
    sessionNote:
      "“உள்நுழைந்தே இரு” இல்லையெனில் 15 நிமி. செயலற்ற பின் வெளியேற்றப்படும்.",
  },
};

export function AuthForm({
  error,
  message,
  signupEnabled = false,
  oauthLoginEnabled = true,
}: AuthFormProps) {
  const { locale } = useLocale();
  const copy = AUTH_COPY[locale];

  return (
    <div className="w-full" suppressHydrationWarning>
      <div className="mb-5 flex items-start justify-between gap-3">
        <header className="min-w-0 space-y-2">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-orange-300/90">
            {copy.terminal}
          </p>
          <h2 className="relative -top-0.5 font-sans text-[1.9rem] font-semibold leading-none tracking-[-0.035em] text-white sm:text-[2.05rem]">
            {copy.signIn}
          </h2>
          <p className="text-sm leading-relaxed text-slate-400">{copy.access}</p>
        </header>
        <LanguageSwitcher className="shrink-0" />
      </div>

      <div className="space-y-4">
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
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
            label={copy.email}
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="h-12 rounded-xl border-white/12 bg-white/[0.04] text-white placeholder:text-slate-500 focus-visible:border-orange-400/45 focus-visible:ring-orange-400/15"
            required
          />

          <Input
            id="password"
            label={copy.password}
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="h-12 rounded-xl border-white/12 bg-white/[0.04] text-white placeholder:text-slate-500 focus-visible:border-cyan-400/40 focus-visible:ring-cyan-400/15"
            required
          />

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-orange-300/90 transition hover:text-orange-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40"
            >
              {copy.forgot}
            </Link>
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            className="h-12 rounded-xl bg-orange-500 text-base font-semibold text-white transition hover:bg-orange-400 focus-visible:ring-orange-300/40"
          >
            {copy.open}
          </Button>
        </form>

        {oauthLoginEnabled && (
          <>
            <div className="relative flex items-center py-1">
              <div className="grow border-t border-white/10" />
              <span className="mx-3 shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
                {copy.or}
              </span>
              <div className="grow border-t border-white/10" />
            </div>
            <div className="aaryx-start-oauth">
              <OAuthButtons />
            </div>
          </>
        )}

        <div className="aaryx-start-remember text-slate-300">
          <RememberMeCheckbox />
        </div>
      </div>

      <footer className="mt-8 space-y-2.5 border-t border-white/8 pt-5">
        {signupEnabled && (
          <p className="text-center text-sm text-slate-400">
            {copy.noAccount}{" "}
            <Link
              href="/signup"
              className="font-medium text-orange-300 hover:text-orange-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40"
            >
              {copy.register}
            </Link>
          </p>
        )}
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
          <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {copy.sessionNote}
        </p>
      </footer>
    </div>
  );
}
