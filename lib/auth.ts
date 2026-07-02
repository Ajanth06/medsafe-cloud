import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function firstNameFromMetadata(metadata: Record<string, unknown> | undefined) {
  if (!metadata) return undefined;

  const candidates = [metadata.full_name, metadata.name, metadata.given_name];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim().split(/\s+/)[0];
    }
  }

  return undefined;
}

function fullNameFromMetadata(metadata: Record<string, unknown> | undefined) {
  if (!metadata) return undefined;

  const fullName = metadata.full_name;
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();

  const name = metadata.name;
  if (typeof name === "string" && name.trim()) return name.trim();

  const givenName = metadata.given_name;
  if (typeof givenName === "string" && givenName.trim()) return givenName.trim();

  return undefined;
}

async function ensureProfileSynced(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]>,
) {
  const metadata = user.user_metadata ?? {};
  const fullName = fullNameFromMetadata(metadata);
  const avatarUrl =
    (typeof metadata.avatar_url === "string" && metadata.avatar_url) ||
    (typeof metadata.picture === "string" && metadata.picture) ||
    null;

  if (!fullName && !avatarUrl && !user.email) return;

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      full_name: fullName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
}

export async function getUserOrRedirect() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureProfileSynced(supabase, user);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.full_name?.trim().split(/\s+/)[0] ??
    firstNameFromMetadata(user.user_metadata) ??
    user.email?.split("@")[0] ??
    "Nutzer";

  return { user, displayName, userId: user.id };
}
