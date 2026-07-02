import { cn } from "@/lib/utils";
import { forwardRef, type SelectHTMLAttributes } from "react";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, hint, id, children, ...props }, ref) => {
    const fieldId = id ?? props.name ?? "select";

    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={fieldId}
          className={cn(
            "flex h-11 w-full rounded-2xl border border-border bg-card px-4 text-sm text-foreground shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
    );
  },
);

Select.displayName = "Select";
