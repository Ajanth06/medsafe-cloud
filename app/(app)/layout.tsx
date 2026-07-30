import { BottomNav } from "@/components/app/bottom-nav";
import { SessionTimeoutGuard } from "@/components/app/session-timeout-guard";
import { getUserOrRedirect } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await getUserOrRedirect();

  return (
    <div className="aaryx-terminal-theme relative min-h-dvh overflow-hidden bg-[#0b1520] pb-28 text-slate-100 md:pb-8">
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 8% 2%, rgba(249,115,22,0.18), transparent 27%), radial-gradient(circle at 94% 16%, rgba(34,211,238,0.14), transparent 30%), linear-gradient(145deg, #111827 0%, #0b1520 55%, #07111a 100%)",
        }}
      />
      <div
        className="aaryx-terminal-grid pointer-events-none fixed inset-0 opacity-60"
        aria-hidden="true"
      />
      <div
        className="terminal-float pointer-events-none fixed -left-16 top-[22%] h-44 w-44 rounded-full border border-orange-300/10"
        aria-hidden="true"
      />
      <div
        className="terminal-float pointer-events-none fixed -right-20 bottom-[18%] h-56 w-56 rounded-full border border-cyan-300/10 [animation-delay:-3.5s]"
        aria-hidden="true"
      />
      <SessionTimeoutGuard />
      <div className="relative z-10">{children}</div>
      <BottomNav />
    </div>
  );
}
