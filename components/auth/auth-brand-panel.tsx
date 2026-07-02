import {
  BrainCircuit,
  CalendarDays,
  Cloud,
  Pill,
} from "lucide-react";
import { HealthcareIllustration } from "@/components/auth/healthcare-illustration";

const features = [
  { icon: BrainCircuit, label: "AI Document Analysis" },
  { icon: Cloud, label: "Secure Cloud Storage" },
  { icon: Pill, label: "Medication Tracking" },
  { icon: CalendarDays, label: "Medical Timeline" },
] as const;

export function AuthBrandPanel() {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] px-8 py-8 text-white lg:min-h-screen lg:px-12 lg:py-14 xl:px-16">
      {/* Decorative background elements */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-blue-300/20 blur-3xl" />
        <div className="absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-center">
        <div className="mb-8 hidden lg:block">
          <HealthcareIllustration />
        </div>

        <div className="max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight lg:text-4xl xl:text-[2.75rem] xl:leading-[1.15]">
            Your personal AI health companion.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-blue-100 lg:text-lg">
            Upload medical documents, understand reports with AI and keep
            everything securely organized.
          </p>
        </div>

        <ul className="mt-6 hidden space-y-3 sm:block" role="list">
          {features.map(({ icon: Icon, label }) => (
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
