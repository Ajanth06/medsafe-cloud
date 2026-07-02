import { BottomNav } from "@/components/app/bottom-nav";
import { getUserOrRedirect } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await getUserOrRedirect();

  return (
    <div className="min-h-dvh bg-background pb-24">
      {children}
      <BottomNav />
    </div>
  );
}
