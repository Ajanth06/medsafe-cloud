import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthFormDecor } from "@/components/auth/auth-form-decor";
import { SignupForm } from "@/components/auth/signup-form";
import { isSignupEnabled } from "@/lib/auth/config";

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

  return (
    <div className="flex min-h-screen flex-col bg-background lg:grid lg:grid-cols-2">
      <div className="order-1 w-full lg:order-1 lg:min-h-screen">
        <AuthBrandPanel variant="signup" />
      </div>

      <main className="relative order-2 flex flex-1 flex-col items-center justify-center px-5 py-8 sm:px-10 lg:order-2 lg:overflow-hidden lg:px-12 lg:py-14">
        <AuthFormDecor />
        <div className="relative z-10 w-full max-w-[420px]">
          <SignupForm error={error} />
        </div>
      </main>
    </div>
  );
}
