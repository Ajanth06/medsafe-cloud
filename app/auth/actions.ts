"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getGuestCredentials,
  isOpenAccessEnabled,
  isSignupEnabled,
} from "@/lib/auth/config";
import { createClient } from "@/lib/supabase/server";

async function getOrigin() {
  const headerList = await headers();
  const origin = headerList.get("origin");
  if (origin) return origin;

  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  if (host) return `${protocol}://${host}`;

  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function signInWithOAuth(provider: "google" | "apple") {
  const supabase = await createClient();
  const origin = await getOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams:
        provider === "google"
          ? { prompt: "select_account" }
          : undefined,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/market-intelligence");
}

/**
 * Temporary open access — shared guest session (no password form).
 * Guest user must exist (created via scripts/create-test-user.ts).
 */
export async function signInAsGuest() {
  if (!isOpenAccessEnabled()) {
    redirect("/login?error=Gastzugang+ist+deaktiviert");
  }

  const credentials = getGuestCredentials();
  if (!credentials) {
    redirect("/login?error=Gastzugang+nicht+konfiguriert");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(
        `Gastzugang fehlgeschlagen: ${error.message}`,
      )}`,
    );
  }

  redirect("/market-intelligence");
}

export async function signUpWithEmail(formData: FormData) {
  if (!isSignupEnabled()) {
    redirect("/login?error=Registrierung+ist+derzeit+deaktiviert");
  }

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "");
  const origin = await getOrigin();

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?message=Check your email to confirm your account");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}
