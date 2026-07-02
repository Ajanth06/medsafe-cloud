import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

function resolveFieldId(id?: string, label?: string, name?: string) {
  if (id) return id;
  if (name) return name;
  if (label) {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }
  return "field";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, name, type = "text", ...props }, ref) => {
    const inputId = resolveFieldId(id, label, name);
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [errorId, hintId].filter(Boolean).join(" ") || undefined
          }
          className={cn(
            "flex h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground",
            "placeholder:text-muted shadow-sm transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus-visible:ring-red-500/20",
            className,
          )}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="text-xs text-muted">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
