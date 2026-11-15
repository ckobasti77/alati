"use client";

import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  default: "bg-surface-2 text-text-muted",
  blue: "bg-accent-soft text-accent-text",
  green: "bg-success-soft text-success",
  yellow: "bg-warning-soft text-warning",
  red: "bg-danger-soft text-danger",
  secondary: "bg-surface-2 text-text-muted",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
