"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { miDe } from "@/lib/market-intelligence/i18n/de";

export function EnablePushAlertsButton() {
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
      <p className="text-sm font-medium text-foreground">{miDe.pushTitle}</p>
      <p className="mt-1 text-xs text-muted">
        {miDe.pushDescription}
      </p>
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void enablePush()}>
        {miDe.enablePush}
      </Button>
      {status === "unsupported" && (
        <p className="mt-2 text-xs text-amber-700">{miDe.pushUnsupported}</p>
      )}
      {status === "denied" && (
        <p className="mt-2 text-xs text-amber-700">{miDe.pushDenied}</p>
      )}
      {status === "enabled" && (
        <p className="mt-2 text-xs text-emerald-700">{miDe.pushGranted}</p>
      )}
    </div>
  );
}
