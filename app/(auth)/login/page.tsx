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
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-background lg:grid lg:grid-cols-2">
      <main className="order-1 flex h-full min-h-0 w-full flex-col items-center justify-center px-6 py-8 sm:px-10 lg:order-2 lg:overflow-hidden lg:px-10 lg:py-0 xl:px-12">
        <AuthForm error={error} message={message} />
      </main>

      <div className="hidden h-full min-h-0 overflow-hidden lg:order-1 lg:block">
        <AuthBrandPanel variant="login" />
      </div>
    </div>
  );
}
