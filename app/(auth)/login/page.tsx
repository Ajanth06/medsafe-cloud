import type { Metadata } from "next";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthForm } from "@/components/auth/auth-form";
import { GlobalMarketClock } from "@/components/auth/global-market-clock";
import { isOAuthLoginEnabled, isSignupEnabled } from "@/lib/auth/config";
import { cookies } from "next/headers";
import { LOCALE_COOKIE_KEY, parseAppLocale } from "@/lib/i18n/locales";
import { getMi } from "@/lib/i18n/mi";

export const metadata: Metadata = {
  title: "Anmelden",
  description: "AARYX — Öl- und Geopolitik-Intelligence. Terminal öffnen.",
};

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, message } = await searchParams;
  const signupEnabled = isSignupEnabled();
  const oauthLoginEnabled = isOAuthLoginEnabled();
  const jar = await cookies();
  const t = getMi(parseAppLocale(jar.get(LOCALE_COOKIE_KEY)?.value));

  return (
    <div className="aaryx-start aaryx-terminal-theme relative flex min-h-svh flex-col overflow-x-hidden lg:grid lg:grid-cols-[1.08fr_0.92fr] lg:overflow-hidden">
      <div className="aaryx-start-field pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="aaryx-start-sheen pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative z-10 hidden min-h-0 lg:block">
        <AuthBrandPanel variant="login" />
      </div>

      <main className="relative z-10 flex min-h-svh flex-1 flex-col justify-start px-5 py-7 sm:px-8 sm:py-8 lg:min-h-0 lg:justify-center lg:border-l lg:border-white/8 lg:px-10 lg:py-10 xl:px-14">
        {/* Mobile: brand is the hero signal */}
        <div className="mb-6 lg:hidden">
          <p
            className="aaryx-start-rise font-[family-name:var(--font-landing-display)] text-[clamp(2.75rem,12vw,3.75rem)] font-extrabold leading-[0.9] tracking-[-0.04em] text-white"
            style={{ animationDelay: "40ms" }}
          >
            AARYX
          </p>
          <p
            className="aaryx-start-rise mt-3 max-w-sm text-base leading-relaxed text-slate-300"
            style={{ animationDelay: "120ms" }}
          >
            {t.loginMobileTagline}
          </p>
        </div>

        <div
          className="aaryx-start-rise mx-auto w-full max-w-[400px]"
          style={{ animationDelay: "160ms" }}
        >
          <AuthForm
            error={error}
            message={message}
            signupEnabled={signupEnabled}
            oauthLoginEnabled={oauthLoginEnabled}
          />
        </div>

        <div
          className="aaryx-start-rise mx-auto mt-8 w-full max-w-[500px] lg:hidden"
          style={{ animationDelay: "240ms" }}
        >
          <GlobalMarketClock variant="mobile" />
        </div>
      </main>
    </div>
  );
}
