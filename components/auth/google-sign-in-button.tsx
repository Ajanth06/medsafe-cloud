"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>,
          ) => void;
        };
      };
    };
  }
}

async function generateNonce() {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const encodedNonce = new TextEncoder().encode(nonce);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encodedNonce);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashedNonce = hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");

  return { nonce, hashedNonce };
}

interface GoogleSignInButtonProps {
  className?: string;
}

export function GoogleSignInButton({ className }: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!scriptReady || !clientId || !buttonRef.current || !window.google) return;

    let cancelled = false;

    async function setupGoogleButton() {
      const container = buttonRef.current;
      if (!container || !window.google) return;

      container.innerHTML = "";
      const { nonce, hashedNonce } = await generateNonce();
      if (cancelled) return;

      const supabase = createClient();

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential: string }) => {
          setError(null);

          const { error: signInError } = await supabase.auth.signInWithIdToken({
            provider: "google",
            token: response.credential,
            nonce,
          });

          if (signInError) {
            setError(signInError.message);
            return;
          }

          router.push("/dashboard");
          router.refresh();
        },
        nonce: hashedNonce,
        ux_mode: "popup",
        use_fedcm_for_prompt: true,
      });

      const width = Math.max(container.offsetWidth, 320);

      window.google.accounts.id.renderButton(container, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        logo_alignment: "left",
        width,
      });
    }

    void setupGoogleButton();

    return () => {
      cancelled = true;
    };
  }, [clientId, router, scriptReady]);

  if (!clientId) {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Google-Anmeldung ist nicht konfiguriert.
      </p>
    );
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div className={cn("w-full", className)}>
        <div ref={buttonRef} className="flex w-full justify-center [&>div]:w-full" />
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </>
  );
}
