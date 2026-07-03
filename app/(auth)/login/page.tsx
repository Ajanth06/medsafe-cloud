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
    <div className="flex min-h-screen flex-col bg-background lg:grid lg:h-screen lg:grid-cols-2 lg:overflow-hidden">
      <main className="order-1 flex min-h-screen w-full flex-col items-center justify-center px-6 py-10 sm:px-10 lg:order-2 lg:min-h-0 lg:px-12 lg:py-14">
        <AuthForm error={error} message={message} />
      </main>

      <div className="hidden h-full lg:order-1 lg:block">
        <AuthBrandPanel variant="login" />
      </div>
    </div>
  );
}
