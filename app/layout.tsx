import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Syne } from "next/font/google";
import { AppProviders } from "@/components/i18n/app-providers";
import { LOCALE_COOKIE_KEY, parseAppLocale } from "@/lib/i18n/locales";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const landingDisplay = Syne({
  variable: "--font-landing-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "AARYX",
    template: "%s — AARYX",
  },
  description:
    "AARYX — Marktintelligenz für Energie, Makro und geopolitische Ereignisse.",
  applicationName: "AARYX",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AARYX",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#0b1520",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const initialLocale = parseAppLocale(jar.get(LOCALE_COOKIE_KEY)?.value);

  return (
    <html
      lang={initialLocale === "ta" ? "ta" : initialLocale}
      className={`${geistSans.variable} ${geistMono.variable} ${landingDisplay.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AppProviders initialLocale={initialLocale}>{children}</AppProviders>
      </body>
    </html>
  );
}
