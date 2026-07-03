"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Upload } from "lucide-react";
import {
  ACCEPTED_DOCUMENT_TYPES,
  CAMERA_IMAGE_TYPES,
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

function defaultCameraFileName() {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  return `foto-${stamp}.jpg`;
}

export function DocumentUploadButton({ className }: DocumentUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetInputs() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  async function handleFile(file: File, fromCamera = false) {
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
      const fileName = file.name?.trim() || (fromCamera ? defaultCameraFileName() : "dokument");
      const safeName = sanitizeFileName(fileName);
      const storagePath = `${user.id}/${documentId}/${safeName}`;
      const today = new Date().toISOString().slice(0, 10);
      const title = fromCamera
        ? `Foto ${new Date().toLocaleDateString("de-DE")}`
        : titleFromFileName(fileName);

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file, {
          contentType: file.type || "image/jpeg",
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
        source: fromCamera ? "Kamera" : "Hochgeladen",
        document_date: today,
        type: inferDocumentType(file),
        storage_path: storagePath,
        file_name: fileName,
        mime_type: file.type || "image/jpeg",
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
      resetInputs();
    }
  }

  const buttonClass = (primary = false) =>
    cn(
      "inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 text-base font-medium shadow-sm transition-colors",
      uploading ? "pointer-events-none opacity-50" : "",
      primary
        ? "bg-primary text-white hover:bg-primary/90"
        : "border border-border bg-card text-foreground hover:bg-background",
    );

  return (
    <div className={cn("space-y-2", className)}>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className={buttonClass(true)}>
          <input
            ref={cameraInputRef}
            type="file"
            className="sr-only"
            accept={CAMERA_IMAGE_TYPES}
            capture="environment"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file, true);
            }}
          />
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Camera className="h-4 w-4" aria-hidden="true" />
          )}
          Foto aufnehmen
        </label>

        <label className={buttonClass()}>
          <input
            ref={fileInputRef}
            type="file"
            className="sr-only"
            accept={ACCEPTED_DOCUMENT_TYPES}
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file, false);
            }}
          />
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="h-4 w-4" aria-hidden="true" />
          )}
          Datei wählen
        </label>
      </div>

      <p className="text-center text-xs text-muted">
        Kamera, Fotos oder PDF · max. 50 MB
      </p>

      {error && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
