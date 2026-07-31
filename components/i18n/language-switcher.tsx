"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import {
  APP_LOCALES,
  LOCALE_LABELS,
  LOCALE_NAMES,
  type AppLocale,
} from "@/lib/i18n/locales";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
  /** denser for header */
  compact?: boolean;
}

/**
 * Always-visible language control: Deutsch · English · தமிழ்
 */
export function LanguageSwitcher({
  className,
  compact = true,
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      role="group"
      aria-label="Language / Sprache / மொழி"
      className={cn(
        "inline-flex items-center rounded-xl border border-white/12 bg-black/25 p-0.5",
        className,
      )}
    >
      {APP_LOCALES.map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code as AppLocale)}
            aria-pressed={active}
            title={LOCALE_NAMES[code]}
            className={cn(
              "inline-flex min-h-10 min-w-11 items-center justify-center rounded-lg px-2 font-mono text-[10px] font-bold uppercase leading-none tracking-wide transition sm:min-h-9 sm:min-w-10 sm:px-2.5",
              compact ? "text-[10px]" : "px-3 text-[11px]",
              active
                ? "bg-orange-500 text-white"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
            )}
          >
            {LOCALE_LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
