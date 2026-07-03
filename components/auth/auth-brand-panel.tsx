import {
  BrainCircuit,
  CalendarDays,
  Cloud,
  Pill,
  Shield,
} from "lucide-react";
import { HealthcareIllustration } from "@/components/auth/healthcare-illustration";

type AuthBrandPanelVariant = "login" | "signup";

interface AuthBrandPanelProps {
  variant?: AuthBrandPanelVariant;
}

const loginFeatures = [
  { icon: BrainCircuit, label: "KI-Analyse deiner Dokumente" },
  { icon: Cloud, label: "Sichere Cloud-Speicherung" },
  { icon: Pill, label: "Medikamente im Blick" },
  { icon: CalendarDays, label: "Medizinische Timeline" },
] as const;

const signupFeatures = [
  { icon: BrainCircuit, label: "KI-Analyse deiner Dokumente" },
  { icon: Cloud, label: "Sichere Cloud-Speicherung" },
  { icon: Pill, label: "Medikamente im Blick" },
  { icon: CalendarDays, label: "Medizinische Timeline" },
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

export function AuthBrandPanel({ variant = "signup" }: AuthBrandPanelProps) {
  const isLogin = variant === "login";

  if (isLogin) {
    return (
      <div className="relative flex h-full min-h-screen flex-col overflow-hidden bg-gradient-to-br from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] px-8 py-8 text-white lg:min-h-0 lg:px-12 lg:py-14 xl:px-16">
        <BrandBackground />

        <div className="relative z-10 flex flex-1 flex-col justify-center">
          <div className="mb-8 w-full max-w-md">
            <HealthcareIllustration pulseShield />
          </div>

          <div className="max-w-md">
            <h1 className="text-3xl font-semibold leading-[1.05] tracking-tight lg:text-4xl lg:text-5xl xl:text-[3.25rem]">
              Deine Gesundheit.
            </h1>
            <p className="mt-3 text-base leading-relaxed text-blue-50/95 sm:text-lg lg:text-xl">
              Sicher. Digital. Immer an deiner Seite.
            </p>
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
