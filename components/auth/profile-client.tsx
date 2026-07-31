"use client";

import { LogOut, Shield } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useMi } from "@/components/i18n/locale-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ProfileClientProps {
  displayName: string;
  email: string;
}

export function ProfileClient({ displayName, email }: ProfileClientProps) {
  const t = useMi();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0a0f14] shadow-sm">
              <span className="font-mono text-[9px] font-bold tracking-wider text-cyan-400">
                AX
              </span>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold text-foreground">
                {t.accountTitle}
              </h1>
              <p className="truncate text-xs text-muted">{email}</p>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-5 py-6">
        <Card>
          <CardContent className="space-y-1 p-5">
            <p className="text-lg font-semibold text-foreground">{displayName}</p>
            <p className="text-sm text-muted">{email}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
              <div>
                <p className="font-medium">{t.accessProtected}</p>
                <p className="text-sm text-muted">{t.profileDisclaimer}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form action={signOut}>
          <Button type="submit" variant="outline" fullWidth>
            <LogOut className="h-4 w-4" />
            {t.signOut}
          </Button>
        </form>
      </main>
    </>
  );
}
