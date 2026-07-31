"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_KEY,
  LOCALE_STORAGE_KEY,
  parseAppLocale,
  type AppLocale,
} from "@/lib/i18n/locales";
import {
  tConfidence,
  tDataAvailability,
  tDelayedMinutes,
  tEventStatus,
  tEvidenceCount,
  tPressure,
  tRegime,
  tSeverity,
  tSourcesCount,
  tStatus,
  tUnreadAlerts,
  tVerification,
  tVolatility,
} from "@/lib/i18n/labels";
import { getMi, type MiMessages } from "@/lib/i18n/mi";
import { setRuntimeLocale } from "@/lib/i18n/runtime-locale";

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: MiMessages;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function persistLocale(locale: AppLocale) {
  setRuntimeLocale(locale);
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* private mode */
  }
  document.cookie = `${LOCALE_COOKIE_KEY}=${locale};path=/;max-age=31536000;samesite=lax`;
  document.documentElement.lang = locale === "ta" ? "ta" : locale;
}

export function LocaleProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: AppLocale;
}) {
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale);

  // Keep label helpers aligned with React locale during SSR + first client paint.
  // Cookie (initialLocale) is the source of truth for hydration.
  setRuntimeLocale(locale);

  useEffect(() => {
    // Sync storage/cookie to the SSR locale — do not override from localStorage
    // on first paint (that caused server/client label mismatches).
    persistLocale(locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
    persistLocale(next);
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: getMi(locale),
    }),
    [locale, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => undefined,
      t: getMi(DEFAULT_LOCALE),
    };
  }
  return ctx;
}

export function useMi(): MiMessages {
  return useLocale().t;
}

/** Locale-bound label helpers — safe for SSR hydration. */
export function useLabels() {
  const { locale } = useLocale();
  return useMemo(
    () => ({
      tSeverity: (value: string) => tSeverity(value, locale),
      tDataAvailability: (value: string) => tDataAvailability(value, locale),
      tVerification: (value: string) => tVerification(value, locale),
      tRegime: (value: string) => tRegime(value, locale),
      tPressure: (value: string) => tPressure(value, locale),
      tStatus: (value: string) => tStatus(value, locale),
      tVolatility: (value: string) => tVolatility(value, locale),
      tEventStatus: (value: string) => tEventStatus(value, locale),
      tConfidence: (value: string) => tConfidence(value, locale),
      tSourcesCount: (count: number) => tSourcesCount(count, locale),
      tEvidenceCount: (count: number) => tEvidenceCount(count, locale),
      tUnreadAlerts: (count: number) => tUnreadAlerts(count, locale),
      tDelayedMinutes: (minutes: number) => tDelayedMinutes(minutes, locale),
    }),
    [locale],
  );
}

export { parseAppLocale };
