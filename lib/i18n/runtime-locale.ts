import type { AppLocale } from "@/lib/i18n/locales";
import { DEFAULT_LOCALE } from "@/lib/i18n/locales";

let runtimeLocale: AppLocale = DEFAULT_LOCALE;

export function setRuntimeLocale(locale: AppLocale): void {
  runtimeLocale = locale;
}

export function getRuntimeLocale(): AppLocale {
  return runtimeLocale;
}
