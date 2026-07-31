import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { GlobalMarketClock } from "@/components/auth/global-market-clock";
import { SignupForm } from "@/components/auth/signup-form";
import { isSignupEnabled } from "@/lib/auth/config";
import { LOCALE_COOKIE_KEY, parseAppLocale } from "@/lib/i18n/locales";
import { getMi } from "@/lib/i18n/mi";

export const metadata: Metadata = {
  title: "Registrieren",
  description: "AARYX Terminal — Zugang nur für freigeschaltete Konten.",
};

interface SignupPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  if (!isSignupEnabled()) {
    redirect("/login");
  }

  const { error } = await searchParams;
  const jar = await cookies();
  const t = getMi(parseAppLocale(jar.get(LOCALE_COOKIE_KEY)?.value));

  return (
    <div className="aaryx-start aaryx-terminal-theme relative flex min-h-svh flex-col overflow-x-hidden lg:grid lg:grid-cols-[1.08fr_0.92fr] lg:overflow-hidden">
      <div className="aaryx-start-field pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="aaryx-start-sheen pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative z-10 hidden min-h-0 lg:block">
        <AuthBrandPanel variant="signup" />
      </div>

      <main className="relative z-10 flex min-h-svh flex-1 flex-col justify-start px-5 py-7 sm:px-8 sm:py-8 lg:min-h-0 lg:justify-center lg:border-l lg:border-white/8 lg:px-10 lg:py-10 xl:px-14">
        <div className="mb-6 lg:hidden">
          <p className="font-[family-name:var(--font-landing-display)] text-[clamp(2.75rem,12vw,3.75rem)] font-extrabold leading-[0.9] tracking-[-0.04em] text-white">
            AARYX
          </p>
          <p className="mt-3 max-w-sm text-base leading-relaxed text-slate-300">
            {t.signupMobileTagline}
          </p>
        </div>
        <div className="mx-auto w-full max-w-[400px]">
          <SignupForm error={error} />
        </div>
        <div className="mx-auto mt-8 w-full max-w-[500px] lg:hidden">
          <GlobalMarketClock variant="mobile" />
        </div>
      </main>
    </div>
  );
}
