import { miDe } from "@/lib/market-intelligence/i18n/de";
import { miEn } from "@/lib/i18n/mi-en";
import { miTa } from "@/lib/i18n/mi-ta";
import type { AppLocale } from "@/lib/i18n/locales";

export type MiMessages = typeof miDe;

export function getMi(locale: AppLocale): MiMessages {
  if (locale === "en") return miEn as unknown as MiMessages;
  if (locale === "ta") return miTa as unknown as MiMessages;
  return miDe;
}
