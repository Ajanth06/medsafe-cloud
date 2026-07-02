import { Shield } from "lucide-react";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
}

export function AppHeader({ title, subtitle }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-sm">
          <Shield className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          {title ? (
            <>
              <h1 className="truncate text-base font-semibold text-foreground">{title}</h1>
              {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
            </>
          ) : (
            <span className="text-base font-semibold text-foreground">MedSafe Cloud</span>
          )}
        </div>
      </div>
    </header>
  );
}
