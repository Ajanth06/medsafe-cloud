import type { Metadata } from "next";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Create your MedSafe Cloud account to securely organize and understand your medical documents.",
};

interface SignupPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      <AuthBrandPanel />

      <main className="flex flex-col items-center justify-center px-6 py-10 sm:px-10 lg:px-12 lg:py-14">
        <SignupForm error={error} />
      </main>
    </div>
  );
}
