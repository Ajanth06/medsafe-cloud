import {
  BrainCircuit,
  CalendarDays,
  Check,
  Cloud,
  FileText,
  Lock,
  Pill,
  Shield,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { HealthcareIllustration } from "@/components/auth/healthcare-illustration";

type AuthBrandPanelVariant = "login" | "signup";

interface AuthBrandPanelProps {
  variant?: AuthBrandPanelVariant;
}

const loginTrustPoints = [
  { icon: Shield, label: "Verschlüsselte Speicherung in der EU" },
  { icon: Lock, label: "Nur du hast Zugriff auf deine Daten" },
  { icon: BrainCircuit, label: "KI erklärt deine Befunde verständlich" },
] as const;

const loginHighlights = [
  "Über 256-Bit verschlüsselt",
  "Serverstandort Deutschland / EU",
  "ISO 27001 Sicherheitsstandards",
] as const;

const loginSteps = [
  { icon: FileText, label: "Hochladen" },
  { icon: Sparkles, label: "KI erklärt" },
  { icon: CalendarDays, label: "Timeline" },
] as const;

const signupFeatures = [
  { icon: BrainCircuit, label: "KI-Analyse deiner Dokumente" },
  { icon: Cloud, label: "Sichere Cloud-Speicherung" },
  { icon: Pill, label: "Medikamente im Blick" },
  { icon: CalendarDays, label: "Medizinische Timeline" },
] as const;

function TrustNetworkBackground() {
  return (
    <svg
      className="absolute bottom-0 left-0 right-0 h-48 w-full opacity-[0.14]"
      viewBox="0 0 400 160"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="40" cy="120" r="2" fill="white" />
      <circle cx="120" cy="90" r="2" fill="white" />
      <circle cx="200" cy="130" r="2" fill="white" />
      <circle cx="280" cy="80" r="2" fill="white" />
      <circle cx="360" cy="110" r="2" fill="white" />
      <path
        d="M40 120 L120 90 L200 130 L280 80 L360 110"
        stroke="white"
        strokeWidth="0.75"
        strokeOpacity="0.5"
      />
    </svg>
  );
}

function LoginStepFlow() {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {loginSteps.map(({ icon: Icon, label }, index) => (
        <div key={label} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-xl bg-white/[0.08] px-2 py-2.5 backdrop-blur-sm sm:gap-2 sm:rounded-2xl sm:px-3 sm:py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 sm:h-9 sm:w-9 sm:rounded-xl">
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            </span>
            <span className="text-center text-[10px] font-medium text-blue-50 sm:text-xs">
              {label}
            </span>
          </div>
          {index < loginSteps.length - 1 && (
            <span className="shrink-0 text-xs text-blue-200/50 sm:text-sm" aria-hidden="true">
              →
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function TrustBadges() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1.5 text-[10px] font-medium text-blue-50/90 backdrop-blur-sm sm:px-3.5 sm:py-2 sm:text-[11px]">
        <ShieldCheck className="h-3 w-3" aria-hidden="true" />
        DSGVO-konform
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1.5 text-[10px] font-medium text-blue-50/90 backdrop-blur-sm sm:px-3.5 sm:py-2 sm:text-[11px]">
        <Lock className="h-3 w-3" aria-hidden="true" />
        ISO 27001-Infrastruktur
      </span>
    </div>
  );
}

export function AuthBrandPanel({ variant = "signup" }: AuthBrandPanelProps) {
  const isLogin = variant === "login";

  return (
    <div className="relative flex w-full flex-col justify-between overflow-hidden bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#1e40af] px-5 py-6 text-white sm:px-8 sm:py-8 lg:min-h-screen lg:px-12 lg:py-14 xl:px-16">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-blue-900/30 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.08),transparent_50%)]" />
        {isLogin && <TrustNetworkBackground />}
      </div>

      <div className="relative z-10 flex w-full flex-1 flex-col justify-center lg:max-w-none">
        {isLogin && (
          <div className="mb-4 flex items-center gap-2 text-blue-100/80 sm:mb-6">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="text-sm font-medium tracking-wide">MedSafe Cloud</span>
          </div>
        )}

        <div className="w-full max-w-xl lg:max-w-2xl">
          {isLogin ? (
            <>
              <h1 className="text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl lg:text-5xl xl:text-[3.75rem]">
                Deine Gesundheit.
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-blue-50/95 sm:mt-4 sm:text-base lg:text-lg">
                Sicher. Digital. Immer an deiner Seite.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-semibold leading-tight tracking-tight lg:text-4xl xl:text-[2.75rem] xl:leading-[1.15]">
                Deine Gesundheit. An einem Ort.
              </h1>
              <p className="mt-4 text-base leading-relaxed text-blue-100 lg:text-lg">
                Erstelle dein Konto und organisiere Arztbriefe, Befunde und
                Medikamente sicher an einem Ort.
              </p>
            </>
          )}
        </div>

        {isLogin && (
          <div className="mt-5 w-full max-w-xl lg:mt-8 lg:max-w-2xl">
            <LoginStepFlow />
          </div>
        )}

        <div className="my-6 hidden w-full max-w-sm lg:my-8 lg:block lg:max-w-md xl:max-w-lg">
          <HealthcareIllustration />
        </div>

        {isLogin && (
          <ul className="mt-5 space-y-2 lg:mt-8" role="list">
            {loginHighlights.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-blue-50/95">
                <Check className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        )}

        <ul className="mt-5 hidden space-y-3 lg:mt-8 lg:block" role="list">
          {(isLogin ? loginTrustPoints : signupFeatures).map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-sm lg:text-base">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-blue-50">{label}</span>
            </li>
          ))}
        </ul>

        {isLogin && (
          <figure className="mt-8 hidden max-w-sm border-l-2 border-white/20 pl-4 lg:block">
            <blockquote className="text-sm italic leading-relaxed text-blue-50/90">
              „Endlich verstehe ich meine Befunde.“
            </blockquote>
            <figcaption className="mt-2 text-xs text-blue-100/60">
              — Nutzerin von MedSafe Cloud
            </figcaption>
          </figure>
        )}

        {!isLogin && (
          <ul className="mt-6 space-y-3 sm:mt-8 lg:hidden" role="list">
            {signupFeatures.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-blue-50">{label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isLogin && (
        <div className="relative z-10 mt-5 border-t border-white/10 pt-4 sm:mt-8 sm:pt-6">
          <TrustBadges />
          <p className="mt-3 hidden text-[11px] leading-relaxed text-blue-100/55 sm:block">
            Gesundheitsdaten werden verschlüsselt gespeichert. Jeder Account ist
            vollständig isoliert — niemand sonst hat Zugriff.
          </p>
        </div>
      )}
    </div>
  );
}
