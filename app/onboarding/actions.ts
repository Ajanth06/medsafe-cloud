"use server";

import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/auth";
import { buildFullName } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export async function completeOnboarding(formData: FormData) {
  const profile = await getUserProfile();

  if (!profile) {
    redirect("/login");
  }

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const dateOfBirth = String(formData.get("date_of_birth") ?? "").trim();
  const gender = String(formData.get("gender") ?? "").trim();
  const primaryDiagnosis = String(formData.get("primary_diagnosis") ?? "").trim();
  const treatingClinic = String(formData.get("treating_clinic") ?? "").trim();
  const emergencyContact = String(formData.get("emergency_contact") ?? "").trim();
  const language = String(formData.get("language") ?? "de").trim();
  const privacyAccepted = formData.get("privacy_accepted") === "on";

  if (!firstName) {
    redirect("/onboarding?error=Bitte gib deinen Vornamen ein.");
  }

  if (!lastName) {
    redirect("/onboarding?error=Bitte gib deinen Nachnamen ein.");
  }

  if (!dateOfBirth) {
    redirect("/onboarding?error=Bitte gib dein Geburtsdatum ein.");
  }

  if (!language) {
    redirect("/onboarding?error=Bitte wähle deine Sprache.");
  }

  if (!privacyAccepted) {
    redirect(
      "/onboarding?error=Bitte bestätige, dass du die Datenschutzhinweise gelesen hast.",
    );
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      full_name: buildFullName(firstName, lastName),
      date_of_birth: dateOfBirth,
      gender: gender || null,
      primary_diagnosis: primaryDiagnosis || null,
      treating_clinic: treatingClinic || null,
      emergency_contact: emergencyContact || null,
      language,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard?welcome=1");
}
