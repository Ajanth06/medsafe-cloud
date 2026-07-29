import type { Metadata } from "next";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthFormDecor } from "@/components/auth/auth-form-decor";
import { AuthForm } from "@/components/auth/auth-form";
import { isOAuthLoginEnabled, isSignupEnabled } from "@/lib/auth/config";

export const metadata: Metadata = {
  title: "Anmelden",
  description: "Melde dich bei AARYX an und öffne das Marktintelligenz-Terminal.",
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

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-[#f7f3ea] lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <main className="relative order-1 flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden px-5 py-6 sm:px-10 lg:order-2 lg:px-10 lg:py-0 xl:px-14">
        <AuthFormDecor />
        <div className="relative z-10 w-full max-w-[420px]">
          <AuthForm
            error={error}
            message={message}
            signupEnabled={signupEnabled}
            oauthLoginEnabled={oauthLoginEnabled}
          />
        </div>
      </main>

      <div className="hidden h-full min-h-0 overflow-hidden lg:order-1 lg:block">
        <AuthBrandPanel variant="login" />
      </div>
    </div>
  );
}
