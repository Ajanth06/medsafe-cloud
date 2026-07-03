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
    <div className="flex min-h-screen flex-col lg:grid lg:grid-cols-2">
      <div className="order-1 w-full lg:order-1 lg:min-h-screen">
        <AuthBrandPanel variant="login" />
      </div>

      <main className="order-2 flex flex-1 flex-col items-center justify-center px-5 py-8 sm:px-10 lg:order-2 lg:px-12 lg:py-14">
        <AuthForm error={error} message={message} />
      </main>
    </div>
  );
}
