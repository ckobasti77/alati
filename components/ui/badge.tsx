"use client";

import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  default: "bg-white/[0.06] text-zinc-300",
  blue: "bg-violet-500/10 text-violet-400",
  green: "bg-emerald-500/10 text-emerald-400",
  yellow: "bg-amber-500/10 text-amber-400",
  red: "bg-rose-500/10 text-rose-400",
  secondary: "bg-white/[0.06] text-zinc-400",
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
