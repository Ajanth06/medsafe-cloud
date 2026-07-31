"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { signUpWithEmail } from "@/app/auth/actions";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useMi } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SignupFormProps {
  error?: string;
}

export function SignupForm({ error }: SignupFormProps) {
  const t = useMi();

  return (
    <div className="w-full">
      <header className="mb-7 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-orange-300/90">
            Terminal
          </p>
          <LanguageSwitcher />
        </div>
        <h2 className="relative -top-0.5 font-sans text-[1.9rem] font-semibold leading-none tracking-[-0.035em] text-white sm:text-[2.05rem]">
          {t.signupTitle}
        </h2>
        <p className="text-sm leading-relaxed text-slate-400">
          {t.signupSubtitle}
        </p>
      </header>

      <div className="space-y-4">
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {error}
          </p>
        )}

        <form action={signUpWithEmail} className="space-y-3.5" noValidate>
          <Input
            id="full_name"
            label={t.nameLabel}
            type="text"
            name="full_name"
            autoComplete="name"
            placeholder={t.namePlaceholder}
            className="h-12 rounded-xl border-white/12 bg-white/[0.04] text-white placeholder:text-slate-500"
            required
          />
          <Input
            id="email"
            label={t.email}
            type="email"
            name="email"
            autoComplete="email"
            placeholder={t.emailPlaceholder}
            className="h-12 rounded-xl border-white/12 bg-white/[0.04] text-white placeholder:text-slate-500"
            required
          />
          <Input
            id="password"
            label={t.password}
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder={t.passwordMinPlaceholder}
            className="h-12 rounded-xl border-white/12 bg-white/[0.04] text-white placeholder:text-slate-500"
            required
          />
          <Button
            type="submit"
            fullWidth
            size="lg"
            className="h-12 rounded-xl bg-orange-500 text-base font-semibold text-white hover:bg-orange-400"
          >
            {t.createAccount}
          </Button>
        </form>

        <div className="relative flex items-center py-1">
          <div className="grow border-t border-white/10" />
          <span className="mx-3 shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            {t.or}
          </span>
          <div className="grow border-t border-white/10" />
        </div>

        <OAuthButtons />

        <p className="pt-1 text-center text-sm text-slate-400">
          {t.hasAccount}{" "}
          <Link
            href="/login"
            className="font-semibold text-orange-300 hover:text-orange-200"
          >
            {t.goSignIn}
          </Link>
        </p>

        <p className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-slate-500">
          <Lock className="h-3 w-3" aria-hidden="true" />
          {t.authInviteOnly}
        </p>
      </div>
    </div>
  );
}
