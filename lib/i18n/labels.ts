import { getRuntimeLocale } from "@/lib/i18n/runtime-locale";
import type { AppLocale } from "@/lib/i18n/locales";
import { getMi } from "@/lib/i18n/mi";

type LabelMap = Record<string, string>;

const severity: Record<AppLocale, LabelMap> = {
  de: {
    INFO: "Info",
    LOW: "Niedrig",
    MEDIUM: "Mittel",
    ELEVATED: "Erhöht",
    HIGH: "Hoch",
    CRITICAL: "Kritisch",
  },
  en: {
    INFO: "Info",
    LOW: "Low",
    MEDIUM: "Medium",
    ELEVATED: "Elevated",
    HIGH: "High",
    CRITICAL: "Critical",
  },
  ta: {
    INFO: "INFO",
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    ELEVATED: "ELEVATED",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL",
  },
};

const dataAvailability: Record<AppLocale, LabelMap> = {
  de: {
    REALTIME: "Echtzeit",
    DELAYED: "Verzögert",
    DEMO: "Demo-Daten",
    UNAVAILABLE: "Nicht verfügbar",
    STALE: "Veraltet",
    LIVE: "Live",
  },
  en: {
    REALTIME: "Realtime",
    DELAYED: "Delayed",
    DEMO: "Demo data",
    UNAVAILABLE: "Unavailable",
    STALE: "Stale",
    LIVE: "Live",
  },
  ta: {
    REALTIME: "நேரடி",
    DELAYED: "தாமதம்",
    DEMO: "டெமோ தரவு",
    UNAVAILABLE: "கிடைக்கவில்லை",
    STALE: "காலாவதி",
    LIVE: "நேரலை",
  },
};

const verification: Record<AppLocale, LabelMap> = {
  de: {
    UNVERIFIED: "Unverifiziert",
    SINGLE_SOURCE: "Einzelquelle",
    MULTIPLE_SOURCES: "Mehrere Quellen",
    CONFIRMED: "Bestätigt",
    OFFICIAL_SOURCE: "Offizielle Quelle",
    OFFICIAL_CONFIRMATION: "Offizielle Bestätigung",
    CONFLICTING: "Widersprüchlich",
    RETRACTED: "Zurückgezogen",
    WATCH_MODE: "Beobachtungsmodus",
  },
  en: {
    UNVERIFIED: "Unverified",
    SINGLE_SOURCE: "Single source",
    MULTIPLE_SOURCES: "Multiple sources",
    CONFIRMED: "Confirmed",
    OFFICIAL_SOURCE: "Official source",
    OFFICIAL_CONFIRMATION: "Official confirmation",
    CONFLICTING: "Conflicting",
    RETRACTED: "Retracted",
    WATCH_MODE: "Watch mode",
  },
  ta: {
    UNVERIFIED: "சரிபார்க்கப்படவில்லை",
    SINGLE_SOURCE: "ஒரே மூலம்",
    MULTIPLE_SOURCES: "பல மூலங்கள்",
    CONFIRMED: "உறுதிப்படுத்தப்பட்டது",
    OFFICIAL_SOURCE: "அதிகாரப்பூர்வ மூலம்",
    OFFICIAL_CONFIRMATION: "அதிகாரப்பூர்வ உறுதி",
    CONFLICTING: "முரண்பாடு",
    RETRACTED: "திரும்பப் பெறப்பட்டது",
    WATCH_MODE: "கண்காணிப்பு",
  },
};

const regime: Record<AppLocale, LabelMap> = {
  de: {
    RISK_ON: "Risikobereitschaft",
    RISK_OFF: "Risikoaversion",
    INFLATIONARY: "Inflationär",
    DEFLATIONARY: "Deflationär",
    LIQUIDITY_DRIVEN: "Liquiditätsgetrieben",
    ENERGY_SHOCK: "Energieschock",
    GEOPOLITICAL_RISK: "Geopolitisches Risiko",
    MACRO_EVENT: "Makro-Ereignis",
    MIXED: "Gemischt",
    NEUTRAL: "Neutral",
    UNCERTAIN: "Unsicher",
  },
  en: {
    RISK_ON: "Risk on",
    RISK_OFF: "Risk off",
    INFLATIONARY: "Inflationary",
    DEFLATIONARY: "Deflationary",
    LIQUIDITY_DRIVEN: "Liquidity-driven",
    ENERGY_SHOCK: "Energy shock",
    GEOPOLITICAL_RISK: "Geopolitical risk",
    MACRO_EVENT: "Macro event",
    MIXED: "Mixed",
    NEUTRAL: "Neutral",
    UNCERTAIN: "Uncertain",
  },
  ta: {
    RISK_ON: "ஆபத்து ஏற்பு",
    RISK_OFF: "ஆபத்து தவிர்ப்பு",
    INFLATIONARY: "பணவீக்கம்",
    DEFLATIONARY: "பணவாட்டம்",
    LIQUIDITY_DRIVEN: "பணப்புழக்க உந்துதல்",
    ENERGY_SHOCK: "எரிசக்தி அதிர்ச்சி",
    GEOPOLITICAL_RISK: "புவிசார் அரசியல் ஆபத்து",
    MACRO_EVENT: "மேக்ரோ நிகழ்வு",
    MIXED: "கலவை",
    NEUTRAL: "நடுநிலை",
    UNCERTAIN: "நிச்சயமற்றது",
  },
};

const pressure: Record<AppLocale, LabelMap> = {
  de: {
    STRONG_BULLISH: "Starker Aufwärtsdruck",
    STRONG_BULLISH_PRESSURE: "Starker Aufwärtsdruck",
    BULLISH: "Aufwärtsdruck",
    BULLISH_PRESSURE: "Aufwärtsdruck",
    "BULLISH PRESSURE": "Aufwärtsdruck",
    NEUTRAL: "Neutral",
    BEARISH: "Abwärtsdruck",
    BEARISH_PRESSURE: "Abwärtsdruck",
    "BEARISH PRESSURE": "Abwärtsdruck",
    STRONG_BEARISH: "Starker Abwärtsdruck",
    STRONG_BEARISH_PRESSURE: "Starker Abwärtsdruck",
    UNCERTAIN: "Unsicher",
    WATCH: "Beobachten",
  },
  en: {
    STRONG_BULLISH: "Strong bullish",
    STRONG_BULLISH_PRESSURE: "Strong bullish pressure",
    BULLISH: "Bullish",
    BULLISH_PRESSURE: "Bullish pressure",
    "BULLISH PRESSURE": "Bullish pressure",
    NEUTRAL: "Neutral",
    BEARISH: "Bearish",
    BEARISH_PRESSURE: "Bearish pressure",
    "BEARISH PRESSURE": "Bearish pressure",
    STRONG_BEARISH: "Strong bearish",
    STRONG_BEARISH_PRESSURE: "Strong bearish pressure",
    UNCERTAIN: "Uncertain",
    WATCH: "Watch",
  },
  ta: {
    STRONG_BULLISH: "STRONG BULLISH",
    STRONG_BULLISH_PRESSURE: "STRONG BULLISH PRESSURE",
    BULLISH: "BULLISH",
    BULLISH_PRESSURE: "BULLISH PRESSURE",
    "BULLISH PRESSURE": "BULLISH PRESSURE",
    NEUTRAL: "NEUTRAL",
    BEARISH: "BEARISH",
    BEARISH_PRESSURE: "BEARISH PRESSURE",
    "BEARISH PRESSURE": "BEARISH PRESSURE",
    STRONG_BEARISH: "STRONG BEARISH",
    STRONG_BEARISH_PRESSURE: "STRONG BEARISH PRESSURE",
    UNCERTAIN: "UNCERTAIN",
    WATCH: "WATCH",
  },
};

const volatility: Record<AppLocale, LabelMap> = {
  de: {
    HIGH_VOLATILITY: "HOHE VOLATILITÄT",
    ELEVATED_VOLATILITY: "ERHÖHTE VOLATILITÄT",
    ELEVATED: "Erhöht",
    NORMAL: "Normal",
  },
  en: {
    HIGH_VOLATILITY: "HIGH VOLATILITY",
    ELEVATED_VOLATILITY: "ELEVATED VOLATILITY",
    ELEVATED: "Elevated",
    NORMAL: "Normal",
  },
  ta: {
    HIGH_VOLATILITY: "HIGH VOLATILITY",
    ELEVATED_VOLATILITY: "ELEVATED VOLATILITY",
    ELEVATED: "ELEVATED",
    NORMAL: "NORMAL",
  },
};

const eventStatus: Record<AppLocale, LabelMap> = {
  de: {
    ACTIVE: "Aktiv",
    MONITORING: "Überwachung",
    CONFIRMED: "Bestätigt",
    RESOLVED: "Erledigt",
  },
  en: {
    ACTIVE: "Active",
    MONITORING: "Monitoring",
    CONFIRMED: "Confirmed",
    RESOLVED: "Resolved",
  },
  ta: {
    ACTIVE: "செயலில்",
    MONITORING: "கண்காணிப்பு",
    CONFIRMED: "உறுதி",
    RESOLVED: "தீர்க்கப்பட்டது",
  },
};

const confidence: Record<AppLocale, LabelMap> = {
  de: { HIGH: "Hoch", MEDIUM: "Mittel", LOW: "Niedrig" },
  en: { HIGH: "High", MEDIUM: "Medium", LOW: "Low" },
  ta: { HIGH: "HIGH", MEDIUM: "MEDIUM", LOW: "LOW" },
};

const status: Record<AppLocale, LabelMap> = {
  de: {
    ONLINE: "Online",
    OFFLINE: "Offline",
    DEGRADED: "Eingeschränkt",
    NOT_CONFIGURED: "Nicht konfiguriert",
    PASS: "OK",
    WARN: "Warnung",
    FAIL: "Fehler",
    HEALTHY: "Gesund",
    CRITICAL: "Kritisch",
    ACTIVE: "Aktiv",
    READY: "Bereit",
    CONNECTED: "Verbunden",
    STALE: "Veraltet",
    RECONNECTING: "Verbindet neu",
    DISCONNECTED: "Getrennt",
    LIVE: "Live",
    DEMO: "Demo",
  },
  en: {
    ONLINE: "Online",
    OFFLINE: "Offline",
    DEGRADED: "Degraded",
    NOT_CONFIGURED: "Not configured",
    PASS: "OK",
    WARN: "Warning",
    FAIL: "Fail",
    HEALTHY: "Healthy",
    CRITICAL: "Critical",
    ACTIVE: "Active",
    READY: "Ready",
    CONNECTED: "Connected",
    STALE: "Stale",
    RECONNECTING: "Reconnecting",
    DISCONNECTED: "Disconnected",
    LIVE: "Live",
    DEMO: "Demo",
  },
  ta: {
    ONLINE: "ஆன்லைன்",
    OFFLINE: "ஆஃப்லைன்",
    DEGRADED: "குறைந்த செயல்திறன்",
    NOT_CONFIGURED: "அமைக்கப்படவில்லை",
    PASS: "சரி",
    WARN: "எச்சரிக்கை",
    FAIL: "தோல்வி",
    HEALTHY: "ஆரோக்கியம்",
    CRITICAL: "முக்கியமான",
    ACTIVE: "செயலில்",
    READY: "தயார்",
    CONNECTED: "இணைக்கப்பட்டது",
    STALE: "காலாவதி",
    RECONNECTING: "மீண்டும் இணைக்கிறது",
    DISCONNECTED: "துண்டிக்கப்பட்டது",
    LIVE: "நேரலை",
    DEMO: "டெமோ",
  },
};

function normalizeLabelKey(value: string): string {
  return value.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function pick(
  map: Record<AppLocale, LabelMap>,
  value: string,
  locale?: AppLocale,
): string {
  const loc = locale ?? getRuntimeLocale();
  const raw = value.trim();
  const key = normalizeLabelKey(raw);
  return (
    map[loc][raw] ??
    map[loc][key] ??
    map[loc][raw.toUpperCase()] ??
    raw.replace(/_/g, " ")
  );
}

export function tSeverity(value: string, locale?: AppLocale): string {
  return pick(severity, value, locale);
}
export function tDataAvailability(value: string, locale?: AppLocale): string {
  return pick(dataAvailability, value, locale);
}
export function tVerification(value: string, locale?: AppLocale): string {
  return pick(verification, value, locale);
}
export function tRegime(value: string, locale?: AppLocale): string {
  return pick(regime, value, locale);
}
export function tPressure(value: string, locale?: AppLocale): string {
  return pick(pressure, value, locale);
}
export function tStatus(value: string, locale?: AppLocale): string {
  return pick(status, value, locale);
}
export function tVolatility(value: string, locale?: AppLocale): string {
  return pick(volatility, value, locale);
}
export function tEventStatus(value: string, locale?: AppLocale): string {
  return pick(eventStatus, value, locale);
}
export function tConfidence(value: string, locale?: AppLocale): string {
  return pick(confidence, value, locale);
}

export function tSourcesCount(count: number, locale?: AppLocale): string {
  const loc = locale ?? getRuntimeLocale();
  if (loc === "en") return `Sources (${count} independent)`;
  if (loc === "ta") return `மூலங்கள் (${count} சுயாதீன)`;
  return `Quellen (${count} unabhängig)`;
}

export function tEvidenceCount(count: number, locale?: AppLocale): string {
  const loc = locale ?? getRuntimeLocale();
  if (loc === "en") return `Evidence (${count} entries)`;
  if (loc === "ta") return `ஆதாரங்கள் (${count} பதிவுகள்)`;
  return `Belege (${count} Einträge)`;
}

export function tUnreadAlerts(count: number, locale?: AppLocale): string {
  const t = getMi(locale ?? getRuntimeLocale());
  return count === 1
    ? `${count} ${t.unreadAlert}`
    : `${count} ${t.unreadAlerts}`;
}

export function tDelayedMinutes(minutes: number, locale?: AppLocale): string {
  const loc = locale ?? getRuntimeLocale();
  if (loc === "en") return `Delayed ${minutes}m`;
  if (loc === "ta") return `தாமதம் ${minutes} நிமி`;
  return `Verzögert ${minutes}m`;
}
