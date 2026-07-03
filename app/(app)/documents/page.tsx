import type { Metadata } from "next";
import { AppHeader } from "@/components/app/app-header";
import { DocumentListItem } from "@/components/app/document-list-item";
import { DocumentUploadButton } from "@/components/app/document-upload-button";
import { EmptyState } from "@/components/app/empty-state";
import { requireOnboardingComplete } from "@/lib/auth";
import { getUserDocuments } from "@/lib/data/health";

export const metadata: Metadata = {
  title: "Dokumente",
  description: "Alle medizinischen Dokumente an einem Ort.",
};

export default async function DocumentsPage() {
  await requireOnboardingComplete();
  const documents = await getUserDocuments();

  return (
    <>
      <AppHeader
        title="Dokumente"
        subtitle={`${documents.length} persönliche Unterlage${documents.length === 1 ? "" : "n"}`}
      />

      <main className="mx-auto max-w-lg space-y-4 px-5 py-6">
        <DocumentUploadButton />

        {documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((document) => (
              <DocumentListItem key={document.id} document={document} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon="📄"
            title="Noch keine Dokumente"
            description="Lade deinen ersten Arztbrief, Laborbefund oder CT-Befund hoch. Die KI analysiert ihn nur für dein Konto."
          />
        )}
      </main>
    </>
  );
}
