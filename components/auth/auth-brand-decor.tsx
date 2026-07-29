import { cn } from "@/lib/utils";

interface AuthBrandDecorProps {
  className?: string;
}

/**
 * Subtle upper-right motif for the auth brand panel:
 * health network nodes, connection lines, and a faint heartbeat trace.
 */
export function AuthBrandDecor({ className }: AuthBrandDecorProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 480 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute -right-4 -top-2 h-[min(52vh,380px)] w-[min(58vw,480px)] text-white lg:-right-2 lg:top-0"
        preserveAspectRatio="xMaxYMin meet"
      >
        {/* Heartbeat trace */}
        <path
          d="M32 96 H88 L104 72 L120 120 L136 56 L152 108 H216"
          stroke="currentColor"
          strokeOpacity="0.03"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M216 96 H272 L288 78 L304 114 L320 68 L336 102 H400"
          stroke="currentColor"
          strokeOpacity="0.02"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Network connections */}
        <g stroke="currentColor" strokeOpacity="0.025" strokeWidth="1">
          <line x1="328" y1="48" x2="396" y2="88" />
          <line x1="396" y1="88" x2="464" y2="56" />
          <line x1="396" y1="88" x2="436" y2="144" />
          <line x1="328" y1="48" x2="296" y2="112" />
          <line x1="296" y1="112" x2="360" y2="172" />
          <line x1="436" y1="144" x2="360" y2="172" />
          <line x1="464" y1="56" x2="504" y2="108" />
          <line x1="504" y1="108" x2="436" y2="144" />
          <line x1="296" y1="112" x2="256" y2="72" />
          <line x1="464" y1="56" x2="420" y2="28" />
        </g>

        {/* Network nodes */}
        <g fill="currentColor">
          <circle cx="328" cy="48" r="3.5" fillOpacity="0.03" />
          <circle cx="396" cy="88" r="4" fillOpacity="0.035" />
          <circle cx="464" cy="56" r="3" fillOpacity="0.025" />
          <circle cx="436" cy="144" r="3.5" fillOpacity="0.03" />
          <circle cx="360" cy="172" r="2.5" fillOpacity="0.02" />
          <circle cx="296" cy="112" r="3" fillOpacity="0.025" />
          <circle cx="504" cy="108" r="2.5" fillOpacity="0.02" />
          <circle cx="256" cy="72" r="2" fillOpacity="0.02" />
          <circle cx="420" cy="28" r="2" fillOpacity="0.018" />
        </g>

        {/* Outer ring accents */}
        <circle
          cx="396"
          cy="88"
          r="20"
          stroke="currentColor"
          strokeOpacity="0.018"
          strokeWidth="1"
        />
        <circle
          cx="464"
          cy="56"
          r="14"
          stroke="currentColor"
          strokeOpacity="0.015"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
