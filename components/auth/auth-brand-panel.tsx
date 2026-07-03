import {
  BrainCircuit,
  CalendarDays,
  Cloud,
  Dna,
  Lock,
  Pill,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { HealthcareIllustration } from "@/components/auth/healthcare-illustration";

type AuthBrandPanelVariant = "login" | "signup";

interface AuthBrandPanelProps {
  variant?: AuthBrandPanelVariant;
}

const loginFeatures = [
  { icon: BrainCircuit, label: "Arztbriefe mit KI verstehen" },
  { icon: Cloud, label: "Sichere Cloud-Speicherung" },
  { icon: Pill, label: "Medikamente im Blick behalten" },
  { icon: CalendarDays, label: "Persönliche medizinische Timeline" },
] as const;

const signupFeatures = [
  { icon: BrainCircuit, label: "Arztbriefe mit KI verstehen" },
  { icon: Cloud, label: "Sichere Cloud-Speicherung" },
  { icon: Pill, label: "Medikamente im Blick behalten" },
  { icon: CalendarDays, label: "Persönliche medizinische Timeline" },
] as const;

function BrandBackground() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-blue-300/20 blur-3xl" />
      <div className="absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
    </div>
  );
}

function LoginBrandBackground() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute inset-0 bg-[linear-gradient(to_left,rgba(255,255,255,0.42)_0%,rgba(191,219,254,0.32)_24%,rgba(96,165,250,0.16)_48%,transparent_78%)]" />
      <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-blue-300/20 blur-3xl" />
    </div>
  );
}

function LoginDnaDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden="true">
      <Dna
        className="absolute left-[5%] top-[10%] h-20 w-20 text-white/[0.06] lg:left-[6%] lg:top-[9%] lg:h-24 lg:w-24"
        strokeWidth={1}
      />
      <Dna
        className="absolute left-[3%] top-[40%] h-32 w-32 text-white/[0.06] lg:h-36 lg:w-36"
        strokeWidth={1}
      />
    </div>
  );
}

export function AuthBrandPanel({ variant = "signup" }: AuthBrandPanelProps) {
  const isLogin = variant === "login";

  if (isLogin) {
    return (
      <div className="relative flex h-full min-h-screen flex-col overflow-hidden bg-gradient-to-br from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] px-8 pt-8 pb-4 text-white lg:min-h-0 lg:px-12 lg:pt-14 lg:pb-5 xl:px-16">
        <LoginBrandBackground />
        <LoginDnaDecor />

        <div className="relative z-10 flex h-full min-h-0 flex-col">
          <div className="flex flex-1 flex-col justify-center">
            <div className="mb-8 w-full max-w-md">
              <h1 className="glass-text-title text-[2rem] font-semibold leading-[1.06] tracking-[-0.03em] lg:text-[2.75rem] xl:text-[3rem]">
                Deine Gesundheit.
              </h1>
              <p className="glass-text-sub mt-2.5 text-base font-medium leading-snug tracking-[-0.015em] lg:text-xl">
                Sicher. Digital. Immer an deiner Seite.
              </p>
            </div>

            <div className="w-full max-w-md">
              <HealthcareIllustration
                pulseShield
                className="mx-0 -translate-x-3 -translate-y-5 lg:-translate-x-4 lg:-translate-y-8"
              />
            </div>

            <ul className="mt-6 space-y-3" role="list">
              {loginFeatures.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 text-sm lg:text-base">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="text-blue-50">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <footer className="mt-auto shrink-0 space-y-1 text-[11px] leading-relaxed text-blue-100/70 lg:text-xs">
            <p className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-blue-50/80" aria-hidden="true" />
              DSGVO-konforme Datenverarbeitung
            </p>
            <p className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 shrink-0 text-blue-50/80" aria-hidden="true" />
              ISO 27001 orientierte Sicherheitsstandards
            </p>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-screen flex-col overflow-hidden bg-gradient-to-br from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] px-8 py-8 text-white lg:min-h-0 lg:px-12 lg:py-14 xl:px-16">
      <BrandBackground />

      <div className="relative z-10 flex flex-1 flex-col justify-center">
        <div className="mb-4 flex items-center gap-2 text-blue-100/80">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="text-sm font-medium tracking-wide">MedSafe Cloud</span>
        </div>

        <div className="max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight lg:text-4xl xl:text-[2.75rem] xl:leading-[1.15]">
            Deine Gesundheit. An einem Ort.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-blue-100 lg:text-lg">
            Erstelle dein Konto und organisiere Arztbriefe, Befunde und
            Medikamente sicher an einem Ort.
          </p>
        </div>

        <ul className="mt-6 space-y-3 lg:hidden" role="list">
          {signupFeatures.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="text-blue-50">{label}</span>
            </li>
          ))}
        </ul>

        <ul className="mt-8 hidden space-y-3 lg:block" role="list">
          {signupFeatures.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-sm lg:text-base">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-blue-50">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
