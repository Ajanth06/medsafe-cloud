import type { Metadata } from "next";
import { AppHeader } from "@/components/app/app-header";
import { AiChat } from "@/components/app/ai-chat";
import { getUserOrRedirect } from "@/lib/auth";

export const metadata: Metadata = {
  title: "KI-Chat",
  description: "Stelle Fragen zu deinen medizinischen Dokumenten.",
};

export default async function AiPage() {
  const { displayName } = await getUserOrRedirect();

  return (
    <>
      <AppHeader title="KI-Chat" subtitle="Wie ChatGPT — für deine Gesundheit" />

      <main className="mx-auto max-w-lg px-5 py-6">
        <AiChat userName={displayName} />
      </main>
    </>
  );
}
