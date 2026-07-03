import type { Metadata } from "next";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Registrieren",
  description:
    "Erstelle dein MedSafe Cloud Konto und organisiere deine Gesundheitsdaten sicher.",
};

interface SignupPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-background lg:grid lg:grid-cols-2">
      <div className="order-1 w-full lg:order-1 lg:min-h-screen">
        <AuthBrandPanel variant="signup" />
      </div>

      <main className="order-2 flex flex-1 flex-col items-center justify-center px-5 py-8 sm:px-10 lg:order-2 lg:px-12 lg:py-14">
        <SignupForm error={error} />
      </main>
    </div>
  );
}
