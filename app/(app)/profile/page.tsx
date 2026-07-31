import type { Metadata } from "next";
import { ProfileClient } from "@/components/auth/profile-client";
import { getUserOrRedirect } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Account",
  description: "AARYX account.",
};

export default async function ProfilePage() {
  const { user, displayName } = await getUserOrRedirect();

  return (
    <ProfileClient
      displayName={displayName}
      email={user.email ?? ""}
    />
  );
}
