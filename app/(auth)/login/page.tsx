import type { Metadata } from "next";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to MedSafe Cloud — your AI-powered health companion for organizing and understanding medical documents.",
};

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, message } = await searchParams;

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-2">
      <AuthBrandPanel />

      <main className="flex flex-col items-center justify-center px-6 py-10 sm:px-10 lg:px-12 lg:py-14">
        <AuthForm error={error} message={message} />
      </main>
    </div>
  );
}
