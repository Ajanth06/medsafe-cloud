import {
  BrainCircuit,
  CalendarDays,
  Cloud,
  FileText,
  Pill,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { HealthcareIllustration } from "@/components/auth/healthcare-illustration";
import { cn } from "@/lib/utils";

type AuthBrandPanelVariant = "login" | "signup";

interface AuthBrandPanelProps {
  variant?: AuthBrandPanelVariant;
}

const loginFeatures = [
  {
    icon: FileText,
    title: "KI-Dokumentenanalyse",
    description: "Befunde & Arztbriefe automatisch auswerten",
  },
  {
    icon: Cloud,
    title: "Sichere Cloud-Speicherung",
    description: "Verschlüsselt in deutschen Rechenzentren",
  },
  {
    icon: Pill,
    title: "Medikamenten-Tracking",
    description: "Nie wieder eine Dosis vergessen",
  },
  {
    icon: CalendarDays,
    title: "Medizinische Timeline",
    description: "Deine komplette Krankheitsgeschichte",
  },
] as const;

const signupFeatures = [
  { icon: BrainCircuit, label: "KI-Analyse deiner Dokumente" },
  { icon: Cloud, label: "Sichere Cloud-Speicherung" },
  { icon: Pill, label: "Medikamente im Blick" },
  { icon: CalendarDays, label: "Medizinische Timeline" },
] as const;

function LoginBrandBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-16 top-24 h-56 w-56 rounded-full border border-blue-200/40" />
      <div className="absolute -right-10 top-1/3 h-72 w-72 rounded-full border border-blue-100/50" />
      <div className="absolute bottom-20 left-1/4 h-40 w-40 rounded-full bg-blue-100/30 blur-2xl" />
      <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-sky-100/40 blur-3xl" />
    </div>
  );
}

function BrandLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
        <Shield className="h-4 w-4 text-white" aria-hidden="true" />
      </span>
      <span className="text-base font-semibold tracking-tight text-primary">MedSafe Cloud</span>
    </div>
  );
}

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
      <div className="relative flex h-full min-h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/90 to-blue-100/70 px-8 py-8 lg:min-h-0 lg:px-10 lg:py-10 xl:px-14">
        <LoginBrandBackground />

        <div className="relative z-10 flex flex-1 flex-col">
          <BrandLogo className="mb-10" />

          <div className="max-w-lg">
            <h1 className="text-3xl font-semibold leading-[1.1] tracking-tight text-foreground lg:text-4xl xl:text-[2.5rem]">
              Deine Gesundheit.
              <br />
              Sicher. Digital.
              <br />
              Immer an deiner Seite.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted lg:text-base">
              Behalte deine Gesundheitsdaten im Blick und erhalte intelligente
              Einblicke — sicher in der Cloud.
            </p>
          </div>

          <ul className="mt-8 space-y-5" role="list">
            {loginFeatures.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-foreground">
                    {title}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">{description}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-8">
            <div className="mx-auto w-full max-w-sm lg:max-w-md">
              <HealthcareIllustration />
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-6 flex items-center justify-center gap-1.5 text-xs text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-primary/70" aria-hidden="true" />
          DSGVO-konform &amp; ISO 27001 orientiert
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
