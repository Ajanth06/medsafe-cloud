import { BottomNav } from "@/components/app/bottom-nav";
import { SessionTimeoutGuard } from "@/components/app/session-timeout-guard";
import { requireOnboardingComplete } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardingComplete();

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SessionTimeoutGuard />
      {children}
      <BottomNav />
    </div>
  );
}
