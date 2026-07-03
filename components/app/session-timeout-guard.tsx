"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  INACTIVITY_TIMEOUT_MS,
  INACTIVITY_WARNING_MS,
  setRememberMe,
  shouldSkipInactivityLogout,
} from "@/lib/session-policy";
import { Button } from "@/components/ui/button";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "click"] as const;

export function SessionTimeoutGuard() {
  const [showWarning, setShowWarning] = useState(false);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabledRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    warningTimerRef.current = null;
    logoutTimerRef.current = null;
  }, []);

  const logout = useCallback(async () => {
    clearTimers();
    setShowWarning(false);

    const supabase = createClient();
    await supabase.auth.signOut({ scope: "global" });

    const message =
      "Sie wurden nach 15 Minuten Inaktivität aus Sicherheitsgründen abgemeldet.";
    window.location.href = `/login?message=${encodeURIComponent(message)}`;
  }, [clearTimers]);

  const scheduleTimers = useCallback(() => {
    clearTimers();
    setShowWarning(false);

    if (shouldSkipInactivityLogout()) {
      enabledRef.current = false;
      return;
    }

    enabledRef.current = true;

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
    }, INACTIVITY_TIMEOUT_MS - INACTIVITY_WARNING_MS);

    logoutTimerRef.current = setTimeout(() => {
      void logout();
    }, INACTIVITY_TIMEOUT_MS);
  }, [clearTimers, logout]);

  const stayActive = useCallback(() => {
    scheduleTimers();
  }, [scheduleTimers]);

  const stayLoggedIn = useCallback(() => {
    setRememberMe(true);
    setShowWarning(false);
    clearTimers();
    enabledRef.current = false;
  }, [clearTimers]);

  useEffect(() => {
    function handleActivity() {
      if (!enabledRef.current && !shouldSkipInactivityLogout()) {
        scheduleTimers();
        return;
      }

      if (enabledRef.current) {
        scheduleTimers();
      }
    }

    scheduleTimers();

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleActivity, { passive: true });
    }

    return () => {
      clearTimers();
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handleActivity);
      }
    };
  }, [clearTimers, scheduleTimers]);

  if (!showWarning) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 p-4 sm:items-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
      aria-describedby="session-timeout-description"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
        <h2 id="session-timeout-title" className="text-lg font-semibold text-foreground">
          Sitzung läuft ab
        </h2>
        <p id="session-timeout-description" className="mt-2 text-sm leading-relaxed text-muted">
          Sie werden aus Sicherheitsgründen in 1 Minute abgemeldet.
        </p>

        <div className="mt-5 space-y-2">
          <Button type="button" fullWidth onClick={stayActive}>
            Weiterarbeiten
          </Button>
          <Button type="button" variant="outline" fullWidth onClick={stayLoggedIn}>
            Angemeldet bleiben
          </Button>
        </div>
      </div>
    </div>
  );
}
