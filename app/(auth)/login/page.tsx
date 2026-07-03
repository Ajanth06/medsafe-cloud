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
      <main className="order-1 flex min-h-screen w-full flex-col lg:order-2 lg:min-h-0 lg:justify-center">
        <AuthForm error={error} message={message} />
      </main>

      <div className="hidden w-full lg:order-1 lg:block lg:min-h-screen">
        <AuthBrandPanel variant="login" />
      </div>
    </div>
  );
}
