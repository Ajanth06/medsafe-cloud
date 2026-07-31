"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMi } from "@/components/i18n/locale-provider";
export function EnablePushAlertsButton() {
  const t = useMi();

  const [status, setStatus] = useState<"idle" | "unsupported" | "denied" | "enabled">("idle");

  async function enablePush() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "denied") {
      setStatus("denied");
      return;
    }
    if (permission === "granted") {
      setStatus("enabled");
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-border bg-card/60 p-4">
      <p className="text-sm font-medium text-foreground">{t.pushTitle}</p>
      <p className="mt-1 text-xs text-muted">
        {t.pushDescription}
      </p>
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void enablePush()}>
        {t.enablePush}
      </Button>
      {status === "unsupported" && (
        <p className="mt-2 text-xs text-amber-700">{t.pushUnsupported}</p>
      )}
      {status === "denied" && (
        <p className="mt-2 text-xs text-amber-700">{t.pushDenied}</p>
      )}
      {status === "enabled" && (
        <p className="mt-2 text-xs text-emerald-700">{t.pushGranted}</p>
      )}
    </div>
  );
}
