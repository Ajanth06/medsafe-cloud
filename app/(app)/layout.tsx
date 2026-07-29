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
    <div className="relative min-h-dvh overflow-hidden bg-[#f7f3ea] pb-28">
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 8% 2%, rgba(249,115,22,0.11), transparent 25%), radial-gradient(circle at 94% 16%, rgba(34,211,238,0.1), transparent 28%)",
        }}
      />
      <SessionTimeoutGuard />
      <div className="relative z-10">{children}</div>
      <BottomNav />
    </div>
  );
}
