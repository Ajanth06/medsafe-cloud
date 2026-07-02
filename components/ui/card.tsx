import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card text-card-foreground shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.04)]",
        "dark:shadow-[0_1px_3px_rgba(0,0,0,0.2),0_8px_24px_rgba(0,0,0,0.15)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-6 pb-0", className)} {...props} />
  );
}

export function CardTitle({
  className,
  as: Component = "h2",
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { as?: "h1" | "h2" | "h3" }) {
  return (
    <Component
      className={cn("font-semibold tracking-tight text-foreground", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  );
}
