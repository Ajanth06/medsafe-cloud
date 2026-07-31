import type { AppLocale } from "@/lib/i18n/locales";

const TRANSLATE_TL: Record<AppLocale, string> = {
  de: "de",
  en: "en",
  ta: "ta",
};

/**
 * Open an external article via Google Translate into the UI language.
 * Original pages (Arabic, Farsi, …) stay unreadable otherwise.
 */
export function translatedSourceUrl(
  url: string,
  locale: AppLocale,
): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  try {
    // Already a translate wrapper — leave as-is
    if (/translate\.google\./i.test(trimmed) || /cdn\.ampproject\.org/i.test(trimmed)) {
      return trimmed;
    }
    const tl = TRANSLATE_TL[locale];
    const u = encodeURIComponent(trimmed);
    return `https://translate.google.com/translate?sl=auto&tl=${tl}&u=${u}`;
  } catch {
    return trimmed;
  }
}
