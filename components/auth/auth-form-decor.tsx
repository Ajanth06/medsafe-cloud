import { cn } from "@/lib/utils";

interface AuthFormDecorProps {
  className?: string;
}

/**
 * Subtle upper-right background motif for auth form panels:
 * health network nodes, connection lines, and a faint heartbeat trace.
 */
export function AuthFormDecor({ className }: AuthFormDecorProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 640 480"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute -right-8 -top-6 h-[min(58vh,420px)] w-[min(72vw,560px)] text-primary"
        preserveAspectRatio="xMaxYMin meet"
      >
        {/* Heartbeat trace */}
        <path
          d="M48 118 H112 L128 92 L144 144 L160 72 L176 128 H248"
          stroke="currentColor"
          strokeOpacity="0.035"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M248 118 H312 L328 98 L344 138 L360 88 L376 124 H448"
          stroke="currentColor"
          strokeOpacity="0.025"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Network connections */}
        <g stroke="currentColor" strokeOpacity="0.03" strokeWidth="1">
          <line x1="392" y1="64" x2="468" y2="108" />
          <line x1="468" y1="108" x2="548" y2="72" />
          <line x1="468" y1="108" x2="512" y2="168" />
          <line x1="392" y1="64" x2="356" y2="132" />
          <line x1="356" y1="132" x2="428" y2="196" />
          <line x1="512" y1="168" x2="428" y2="196" />
          <line x1="548" y1="72" x2="592" y2="132" />
          <line x1="592" y1="132" x2="512" y2="168" />
          <line x1="356" y1="132" x2="312" y2="88" />
        </g>

        {/* Network nodes */}
        <g fill="currentColor">
          <circle cx="392" cy="64" r="3.5" fillOpacity="0.04" />
          <circle cx="468" cy="108" r="4" fillOpacity="0.045" />
          <circle cx="548" cy="72" r="3" fillOpacity="0.035" />
          <circle cx="512" cy="168" r="3.5" fillOpacity="0.04" />
          <circle cx="428" cy="196" r="2.5" fillOpacity="0.03" />
          <circle cx="356" cy="132" r="3" fillOpacity="0.035" />
          <circle cx="592" cy="132" r="2.5" fillOpacity="0.03" />
          <circle cx="312" cy="88" r="2" fillOpacity="0.025" />
        </g>

        {/* Outer ring accents */}
        <circle
          cx="468"
          cy="108"
          r="22"
          stroke="currentColor"
          strokeOpacity="0.02"
          strokeWidth="1"
        />
        <circle
          cx="548"
          cy="72"
          r="16"
          stroke="currentColor"
          strokeOpacity="0.018"
          strokeWidth="1"
        />
      </svg>

      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/[0.03] blur-3xl" />
      <div className="absolute right-1/4 top-0 h-48 w-48 rounded-full bg-primary/[0.02] blur-2xl" />
    </div>
  );
}
