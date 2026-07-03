import { cn } from "@/lib/utils";

interface HealthcareIllustrationProps {
  pulseShield?: boolean;
  className?: string;
}

export function HealthcareIllustration({
  pulseShield = false,
  className,
}: HealthcareIllustrationProps) {
  return (
    <div
      className={cn("relative mx-auto w-full max-w-md", className)}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 400 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-auto w-full drop-shadow-2xl"
      >
        <defs>
          <linearGradient id="doc-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#EFF6FF" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="shield-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* Background glow orbs */}
        <circle cx="80" cy="100" r="60" fill="white" fillOpacity="0.08" />
        <circle cx="320" cy="280" r="80" fill="white" fillOpacity="0.06" />
        <circle cx="200" cy="180" r="120" fill="white" fillOpacity="0.04" />

        {/* Main document card */}
        <g filter="url(#soft-shadow)">
          <rect
            x="90"
            y="60"
            width="220"
            height="280"
            rx="20"
            fill="url(#doc-gradient)"
          />
          {/* Document header lines */}
          <rect x="120" y="100" width="80" height="8" rx="4" fill="#2563EB" fillOpacity="0.8" />
          <rect x="120" y="120" width="160" height="6" rx="3" fill="#94A3B8" fillOpacity="0.5" />
          <rect x="120" y="136" width="140" height="6" rx="3" fill="#94A3B8" fillOpacity="0.4" />

          {/* Chart area */}
          <rect x="120" y="165" width="160" height="90" rx="12" fill="#F1F5F9" />
          <polyline
            points="135,230 160,200 185,215 210,175 235,190 260,155"
            stroke="#2563EB"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="260" cy="155" r="5" fill="#2563EB" />

          {/* List items */}
          <rect x="120" y="270" width="12" height="12" rx="3" fill="#22C55E" fillOpacity="0.8" />
          <rect x="140" y="272" width="100" height="8" rx="4" fill="#CBD5E1" />
          <rect x="120" y="295" width="12" height="12" rx="3" fill="#22C55E" fillOpacity="0.8" />
          <rect x="140" y="297" width="80" height="8" rx="4" fill="#CBD5E1" />
        </g>

        {/* Floating shield badge */}
        <g
          filter="url(#soft-shadow)"
          className={pulseShield ? "shield-pulse" : undefined}
        >
          <circle cx="300" cy="90" r="36" fill="url(#shield-gradient)" />
          <path
            d="M300 68 C300 68 285 74 285 82 C285 96 300 108 300 108 C300 108 315 96 315 82 C315 74 300 68 300 68Z"
            fill="white"
            fillOpacity="0.95"
          />
          <path
            d="M295 86 L298 89 L306 81"
            stroke="#2563EB"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>

        {/* AI sparkle badge */}
        <g filter="url(#soft-shadow)">
          <circle cx="75" cy="220" r="32" fill="white" fillOpacity="0.95" />
          <path
            d="M75 205 L77 213 L85 215 L77 217 L75 225 L73 217 L65 215 L73 213 Z"
            fill="#2563EB"
          />
          <path
            d="M88 208 L89 212 L93 213 L89 214 L88 218 L87 214 L83 213 L87 212 Z"
            fill="#60A5FA"
          />
        </g>

        {/* Pill / medication element */}
        <g filter="url(#soft-shadow)">
          <rect x="55" y="130" width="56" height="28" rx="14" fill="white" fillOpacity="0.9" />
          <rect x="55" y="130" width="28" height="28" rx="14" fill="#BFDBFE" />
          <rect x="83" y="130" width="28" height="28" rx="14" fill="#2563EB" fillOpacity="0.7" />
        </g>

        {/* Timeline dots */}
        <circle cx="340" cy="200" r="6" fill="white" fillOpacity="0.9" />
        <line x1="340" y1="206" x2="340" y2="240" stroke="white" strokeOpacity="0.4" strokeWidth="2" />
        <circle cx="340" cy="246" r="6" fill="white" fillOpacity="0.7" />
        <line x1="340" y1="252" x2="340" y2="286" stroke="white" strokeOpacity="0.3" strokeWidth="2" />
        <circle cx="340" cy="292" r="6" fill="white" fillOpacity="0.5" />
      </svg>
    </div>
  );
}
