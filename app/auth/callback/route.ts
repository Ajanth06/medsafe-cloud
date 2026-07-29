import { NextResponse } from "next/server";
import { isLikelyNewOAuthAccount, isSignupEnabled } from "@/lib/auth/config";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const signupClosedMessage =
  "Registrierung ist derzeit deaktiviert. Nur bestehende Konten können sich anmelden.";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/market-intelligence";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (!isSignupEnabled()) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (
          user &&
          isLikelyNewOAuthAccount(user.created_at, user.last_sign_in_at)
        ) {
          const admin = createServiceClient();
          await supabase.auth.signOut();
          if (admin) {
            await admin.auth.admin.deleteUser(user.id);
          }

          return NextResponse.redirect(
            `${origin}/login?error=${encodeURIComponent(signupClosedMessage)}`,
          );
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
