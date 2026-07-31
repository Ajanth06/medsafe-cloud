"use client";

import { LocaleProvider } from "@/components/i18n/locale-provider";
import type { AppLocale } from "@/lib/i18n/locales";
import type { ReactNode } from "react";

export function AppProviders({
  children,
  initialLocale = "de",
}: {
  children: ReactNode;
  initialLocale?: AppLocale;
}) {
  return (
    <LocaleProvider initialLocale={initialLocale}>{children}</LocaleProvider>
  );
}
