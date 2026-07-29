import Link from "next/link";
import { Lock } from "lucide-react";
import { signUpWithEmail } from "@/app/auth/actions";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function AaryxLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0a0f14] shadow-sm">
        <span className="font-mono text-[10px] font-bold tracking-wider text-cyan-400">
          AX
        </span>
      </div>
      <span className="font-mono text-lg font-semibold tracking-[0.2em] text-foreground">
        AARYX
      </span>
    </div>
  );
}

interface SignupFormProps {
  error?: string;
}

export function SignupForm({ error }: SignupFormProps) {
  return (
    <Card className="w-full max-w-[420px] border-0 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_12px_40px_rgba(15,23,42,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2),0_12px_40px_rgba(0,0,0,0.2)]">
      <CardHeader className="space-y-6 pb-2">
        <AaryxLogo />
        <div className="space-y-1">
          <CardTitle as="h1" className="text-2xl">
            Konto erstellen
          </CardTitle>
          <CardDescription>Zugang zum AARYX Terminal (nur wenn freigeschaltet).</CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-4">
        {error && (
          <p
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <form action={signUpWithEmail} className="space-y-4" noValidate>
          <Input
            id="full_name"
            label="Name"
            type="text"
            name="full_name"
            autoComplete="name"
            placeholder="Dein Name"
            required
          />
          <Input
            id="email"
            label="E-Mail"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="du@beispiel.de"
            required
          />
          <Input
            id="password"
            label="Passwort"
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="Mindestens 8 Zeichen"
            required
          />
          <Button type="submit" fullWidth size="lg">
            Registrieren
          </Button>
        </form>

        <div className="relative flex items-center py-1">
          <div className="grow border-t border-border" />
          <span className="mx-4 shrink-0 text-xs font-medium uppercase tracking-wider text-muted">
            oder
          </span>
          <div className="grow border-t border-border" />
        </div>

        <OAuthButtons />
      </CardContent>

      <CardFooter className="flex-col gap-3 pb-6">
        <p className="text-center text-sm text-muted">
          Bereits ein Konto?{" "}
          <Link
            href="/login"
            className="rounded font-medium text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            Anmelden
          </Link>
        </p>
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Registrierung ist standardmäßig deaktiviert.
        </p>
      </CardFooter>
    </Card>
  );
}
