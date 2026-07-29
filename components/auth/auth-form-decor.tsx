import { cn } from "@/lib/utils";

interface AuthFormDecorProps {
  className?: string;
}

export function AuthFormDecor({ className }: AuthFormDecorProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      aria-hidden="true"
    >
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-orange-300/25 blur-3xl" />
      <div className="absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, rgba(210,75,47,0.12) 1px, transparent 1.5px)",
          backgroundSize: "28px 28px",
          maskImage: "linear-gradient(to bottom, black, transparent 75%)",
        }}
      />
      <div className="absolute right-[8%] top-[9%] h-24 w-24 rounded-[2rem] border border-orange-400/20 bg-white/30 rotate-12 shadow-xl shadow-orange-300/10 backdrop-blur-sm" />
      <div className="absolute bottom-[12%] left-[7%] h-20 w-20 -rotate-12 rounded-full border border-cyan-500/15 bg-cyan-100/20 backdrop-blur-sm" />
    </div>
  );
}
