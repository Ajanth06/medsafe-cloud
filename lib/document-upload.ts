import type { DocumentType } from "@/lib/types/health";

export function sanitizeFileName(name: string) {
  const trimmed = name.trim() || "dokument";
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function titleFromFileName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Dokument";
}

export function inferDocumentType(file: File): DocumentType {
  const name = file.name.toLowerCase();

  if (name.includes("blut") || name.includes("labor")) return "blutwerte";
  if (name.includes("ct") || name.includes("mrt") || name.includes("befund")) return "ct";
  if (name.includes("arzt") || name.includes("brief") || name.includes("entlass")) {
    return "arztbrief";
  }

  return "other";
}

export const ACCEPTED_DOCUMENT_TYPES =
  "application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.pdf,.heic,.heif";

export const MAX_DOCUMENT_SIZE_BYTES = 50 * 1024 * 1024;
