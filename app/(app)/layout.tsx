import { BottomNav } from "@/components/app/bottom-nav";
import { requireOnboardingComplete } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireOnboardingComplete();

  return (
    <div className="min-h-dvh bg-background pb-24">
      {children}
      <BottomNav />
    </div>
  );
}
