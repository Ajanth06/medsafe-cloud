import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DocumentDetailView } from "@/components/app/document-detail-view";
import { requireOnboardingComplete } from "@/lib/auth";
import { getUserDocument } from "@/lib/data/health";

interface DocumentPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: DocumentPageProps): Promise<Metadata> {
  const { id } = await params;
  const document = await getUserDocument(id);
  return {
    title: document?.title ?? "Dokument",
  };
}

export default async function DocumentPage({ params }: DocumentPageProps) {
  await requireOnboardingComplete();
  const { id } = await params;
  const document = await getUserDocument(id);

  if (!document) {
    notFound();
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-5 py-4">
          <Link
            href="/documents"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card"
            aria-label="Zurück zu Dokumente"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-sm font-medium text-muted">Dokument</span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-5 py-6">
        <DocumentDetailView document={document} />
      </main>
    </>
  );
}
