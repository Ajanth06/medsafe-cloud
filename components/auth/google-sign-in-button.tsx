"use client";

import { signInWithOAuth } from "@/app/auth/actions";
import { useMi } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.2-1.9 2.9l3.1 2.4c1.8-1.7 2.9-4.1 2.9-7 0-.7-.1-1.4-.2-2H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3 5.8 14.9l-2.1 1.6C5.2 19.3 8.4 21 12 21c2.7 0 5-.9 6.7-2.4l-3.1-2.4c-.9.6-2 .9-3.6.9-2.8 0-5.1-1.9-5.9-4.4z"
      />
      <path
        fill="#4A90E2"
        d="M3.7 7.5C3.3 8.4 3 9.4 3 10.5s.3 2.1.7 3l3.9-3c-.2-.6-.3-1.2-.3-1.8 0-.6.1-1.2.3-1.8L3.7 7.5z"
      />
      <path
        fill="#FBBC05"
        d="M12 5.3c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.3 14.7 1.5 12 1.5 8.4 1.5 5.2 3.2 3.7 5.9l3.9 3c.8-2.5 3.1-4.4 5.9-4.4z"
      />
    </svg>
  );
}

interface GoogleSignInButtonProps {
  className?: string;
}

/**
 * Google via Supabase OAuth — no GSI client-id required in the browser.
 * Provider must be enabled in the Supabase dashboard.
 */
export function GoogleSignInButton({ className }: GoogleSignInButtonProps) {
  const t = useMi();

  return (
    <form action={signInWithOAuth.bind(null, "google")} className={cn("w-full", className)}>
      <Button
        type="submit"
        variant="outline"
        fullWidth
        aria-label={t.continueWithGoogle}
        className="h-12 rounded-xl border-white/12 bg-white/[0.04] text-base font-semibold text-white hover:bg-white/[0.08]"
      >
        <GoogleIcon className="h-5 w-5" />
        {t.continueWithGoogle}
      </Button>
    </form>
  );
}
