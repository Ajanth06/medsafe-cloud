import { redirect } from "next/navigation";
import { buildFullName, splitFullName } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/types/profile";

function firstNameFromMetadata(metadata: Record<string, unknown> | undefined) {
  if (!metadata) return undefined;

  const givenName = metadata.given_name;
  if (typeof givenName === "string" && givenName.trim()) {
    return givenName.trim();
  }

  const candidates = [metadata.full_name, metadata.name];

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
  const familyName = metadata.family_name;
  if (typeof givenName === "string" && givenName.trim()) {
    if (typeof familyName === "string" && familyName.trim()) {
      return `${givenName.trim()} ${familyName.trim()}`;
    }
    return givenName.trim();
  }

  return undefined;
}

function resolveDisplayName(
  row: {
    first_name?: string | null;
    full_name?: string | null;
  },
  metadata: Record<string, unknown> | undefined,
  email: string | null | undefined,
) {
  return (
    row.first_name?.trim() ||
    row.full_name?.trim().split(/\s+/)[0] ||
    firstNameFromMetadata(metadata) ||
    email?.split("@")[0] ||
    "Nutzer"
  );
}

async function ensureProfileSynced(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]>,
) {
  const metadata = user.user_metadata ?? {};
  const fullName = fullNameFromMetadata(metadata);
  const { firstName, lastName } = splitFullName(fullName);
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
      first_name: firstName || null,
      last_name: lastName || null,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
}

type ProfileRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  primary_diagnosis: string | null;
  treating_clinic: string | null;
  emergency_contact: string | null;
  language: string | null;
  phone: string | null;
  avatar_url: string | null;
  onboarding_completed?: boolean | null;
};

function mapProfileRow(
  row: ProfileRow,
  metadata: Record<string, unknown> | undefined,
): UserProfile {
  const displayName = resolveDisplayName(row, metadata, row.email);

  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: row.full_name,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    primaryDiagnosis: row.primary_diagnosis,
    treatingClinic: row.treating_clinic,
    emergencyContact: row.emergency_contact,
    language: row.language ?? "de",
    phone: row.phone,
    avatarUrl: row.avatar_url,
    onboardingCompleted: Boolean(row.onboarding_completed),
    displayName,
  };
}

const profileSelect =
  "id, email, first_name, last_name, full_name, date_of_birth, gender, primary_diagnosis, treating_clinic, emergency_contact, language, phone, avatar_url, onboarding_completed";

export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  await ensureProfileSynced(supabase, user);

  const { data: profile } = await supabase
    .from("profiles")
    .select(profileSelect)
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    const metadataName = fullNameFromMetadata(user.user_metadata);
    const { firstName, lastName } = splitFullName(metadataName);

    return {
      id: user.id,
      email: user.email ?? null,
      firstName: firstName || null,
      lastName: lastName || null,
      fullName: metadataName ?? null,
      dateOfBirth: null,
      gender: null,
      primaryDiagnosis: null,
      treatingClinic: null,
      emergencyContact: null,
      language: "de",
      phone: null,
      avatarUrl: null,
      onboardingCompleted: false,
      displayName: resolveDisplayName(
        { first_name: firstName, full_name: metadataName },
        user.user_metadata,
        user.email,
      ),
    };
  }

  return mapProfileRow(profile, user.user_metadata);
}

export async function getUserOrRedirect() {
  const profile = await getUserProfile();

  if (!profile) {
    redirect("/login");
  }

  return {
    user: { id: profile.id, email: profile.email },
    displayName: profile.displayName,
    userId: profile.id,
    profile,
  };
}

export async function requireOnboardingComplete() {
  const result = await getUserOrRedirect();

  if (!result.profile.onboardingCompleted) {
    redirect("/onboarding");
  }

  return result;
}

export async function requireOnboardingPending() {
  const result = await getUserOrRedirect();

  if (result.profile.onboardingCompleted) {
    redirect("/dashboard");
  }

  return result;
}
