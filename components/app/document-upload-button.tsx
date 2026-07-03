"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import {
  ACCEPTED_DOCUMENT_TYPES,
  inferDocumentType,
  MAX_DOCUMENT_SIZE_BYTES,
  sanitizeFileName,
  titleFromFileName,
} from "@/lib/document-upload";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface DocumentUploadButtonProps {
  className?: string;
}

export function DocumentUploadButton({ className }: DocumentUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);

    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      setError("Die Datei ist zu groß. Maximal 50 MB.");
      return;
    }

    setUploading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Bitte melde dich erneut an.");
        return;
      }

      const documentId = crypto.randomUUID();
      const safeName = sanitizeFileName(file.name);
      const storagePath = `${user.id}/${documentId}/${safeName}`;
      const today = new Date().toISOString().slice(0, 10);
      const title = titleFromFileName(file.name);

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const { error: insertError } = await supabase.from("documents").insert({
        id: documentId,
        user_id: user.id,
        title,
        source: "Hochgeladen",
        document_date: today,
        type: inferDocumentType(file),
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || null,
        analyzed: false,
        summary: "",
        key_points: [],
        original_preview: "",
      });

      if (insertError) {
        await supabase.storage.from("documents").remove([storagePath]);
        setError(insertError.message);
        return;
      }

      await supabase.from("timeline_events").insert({
        user_id: user.id,
        event_date: today,
        label: title,
        icon: "document",
      });

      router.refresh();
    } catch {
      setError("Upload fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <label
        className={cn(
          "inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border bg-card px-5 text-base font-medium text-foreground shadow-sm transition-colors",
          uploading ? "pointer-events-none opacity-50" : "hover:bg-background",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={ACCEPTED_DOCUMENT_TYPES}
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Upload className="h-4 w-4" aria-hidden="true" />
        )}
        {uploading ? "Wird hochgeladen…" : "Dokument hochladen"}
      </label>

      <p className="text-center text-xs text-muted">
        PDF oder Foto · max. 50 MB · funktioniert auch mit iPhone-Kamera &amp; Dateien
      </p>

      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
