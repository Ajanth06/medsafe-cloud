import type { Metadata } from "next";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Anmelden",
  description:
    "Melde dich bei MedSafe Cloud an und behalte deine Gesundheitsdaten im Blick.",
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
    <div className="flex min-h-screen flex-col bg-background lg:grid lg:grid-cols-2">
      <main className="order-1 flex min-h-screen w-full flex-col items-center justify-center px-6 py-10 sm:px-10 lg:order-2 lg:px-16 lg:py-14 xl:px-24">
        <AuthForm error={error} message={message} />
      </main>

      <div className="hidden w-full lg:order-1 lg:block lg:min-h-screen">
        <AuthBrandPanel variant="login" />
      </div>
    </div>
  );
}
