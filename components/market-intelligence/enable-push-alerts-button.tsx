"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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
      <p className="text-sm font-medium text-foreground">Browser Push Alerts</p>
      <p className="mt-1 text-xs text-muted">
        Enable market alerts in your browser. No automatic permission prompt — you choose when to opt in.
      </p>
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void enablePush()}>
        Enable Market Alerts
      </Button>
      {status === "unsupported" && (
        <p className="mt-2 text-xs text-amber-700">Push notifications not supported in this browser.</p>
      )}
      {status === "denied" && (
        <p className="mt-2 text-xs text-amber-700">Permission denied. Enable in browser settings.</p>
      )}
      {status === "enabled" && (
        <p className="mt-2 text-xs text-emerald-700">Push permission granted — subscription storage ready for Phase 7.</p>
      )}
    </div>
  );
}
