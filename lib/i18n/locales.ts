export const APP_LOCALES = ["de", "en", "ta"] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "de";

export const LOCALE_STORAGE_KEY = "aaryx-locale";
export const LOCALE_COOKIE_KEY = "aaryx_locale";

export const LOCALE_LABELS: Record<AppLocale, string> = {
  de: "DE",
  en: "EN",
  ta: "தமிழ்",
};

export const LOCALE_NAMES: Record<AppLocale, string> = {
  de: "Deutsch",
  en: "English",
  ta: "தமிழ்",
};

export function isAppLocale(value: unknown): value is AppLocale {
  return value === "de" || value === "en" || value === "ta";
}

export function parseAppLocale(value: string | null | undefined): AppLocale {
  if (isAppLocale(value)) return value;
  return DEFAULT_LOCALE;
}
