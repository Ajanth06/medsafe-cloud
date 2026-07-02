import Link from "next/link";
import { Lock, Shield } from "lucide-react";
import { signInWithEmail } from "@/app/auth/actions";
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

function MedSafeLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary shadow-sm">
        <Shield className="h-5 w-5 text-white" aria-hidden="true" />
      </div>
      <span className="text-lg font-semibold tracking-tight text-foreground">
        MedSafe Cloud
      </span>
    </div>
  );
}

interface AuthFormProps {
  error?: string;
  message?: string;
}

export function AuthForm({ error, message }: AuthFormProps) {
  return (
    <Card
      suppressHydrationWarning
      className="w-full max-w-[420px] border-0 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_12px_40px_rgba(15,23,42,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2),0_12px_40px_rgba(0,0,0,0.2)]"
    >
      <CardHeader className="space-y-6 pb-2">
        <MedSafeLogo />
        <div className="space-y-1">
          <CardTitle as="h1" className="text-2xl">
            Welcome back
          </CardTitle>
          <CardDescription>Sign in to continue</CardDescription>
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
        {message && (
          <p
            role="status"
            className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/50 dark:text-green-300"
          >
            {message}
          </p>
        )}

        <OAuthButtons />

        <div className="relative flex items-center py-1">
          <div className="grow border-t border-border" />
          <span className="mx-4 shrink-0 text-xs font-medium uppercase tracking-wider text-muted">
            or
          </span>
          <div className="grow border-t border-border" />
        </div>

        <form action={signInWithEmail} className="space-y-4" noValidate>
          <Input
            id="email"
            label="Email Address"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />

          <Input
            id="password"
            label="Password"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            required
          />

          <div className="flex items-center justify-between gap-4">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                name="remember"
                defaultChecked={false}
                className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
              />
              <span className="text-sm text-muted">Remember me</span>
            </label>
            <Link
              href="/forgot-password"
              className="rounded text-sm font-medium text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" fullWidth size="lg">
            Continue
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex-col gap-5 pt-2">
        <p className="text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="rounded font-medium text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            Create Account
          </Link>
        </p>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Your data is encrypted and securely stored.
        </p>
      </CardFooter>
    </Card>
  );
}
